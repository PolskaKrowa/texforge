// Bottom status bar: document info, cursor position, engine + compile status.

import { isBeamer } from "../lib/latex";
import { formatDuration } from "../lib/util";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

export function StatusBar() {
  const path = useAppStore((s) => s.path);
  const name = useAppStore((s) => s.name);
  const content = useAppStore((s) => s.content);
  const cursor = useAppStore((s) => s.cursor);
  const totalLines = useAppStore((s) => s.totalLines);
  const compileStatus = useAppStore((s) => s.compileStatus);
  const compileResult = useAppStore((s) => s.compileResult);
  const compiledFrom = useAppStore((s) => s.compiledFromContent);
  const stale =
    compiledFrom !== "" && compiledFrom !== content && compileResult != null;

  const result = useAppStore((s) => s.compileResult);
  const errors = result?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warnings = result?.issues.filter((i) => i.severity === "warning").length ?? 0;
  const beamer = isBeamer(content);
  const setDialog = useAppStore((s) => s.setDialog);
  const setProblemsOpen = useAppStore((s) => s.setProblemsOpen);

  return (
    <div className="statusbar">
      <div className="status-left">
        <button
          className="status-chip"
          title={path ?? "Not saved yet"}
          onClick={() => {
            if (path) {
              void navigator.clipboard?.writeText(path);
              useAppStore.getState().toast("Path copied to clipboard.", "info");
            }
          }}
        >
          <Icon name="filePlus" size={12} />
          {name}
          {path ? "" : " (unsaved)"}
        </button>
        <span className={`kind-chip kind-${beamer ? "beamer" : "article"}`}>
          {beamer ? "beamer" : "article"}
        </span>
      </div>

      <div className="status-mid">
        Ln {cursor.line}, Col {cursor.col} · {totalLines} line{totalLines === 1 ? "" : "s"}
      </div>

      <div className="status-right">
        {compileStatus === "running" && (
          <span className="compile-chip running">
            <span className="spinner" /> compiling…
          </span>
        )}
        {compileStatus === "ok" && result && (
          <span
            className={`compile-chip ok${stale ? " stale" : ""}`}
            title={stale ? "Document changed since the last compile" : undefined}
          >
            <Icon name="check" size={12} /> {formatDuration(result.durationMs)}
            {stale ? " · changed" : ""}
          </span>
        )}
        {compileStatus === "error" && (
          <button className="compile-chip err" onClick={() => setProblemsOpen(true)}>
            <Icon name="alertCircle" size={12} />
            {errors} error{errors === 1 ? "" : "s"}, {warnings} warning{warnings === 1 ? "" : "s"}
          </button>
        )}
        <button
          className="status-chip"
          onClick={() => setDialog("settings")}
          title="Compilation engine — click to change"
        >
          <Icon name="sliders" size={12} />
          {result ? result.engineUsed : "engine: auto"}
        </button>
      </div>
    </div>
  );
}
