// Hybrid compile orchestration:
//   1. native engine chosen in Settings (or auto-detected: xelatex → pdflatex
//      → lualatex → tectonic),
//   2. custom engine binary,
//   3. the built-in SwiftLaTeX WASM engine,
//   4. a friendly setup guide when nothing is available.

import type { CompileResult, NativeCompileResult, Settings } from "../types";
import { parseTeXLog } from "./logparse";
import { api } from "./tauri";
import { b64ToBytes } from "./util";
import { wasmEngine } from "./wasm";

function errResult(message: string, noEngine = false): CompileResult {
  return {
    success: false,
    pdfBytes: null,
    issues: [{ severity: "error", line: null, file: null, message }],
    logTail: "",
    engineUsed: "—",
    durationMs: 0,
    passes: 0,
    noEngine,
  };
}

function mapNative(n: NativeCompileResult): CompileResult {
  return {
    success: n.success,
    pdfBytes: n.pdf_b64 ? b64ToBytes(n.pdf_b64) : null,
    issues: n.issues,
    logTail: n.log_tail,
    engineUsed: n.engine_used,
    durationMs: n.duration_ms,
    passes: n.passes,
  };
}

async function compileWasm(source: string): Promise<CompileResult> {
  const t0 = performance.now();
  let r = await wasmEngine.compile(source);
  let passes = 1;
  // Beamer tables of contents need a second pass.
  if (r.pdf && /Rerun to get|Label\(s\) may have changed/.test(r.log)) {
    r = await wasmEngine.compile(source);
    passes = 2;
  }
  const issues = parseTeXLog(r.log);
  if (!r.pdf && !issues.some((i) => i.severity === "error")) {
    issues.push({
      severity: "error",
      line: null,
      file: null,
      message: "The WASM compiler produced no PDF. Inspect the raw log below.",
    });
  }
  return {
    success: !!r.pdf,
    pdfBytes: r.pdf,
    issues,
    logTail: r.log.slice(-24_000),
    engineUsed: "pdftex (built-in WASM)",
    durationMs: Math.round(performance.now() - t0),
    passes,
  };
}

export async function runCompile(
  source: string,
  path: string | null,
  settings: Settings
): Promise<CompileResult> {
  const choice = settings.engineChoice;

  if (choice === "wasm") {
    try {
      return await compileWasm(source);
    } catch (e) {
      return errResult(
        `The built-in WASM engine failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const engine = choice === "auto" || choice === "custom" ? null : choice;
  const customPath = choice === "custom" ? settings.customEnginePath : null;

  try {
    return mapNative(await api.compileLatex({ source, path, engine, customPath }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("NO_ENGINE")) {
      // Fallback 1: a custom engine path, if configured.
      if (settings.customEnginePath.trim()) {
        try {
          return mapNative(
            await api.compileLatex({
              source,
              path,
              engine: null,
              customPath: settings.customEnginePath,
            })
          );
        } catch {
          /* fall through to the WASM engine */
        }
      }
      // Fallback 2: the built-in WASM engine.
      try {
        return await compileWasm(source);
      } catch (werr) {
        return errResult(
          `No LaTeX engine was found on this computer. Install TeX Live, MiKTeX or tectonic, or set a custom engine in Settings. ` +
            `(The built-in WASM engine could not start: ${
              werr instanceof Error ? werr.message : String(werr)
            })`,
          true
        );
      }
    }

    if (msg.includes("TIMEOUT")) {
      return errResult(
        "Compilation timed out after 180 seconds — the document may contain an infinite loop."
      );
    }
    if (msg.includes("CUSTOM_ENGINE_NOT_FOUND")) {
      return errResult(
        `The custom engine was not found at “${settings.customEnginePath}”. Fix the path under Settings → Compilation.`
      );
    }
    return errResult(msg);
  }
}
