// App shell: layout, global effects (theme, shortcuts, auto-recompile,
// window close guard, drag & drop) and dialog mounting.

import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CodeEditor } from "./components/CodeEditor";
import { HelpDialog } from "./components/HelpDialog";
import { Icon } from "./components/Icons";
import { MenuBar } from "./components/MenuBar";
import { NewFileDialog } from "./components/NewFileDialog";
import { PreviewPane } from "./components/PreviewPane";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { SaveTemplateDialog } from "./components/SaveTemplateDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { Toasts } from "./components/Toasts";
import { UnsavedDialog } from "./components/UnsavedDialog";
import { isDesktop } from "./lib/tauri";
import { useAppStore } from "./store";

export function App() {
  const init = useAppStore((s) => s.init);
  const settings = useAppStore((s) => s.settings);
  const content = useAppStore((s) => s.content);
  const name = useAppStore((s) => s.name);
  const dirty = useAppStore((s) => s.content !== s.savedContent);
  const dialog = useAppStore((s) => s.dialog);
  const sidePanel = useAppStore((s) => s.sidePanel);
  const problemsOpen = useAppStore((s) => s.problemsOpen);
  const toggleSidePanel = useAppStore((s) => s.toggleSidePanel);

  const mainRef = useRef<HTMLDivElement>(null);
  const [dragPct, setDragPct] = useState<number | null>(null);
  const pct = dragPct ?? settings.editorWidthPct;

  // Boot: settings, engines, recents, reopen last file.
  useEffect(() => {
    void init();
  }, [init]);

  // Theme attribute on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // Window title.
  useEffect(() => {
    document.title = `${dirty ? "● " : ""}${name} — TexForge`;
  }, [name, dirty]);

  // Debounced auto-recompile.
  const autoRecompile = settings.autoRecompile;
  useEffect(() => {
    if (!autoRecompile) return;
    const s = useAppStore.getState();
    if (s.compileStatus === "running" || s.content === s.compiledFromContent) return;
    const timer = setTimeout(() => {
      const st = useAppStore.getState();
      if (
        st.settings.autoRecompile &&
        st.compileStatus !== "running" &&
        st.content !== "" &&
        st.content !== st.compiledFromContent
      ) {
        void st.compileNow("auto");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, autoRecompile]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const s = useAppStore.getState();
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void s.saveNow();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void s.compileNow("manual");
      } else if (k === "n") {
        e.preventDefault();
        void s.newDialog();
      } else if (k === "o") {
        e.preventDefault();
        void s.openDialog();
      } else if (k === "e") {
        e.preventDefault();
        void s.exportPdf();
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        s.updateSettings({ previewFit: false });
        s.zoomPreview(1);
      } else if (e.key === "-") {
        e.preventDefault();
        s.updateSettings({ previewFit: false });
        s.zoomPreview(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        s.resetPreviewZoom();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Window close guard + .tex drag & drop (desktop only).
  useEffect(() => {
    if (!isDesktop) return;
    const unlisteners: Array<() => void> = [];
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        await useAppStore.getState().exitApp();
      })
      .then((u) => unlisteners.push(u))
      .catch(() => {});
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const p = event.payload.paths?.[0];
          if (p && /\.(tex|ltx)$/i.test(p)) {
            void (async () => {
              const s = useAppStore.getState();
              if (!(await s.maybeContinue())) return;
              await s.openPath(p);
            })();
          }
        }
      })
      .then((u) => unlisteners.push(u))
      .catch(() => {});
    return () => unlisteners.forEach((u) => u());
  }, []);

  // Editor / preview split handle.
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const p = ((ev.clientX - rect.left) / rect.width) * 100;
      setDragPct(Math.min(75, Math.max(30, p)));
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const rect = mainRef.current?.getBoundingClientRect();
      if (rect) {
        const p = ((ev.clientX - rect.left) / rect.width) * 100;
        useAppStore
          .getState()
          .updateSettings({ editorWidthPct: Math.min(75, Math.max(30, p)) });
      }
      setDragPct(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="app">
      <MenuBar />

      <div className="main-area" ref={mainRef}>
        <div className="side-rail">
          <button
            className={`rail-btn${sidePanel === "outline" ? " active" : ""}`}
            onClick={() => toggleSidePanel("outline")}
            title="Outline panel"
          >
            <Icon name="outline" size={17} />
          </button>
          <button
            className={`rail-btn${sidePanel === "slides" ? " active" : ""}`}
            onClick={() => toggleSidePanel("slides")}
            title="Slides panel (Beamer)"
          >
            <Icon name="slide" size={17} />
          </button>
        </div>

        <SidePanel />

        <div className="editor-col" style={{ width: `${pct}%` }}>
          <CodeEditor />
          {problemsOpen && <ProblemsPanel />}
        </div>

        <div className="split-handle" onMouseDown={startDrag} role="separator" aria-orientation="vertical" />

        <PreviewPane />
      </div>

      <StatusBar />

      {dialog === "new" && <NewFileDialog />}
      {dialog === "settings" && <SettingsDialog />}
      {dialog === "saveTemplate" && <SaveTemplateDialog />}
      {dialog === "unsaved" && <UnsavedDialog />}
      {dialog === "help" && <HelpDialog />}

      <Toasts />
    </div>
  );
}
