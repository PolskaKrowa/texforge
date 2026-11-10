// The live PDF preview (pdf.js, continuous scroll, lazy page rendering,
// zoom / fit-width, scroll position preserved across equal-page recompiles).

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import { pdfjs } from "../lib/pdf";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

function EngineSetupCard() {
  const refreshEngines = useAppStore((s) => s.refreshEngines);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const compileNow = useAppStore((s) => s.compileNow);
  const setDialog = useAppStore((s) => s.setDialog);
  const ua = navigator.userAgent;
  const isWindows = ua.includes("Windows");
  const isMac = !isWindows && ua.includes("Mac");

  return (
    <div className="preview-card">
      <h3>
        <Icon name="alertTriangle" size={18} /> No LaTeX engine found
      </h3>
      <p>
        TexForge compiles with a local TeX installation. Install one of the
        options below, then hit <strong>Re-detect</strong> — or use the
        built-in WASM engine right away (works fully offline for the
        built-in templates and self-contained documents).
      </p>
      <div className="install-hints">
        {isWindows ? (
          <div>
            <div className="hint-title">Windows</div>
            <code>winget install MiKTeX.MiKTeX</code>
            <span>
              or the Basic Installer from <a href="https://miktex.org" target="_blank" rel="noreferrer">miktex.org</a>
            </span>
          </div>
        ) : isMac ? (
          <div>
            <div className="hint-title">macOS</div>
            <code>brew install --cask mactex</code>
            <span>
              or <a href="https://www.tug.org/mactex/" target="_blank" rel="noreferrer">tug.org/mactex</a>
            </span>
          </div>
        ) : (
          <div>
            <div className="hint-title">Linux</div>
            <code>sudo apt install texlive-latex-extra</code>
            <span>
              (Debian/Ubuntu) · <code>sudo dnf install texlive-scheme-medium</code> (Fedora)
            </span>
          </div>
        )}
        <div>
          <div className="hint-title">Any OS — tectonic</div>
          <code>cargo install tectonic</code>
          <span>
            a self-contained engine from{" "}
            <a href="https://tectonic-typesetting.github.io/" target="_blank" rel="noreferrer">
              tectonic-typesetting.github.io
            </a>
          </span>
        </div>
      </div>
      <div className="card-actions">
        <button
          className="btn btn-primary"
          onClick={() => void refreshEngines().then(() => compileNow("manual"))}
        >
          <Icon name="reload" size={14} /> Re-detect
        </button>
        <button
          className="btn"
          onClick={() => {
            updateSettings({ engineChoice: "wasm" });
            void compileNow("manual");
          }}
        >
          <Icon name="play" size={14} /> Use built-in WASM engine
        </button>
        <button className="btn btn-ghost" onClick={() => setDialog("settings")}>
          Open Settings
        </button>
      </div>
    </div>
  );
}

export function PreviewPane() {
  const pdfBytes = useAppStore((s) => s.pdfBytes);
  const compileStatus = useAppStore((s) => s.compileStatus);
  const compileResult = useAppStore((s) => s.compileResult);
  const fit = useAppStore((s) => s.settings.previewFit);
  const zoom = useAppStore((s) => s.previewZoom);
  const zoomPreview = useAppStore((s) => s.zoomPreview);
  const resetZoom = useAppStore((s) => s.resetPreviewZoom);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setProblemsOpen = useAppStore((s) => s.setProblemsOpen);

  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const canvasesRef = useRef<Map<number, HTMLCanvasElement | null>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedRef = useRef<Set<number>>(new Set());
  const tasksRef = useRef<Map<number, RenderTask>>(new Map());
  const scrollTopRatioRef = useRef<number | null>(null);
  const lastPageCountRef = useRef(0);
  const rafRef = useRef(false);

  const [docVersion, setDocVersion] = useState(0);
  const [pageInfos, setPageInfos] = useState<{ w: number; h: number }[]>([]);
  const [containerW, setContainerW] = useState(600);
  const [currentPage, setCurrentPage] = useState(1);

  // Track container width (for fit-width scaling).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const numPages = pageInfos.length;
  const maxPageW = numPages ? Math.max(...pageInfos.map((p) => p.w)) : 612;
  const effScale = fit
    ? Math.max(0.1, (containerW - 40) / maxPageW)
    : zoom;

  // Load the PDF document whenever new bytes arrive.
  useEffect(() => {
    let cancelled = false;
    if (!pdfBytes) {
      void taskRef.current?.destroy();
      taskRef.current = null;
      docRef.current = null;
      setPageInfos([]);
      lastPageCountRef.current = 0;
      return;
    }
    (async () => {
      try {
        // Security note (CVE-2026-16633): pdf.js >= 6.2.108 removed the
        // document-level `enableScripting` option, and our canvas-only
        // rendering never builds the annotation/scripting layer — so
        // JavaScript embedded in a PDF can never execute in the preview.
        const task = pdfjs.getDocument({ data: pdfBytes.slice() });
        const doc = await task.promise;
        if (cancelled) {
          void task.destroy();
          return;
        }
        const infos: { w: number; h: number }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          infos.push({ w: vp.width, h: vp.height });
          page.cleanup();
        }
        if (cancelled) {
          void task.destroy();
          return;
        }
        void taskRef.current?.destroy();
        taskRef.current = task;
        docRef.current = doc;
        renderedRef.current.clear();
        setPageInfos(infos);
        // Compare the previous document's page count (kept in the ref) with
        // the new one BEFORE overwriting it — scroll is preserved only when
        // the recompile did not change the page count.
        const sameCount = lastPageCountRef.current === doc.numPages;
        lastPageCountRef.current = doc.numPages;
        setDocVersion((v) => v + 1);

        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (!el) return;
          const ratio = scrollTopRatioRef.current;
          const range = el.scrollHeight - el.clientHeight;
          el.scrollTop =
            sameCount && ratio != null && range > 0 ? ratio * range : 0;
          setCurrentPage(1);
        });
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  const renderPage = useCallback(async (n: number, scale: number) => {
    const doc = docRef.current;
    if (!doc || renderedRef.current.has(n)) return;
    const canvas = canvasesRef.current.get(n);
    if (!canvas) return;
    renderedRef.current.add(n);
    try {
      const page = await doc.getPage(n);
      // Resizing a canvas mid-render resets its context (the page ends up tiny
      // and upside down), so stop any render still in flight for this page first.
      tasksRef.current.get(n)?.cancel();
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const task = page.render({
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      tasksRef.current.set(n, task);
      await task.promise;
      tasksRef.current.delete(n);
      page.cleanup();
    } catch (err) {
      // A cancelled render was superseded by a newer one that owns the marker.
      if (!(err instanceof pdfjs.RenderingCancelledException)) renderedRef.current.delete(n);
    }
  }, []);

  // Lazy-render visible pages (re-renders on scale / document changes).
  useEffect(() => {
    if (!docRef.current || numPages === 0) return;
    renderedRef.current.clear();
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            const n = Number((en.target as HTMLElement).dataset.page);
            if (n) void renderPage(n, effScale);
          }
        }
      },
      { root: scrollRef.current, rootMargin: "600px 0px" }
    );
    pageRefs.current.forEach((el) => io.observe(el));
    void renderPage(1, effScale);
    return () => io.disconnect();
  }, [docVersion, effScale, numPages, renderPage]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const range = el.scrollHeight - el.clientHeight;
    if (range > 0) scrollTopRatioRef.current = el.scrollTop / range;
    if (rafRef.current) return;
    rafRef.current = true;
    requestAnimationFrame(() => {
      rafRef.current = false;
      let cur = 1;
      pageRefs.current.forEach((div, n) => {
        if (div.offsetTop <= el.scrollTop + 80) cur = Math.max(cur, n);
      });
      setCurrentPage(cur);
    });
  };

  const firstError = compileResult?.issues.find((i) => i.severity === "error");

  return (
    <div className="preview-col">
      <div className="preview-toolbar">
        <button className="icon-btn icon-btn-sm" onClick={() => { updateSettings({ previewFit: false }); zoomPreview(-1); }} title="Zoom out (Ctrl −)">
          <Icon name="zoomOut" size={15} />
        </button>
        <button className="zoom-label" onClick={resetZoom} title="Reset zoom (Ctrl 0)">
          {Math.round(effScale * 100)}%
        </button>
        <button className="icon-btn icon-btn-sm" onClick={() => { updateSettings({ previewFit: false }); zoomPreview(1); }} title="Zoom in (Ctrl +)">
          <Icon name="zoomIn" size={15} />
        </button>
        <button
          className={`icon-btn icon-btn-sm${fit ? " active" : ""}`}
          onClick={() => updateSettings({ previewFit: !fit })}
          title="Fit width"
        >
          <Icon name="fit" size={15} />
        </button>
        <div className="flex-spacer" />
        {compileStatus === "running" && (
          <span className="preview-status running">
            <span className="spinner" /> compiling…
          </span>
        )}
        {numPages > 0 && (
          <span className="page-chip">
            {currentPage} / {numPages}
          </span>
        )}
      </div>

      <div className="preview-scroll" ref={scrollRef} onScroll={onScroll}>
        {numPages === 0 && compileStatus === "idle" && (
          <div className="preview-card">
            <h3>
              <Icon name="slide" size={18} /> Live preview
            </h3>
            <p>
              Hit <strong>Compile</strong> (or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>)
              to render your document. The result appears here instantly.
            </p>
          </div>
        )}

        {numPages === 0 && compileResult?.noEngine && <EngineSetupCard />}

        {numPages === 0 && compileStatus === "error" && !compileResult?.noEngine && firstError && (
          <div className="preview-card">
            <h3 className="err">
              <Icon name="alertCircle" size={18} /> Compilation failed
            </h3>
            <p className="err-msg">{firstError.message}</p>
            <div className="card-actions">
              <button className="btn" onClick={() => setProblemsOpen(true)}>
                Show problems
              </button>
            </div>
          </div>
        )}

        {numPages === 0 && compileStatus === "error" && !firstError && !compileResult?.noEngine && (
          <div className="preview-card">
            <h3 className="err">
              <Icon name="alertCircle" size={18} /> Compilation failed
            </h3>
            <p>Open the Problems panel for details.</p>
          </div>
        )}

        {pageInfos.map((pi, i) => (
          <div
            key={`${docVersion}-${i}`}
            className="pdf-page"
            data-page={i + 1}
            ref={(el) => {
              if (el) {
                pageRefs.current.set(i + 1, el);
                const canvas = el.querySelector("canvas");
                canvasesRef.current.set(i + 1, canvas);
              }
            }}
            style={{
              width: Math.floor(pi.w * effScale),
              height: Math.floor(pi.h * effScale),
            }}
          >
            <canvas />
          </div>
        ))}
      </div>
    </div>
  );
}