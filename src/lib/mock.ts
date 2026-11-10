// Browser-dev mock for the Tauri API surface. Used automatically when the UI
// runs in a plain browser (`npm run dev`): files live in localStorage, the
// compile "runs" against a bundled sample.pdf, and PDF export downloads via
// the browser. This exists purely so the frontend can be developed and tested
// without a Rust build.

import type {
  AppInfo,
  EngineInfo,
  NativeCompileResult,
  RecentFile,
  UserTemplateInfo,
} from "../types";
import type { TexForgeApi } from "./tauri";
import { b64ToBytes, bytesToB64 } from "./util";

const KEY_DOCS = "texforge.mock.docs";
const KEY_RECENTS = "texforge.mock.recents";
const KEY_TEMPLATES = "texforge.mock.templates";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

async function samplePdfBytes(): Promise<Uint8Array | null> {
  try {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    const res = await fetch(`${base}sample.pdf`);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockApi: TexForgeApi = {
  desktop: false,

  async detectEngines(): Promise<EngineInfo[]> {
    return [{ name: "tectonic", path: "/usr/bin/tectonic (mocked)" }];
  },

  async compileLatex({ source }): Promise<NativeCompileResult> {
    await delay(900);
    const lines = source.split("\n");
    const issues: NativeCompileResult["issues"] = [];
    // Simulated error for UI testing: a line containing
    // \undefinedcontrolsequence produces an error pointing at that line.
    const badLine = lines.findIndex((l) => l.includes("\\undefinedcontrolsequence"));
    if (badLine >= 0) {
      issues.push({
        severity: "error",
        line: badLine + 1,
        file: "main.tex",
        message: "Undefined control sequence.",
      });
      return {
        success: false,
        pdf_b64: null,
        issues,
        log_tail: `(mock dev mode)\n./main.tex:${badLine + 1}: Undefined control sequence.\nl.${badLine + 1} \\undefinedcontrolsequence`,
        engine_used: "tectonic (mock)",
        duration_ms: 900,
        passes: 1,
      };
    }
    const bytes = await samplePdfBytes();
    if (!bytes) {
      return {
        success: false,
        pdf_b64: null,
        issues: [
          {
            severity: "error",
            line: null,
            file: null,
            message: "Mock mode could not load sample.pdf (dev server not serving /public?).",
          },
        ],
        log_tail: "mock dev mode: sample.pdf missing",
        engine_used: "tectonic (mock)",
        duration_ms: 900,
        passes: 1,
      };
    }
    return {
      success: true,
      pdf_b64: bytesToB64(bytes),
      issues: [
        {
          severity: "warning",
          line: null,
          file: null,
          message: "Mock dev mode: showing bundled sample.pdf instead of a real compile.",
        },
      ],
      log_tail: "(mock dev mode) Compiled successfully.",
      engine_used: "tectonic (mock)",
      duration_ms: 950,
      passes: 1,
    };
  },

  async pickOpenFile(): Promise<string | null> {
    const docs = readJson<Record<string, string>>(KEY_DOCS, {});
    const paths = Object.keys(docs);
    return paths.length ? paths[0] : null;
  },

  async pickSaveTexFile(defaultName: string): Promise<string | null> {
    return `mock://docs/${defaultName}`;
  },

  async pickSavePdfFile(defaultName: string): Promise<string | null> {
    return `__download__:${defaultName}`;
  },

  async readTextFile(path: string): Promise<string> {
    const docs = readJson<Record<string, string>>(KEY_DOCS, {});
    if (!(path in docs)) throw new Error(`No such mock document: ${path}`);
    return docs[path];
  },

  async writeTextFile(path: string, contents: string): Promise<void> {
    const docs = readJson<Record<string, string>>(KEY_DOCS, {});
    docs[path] = contents;
    writeJson(KEY_DOCS, docs);
  },

  async writePdfFromB64(path: string, b64: string): Promise<void> {
    if (path.startsWith("__download__:")) {
      const name = path.slice("__download__:".length);
      const blob = new Blob([b64ToBytes(b64)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return;
    }
    throw new Error("Mock mode cannot write PDF files to disk.");
  },

  async showInFolder(): Promise<void> {
    /* not available in the browser */
  },

  async forceExit(): Promise<void> {
    /* not available in the browser */
  },

  async getAppInfo(): Promise<AppInfo> {
    return { name: "TexForge", version: "0.1.0 — web dev mode" };
  },

  async getRecents(): Promise<RecentFile[]> {
    return readJson<RecentFile[]>(KEY_RECENTS, []);
  },

  async pushRecent(path: string): Promise<void> {
    const list = readJson<RecentFile[]>(KEY_RECENTS, []);
    const name = path.split(/[\\/]/).pop() || path;
    const next = [
      { path, name, updated_at: Math.floor(Date.now() / 1000) },
      ...list.filter((r) => r.path !== path),
    ].slice(0, 10);
    writeJson(KEY_RECENTS, next);
  },

  async clearRecents(): Promise<void> {
    writeJson(KEY_RECENTS, []);
  },

  async listUserTemplates(): Promise<UserTemplateInfo[]> {
    return readJson<UserTemplateInfo[]>(KEY_TEMPLATES, []);
  },

  async saveUserTemplate(
    name: string,
    description: string,
    kind: string,
    content: string
  ): Promise<UserTemplateInfo> {
    const list = readJson<UserTemplateInfo[]>(KEY_TEMPLATES, []);
    const t: UserTemplateInfo = {
      id: `mock-${Date.now()}`,
      name,
      description,
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content,
    };
    writeJson(KEY_TEMPLATES, [t, ...list]);
    return t;
  },

  async deleteUserTemplate(id: string): Promise<void> {
    writeJson(
      KEY_TEMPLATES,
      readJson<UserTemplateInfo[]>(KEY_TEMPLATES, []).filter((t) => t.id !== id)
    );
  },
};
