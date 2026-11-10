// Top chrome: app menu (File / View / Help), document chip, and the
// Compile / Export actions.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { timeAgo } from "../lib/util";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

type MenuId = "file" | "view" | "help" | null;

function MenuItem({
  label,
  hint,
  checked,
  onClick,
  disabled,
}: {
  label: ReactNode;
  hint?: string;
  checked?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="menu-item" onClick={onClick} disabled={disabled}>
      <span className="menu-check">{checked && <Icon name="check" size={13} />}</span>
      <span className="menu-label">{label}</span>
      {hint && <kbd className="menu-hint">{hint}</kbd>}
    </button>
  );
}

const Sep = () => <div className="menu-sep" />;

export function MenuBar() {
  const [open, setOpen] = useState<MenuId>(null);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const st = useAppStore;
  const name = useAppStore((s) => s.name);
  const dirty = useAppStore((s) => s.content !== s.savedContent);
  const settings = useAppStore((s) => s.settings);
  const engines = useAppStore((s) => s.engines);
  const recents = useAppStore((s) => s.recents);
  const problemsOpen = useAppStore((s) => s.problemsOpen);
  const sidePanel = useAppStore((s) => s.sidePanel);
  const compileStatus = useAppStore((s) => s.compileStatus);
  const running = compileStatus === "running";
  const hasNative = engines.length > 0;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null);
        setRecentsOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const up = st((s) => s.updateSettings);
  const a = st.getState;

  return (
    <div className="menubar" ref={barRef}>
      <div className="menubar-left">
        <div className="app-mark" aria-hidden="true">
          T<span>X</span>
        </div>
        <div className="app-name">TexForge</div>

        <button
          className={`menu-btn${open === "file" ? " active" : ""}`}
          onClick={() => { setOpen(open === "file" ? null : "file"); setRecentsOpen(false); }}
        >
          File
        </button>
        {open === "file" && (
          <div className="menu-pop">
            <MenuItem label="New…" hint="Ctrl+N" onClick={() => { setOpen(null); void a().newDialog(); }} />
            <MenuItem label="Open…" hint="Ctrl+O" onClick={() => { setOpen(null); void a().openDialog(); }} />
            <MenuItem
              label={<span className={recentsOpen ? "accent" : ""}>Open Recent {recentsOpen ? "▾" : "▸"}</span>}
              onClick={() => setRecentsOpen(!recentsOpen)}
            />
            {recentsOpen && (
              <div className="recents-list">
                {recents.length === 0 && <div className="recents-empty">No recent files</div>}
                {recents.map((r) => (
                  <button
                    key={r.path}
                    className="recent-item"
                    title={r.path}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpen(null);
                      if (!(await a().maybeContinue())) return;
                      await a().openPath(r.path);
                    }}
                  >
                    <span className="recent-name">{r.name}</span>
                    <span className="recent-when">{timeAgo(r.updated_at)}</span>
                  </button>
                ))}
                {recents.length > 0 && (
                  <button
                    className="recent-item recent-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      void a().clearRecents();
                    }}
                  >
                    Clear list
                  </button>
                )}
              </div>
            )}
            <Sep />
            <MenuItem label="Save" hint="Ctrl+S" onClick={() => { setOpen(null); void a().saveNow(); }} />
            <MenuItem label="Save As…" onClick={() => { setOpen(null); void a().saveAsNow(); }} />
            <Sep />
            <MenuItem
              label="Save as Template…"
              onClick={() => { setOpen(null); a().setDialog("saveTemplate"); }}
            />
            <Sep />
            <MenuItem label="Export PDF…" hint="Ctrl+E" onClick={() => { setOpen(null); void a().exportPdf(); }} />
            <Sep />
            <MenuItem label="Exit" onClick={() => { setOpen(null); void a().exitApp(); }} />
          </div>
        )}

        <button
          className={`menu-btn${open === "view" ? " active" : ""}`}
          onClick={() => setOpen(open === "view" ? null : "view")}
        >
          View
        </button>
        {open === "view" && (
          <div className="menu-pop">
            <MenuItem
              label="Word Wrap"
              checked={settings.wordWrap}
              onClick={() => up({ wordWrap: !settings.wordWrap })}
            />
            <MenuItem
              label="Line Numbers"
              checked={settings.lineNumbers}
              onClick={() => up({ lineNumbers: !settings.lineNumbers })}
            />
            <Sep />
            <MenuItem
              label="Outline Panel"
              checked={sidePanel === "outline"}
              onClick={() => a().toggleSidePanel("outline")}
            />
            <MenuItem
              label="Slides Panel"
              checked={sidePanel === "slides"}
              onClick={() => a().toggleSidePanel("slides")}
            />
            <MenuItem
              label="Problems Panel"
              checked={problemsOpen}
              onClick={() => a().setProblemsOpen(!problemsOpen)}
            />
            <Sep />
            <MenuItem
              label={settings.theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
              onClick={() => up({ theme: settings.theme === "dark" ? "light" : "dark" })}
            />
            <Sep />
            <MenuItem
              label="Preview: Zoom In"
              hint="Ctrl +"
              onClick={() => { up({ previewFit: false }); a().zoomPreview(1); }}
            />
            <MenuItem
              label="Preview: Zoom Out"
              hint="Ctrl −"
              onClick={() => { up({ previewFit: false }); a().zoomPreview(-1); }}
            />
            <MenuItem label="Preview: Reset Zoom" hint="Ctrl 0" onClick={() => a().resetPreviewZoom()} />
            <MenuItem
              label="Preview: Fit Width"
              checked={settings.previewFit}
              onClick={() => up({ previewFit: !settings.previewFit })}
            />
          </div>
        )}

        <button
          className={`menu-btn${open === "help" ? " active" : ""}`}
          onClick={() => setOpen(open === "help" ? null : "help")}
        >
          Help
        </button>
        {open === "help" && (
          <div className="menu-pop">
            <MenuItem
              label="Keyboard Shortcuts"
              hint="?"
              onClick={() => { setOpen(null); a().setDialog("help"); }}
            />
            <MenuItem label="About TexForge" onClick={() => { setOpen(null); a().setDialog("help"); }} />
          </div>
        )}
      </div>

      <div className="menubar-center">
        <span className="doc-chip" title="Current document">
          {dirty && <span className="dirty-dot" title="Unsaved changes" />}
          {name}
        </span>
        {!hasNative && settings.engineChoice !== "wasm" && (
          <button className="engine-warning" onClick={() => a().setDialog("settings")} title="No system LaTeX engine detected — click for options">
            <Icon name="alertTriangle" size={13} /> no engine
          </button>
        )}
      </div>

      <div className="menubar-right">
        <button
          className="btn btn-primary"
          onClick={() => void a().compileNow("manual")}
          disabled={running}
          title="Compile (Ctrl+Enter)"
        >
          <Icon name="play" size={14} />
          {running ? "Compiling…" : "Compile"}
        </button>
        <button className="btn" onClick={() => void a().exportPdf()} title="Export the compiled PDF (Ctrl+E)">
          <Icon name="download" size={14} />
          Export PDF
        </button>
        <button
          className="icon-btn"
          onClick={() => up({ theme: settings.theme === "dark" ? "light" : "dark" })}
          title="Toggle theme"
        >
          <Icon name={settings.theme === "dark" ? "sun" : "moon"} />
        </button>
        <button className="icon-btn" onClick={() => a().setDialog("settings")} title="Settings">
          <Icon name="sliders" />
        </button>
      </div>
    </div>
  );
}
