// Problems panel: structured errors / warnings / bad boxes with click-to-jump,
// plus the raw compiler log.

import { useState } from "react";
import { useAppStore } from "../store";
import { Icon, type IconName } from "./Icons";

const SEV_ICON: Record<string, IconName> = {
  error: "alertCircle",
  warning: "alertTriangle",
  badbox: "info",
};

export function ProblemsPanel() {
  const result = useAppStore((s) => s.compileResult);
  const jumpTo = useAppStore((s) => s.jumpTo);
  const setOpen = useAppStore((s) => s.setProblemsOpen);
  const docName = useAppStore((s) => s.name);
  const [showLog, setShowLog] = useState(false);

  const issues = result?.issues ?? [];
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const boxes = issues.filter((i) => i.severity === "badbox");

  return (
    <div className="problems-panel">
      <div className="problems-head">
        <span className="problems-title">
          <Icon name="list" size={13} /> Problems
        </span>
        {result && (
          <span className="problems-counts">
            <span className="cnt err">{errors.length}</span>
            <span className="cnt warn">{warnings.length}</span>
            <span className="cnt box">{boxes.length}</span>
          </span>
        )}
        <span className="flex-spacer" />
        {result?.logTail && (
          <button
            className={`chip-toggle${showLog ? " active" : ""}`}
            onClick={() => setShowLog(!showLog)}
          >
            Raw log
          </button>
        )}
        <button className="icon-btn icon-btn-sm" onClick={() => setOpen(false)} aria-label="Close problems panel">
          <Icon name="x" size={13} />
        </button>
      </div>

      {showLog ? (
        <pre className="raw-log">{result?.logTail || "(no log)"}</pre>
      ) : (
        <div className="problems-list">
          {!result && <div className="problems-empty">Nothing compiled yet.</div>}
          {result && issues.length === 0 && (
            <div className="problems-empty ok">
              <Icon name="check" size={13} /> No problems detected — compiled in{" "}
              {(result.durationMs / 1000).toFixed(1)}s with {result.engineUsed}.
            </div>
          )}
          {issues.map((issue, idx) => {
            const inMain =
              issue.file == null || issue.file === "main.tex" || issue.file === docName;
            const jumpable = issue.line != null && inMain;
            return (
              <button
                key={idx}
                className={`issue-row sev-${issue.severity}`}
                onClick={() => issue.line != null && inMain && jumpTo(issue.line)}
                disabled={!jumpable}
                title={
                  jumpable
                    ? `Jump to line ${issue.line}`
                    : issue.file
                      ? `Issue in ${issue.file} — open it from the editor`
                      : undefined
                }
              >
                <span className="issue-icon">
                  <Icon name={SEV_ICON[issue.severity] ?? "info"} size={14} />
                </span>
                <span className="issue-message">{issue.message}</span>
                <span className="issue-loc">
                  {issue.file != null && !inMain
                    ? `${issue.file}${issue.line != null ? ":" + issue.line : ""}`
                    : issue.line != null
                      ? `line ${issue.line}`
                      : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
