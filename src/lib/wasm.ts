// Adapter for the bundled SwiftLaTeX PdfTeX WASM engine.
//
// The engine's `kpsewhich` bridge fetches missing files over HTTP from a
// "texlive endpoint". The original texlive2.swiftlatex.com CDN is long dead,
// so we ship a curated offline snapshot (format file + LaTeX base + beamer +
// pgf + hyperref + CM/Latin Modern fonts) under public/wasm-engine/texlive/
// and point the engine at it right after startup (same origin, fully
// offline). The file layout mirrors the engine's request scheme:
//   texlive/pdftex/<format-id>/<filename>
//
// The worker protocol matches the official PdfTeXEngine.js wrapper:
//   load:        worker reports { result: "ok" }
//   settexliveurl: { cmd: "settexliveurl", url }   <- our addition
//   writefile:   { cmd: "writefile", url, src }
//   setmainfile: { cmd: "setmainfile", url }
//   compile:     { cmd: "compilelatex" } → { cmd: "compile", result, log, status, pdf }

const ENGINE_SCRIPT = "wasm-engine/swiftlatexpdftex.js";
const TEXLIVE_ENDPOINT = "wasm-engine/texlive/";

function baseUrl(): string {
  if (typeof import.meta.env.BASE_URL === "string") {
    return import.meta.env.BASE_URL.replace(/\/?$/, "/");
  }
  return "/";
}

export interface WasmCompileOutcome {
  pdf: Uint8Array | null;
  log: string;
  status: number;
}

class WasmLatexEngine {
  private worker: Worker | null = null;
  private loadPromise: Promise<void> | null = null;

  /** Spin up (once) the WASM engine worker. */
  load(): Promise<void> {
    if (this.worker) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      let url = ENGINE_SCRIPT;
      if (typeof import.meta.env.BASE_URL === "string") {
        url = import.meta.env.BASE_URL.replace(/\/?$/, "/") + ENGINE_SCRIPT;
      }
      const worker = new Worker(url);
      const timeout = setTimeout(() => {
        reject(new Error("The WASM engine took too long to start."));
        try { worker.terminate(); } catch { /* ignore */ }
      }, 30_000);
      worker.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { result?: string; log?: string } | undefined;
        if (data && data.result === "ok") {
          clearTimeout(timeout);
          this.worker = worker;
          worker.onmessage = null;
          worker.onerror = null;
          // Point the engine at our offline texlive snapshot (same origin).
          worker.postMessage({
            cmd: "settexliveurl",
            url: new URL(baseUrl() + TEXLIVE_ENDPOINT, window.location.href).href,
          });
          resolve();
        }
      };
      worker.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not load the WASM engine files."));
      };
    });

    this.loadPromise.catch(() => {
      // Allow a retry after a failed load.
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  isReady(): boolean {
    return this.worker != null;
  }

  /** Write the source and compile it. */
  async compile(source: string): Promise<WasmCompileOutcome> {
    await this.load();
    const worker = this.worker!;
    return new Promise<WasmCompileOutcome>((resolve) => {
      worker.onmessage = (ev: MessageEvent) => {
        const data = ev.data as {
          cmd?: string;
          result?: string;
          log?: string;
          status?: number;
          pdf?: ArrayBuffer | Uint8Array | number[];
        };
        if (!data || data.cmd !== "compile") return;
        worker.onmessage = null;
        const ok = data.result === "ok";
        resolve({
          pdf: ok && data.pdf ? new Uint8Array(data.pdf) : null,
          log: data.log || "",
          status: data.status ?? -1,
        });
      };
      worker.postMessage({ cmd: "writefile", url: "main.tex", src: source });
      worker.postMessage({ cmd: "setmainfile", url: "main.tex" });
      worker.postMessage({ cmd: "compilelatex" });
    });
  }

  close(): void {
    if (this.worker) {
      try {
        this.worker.postMessage({ cmd: "grace" });
      } catch {
        /* ignore */
      }
      this.worker = null;
      this.loadPromise = null;
    }
  }
}

export const wasmEngine = new WasmLatexEngine();
