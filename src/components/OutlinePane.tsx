// Document outline (\section / \subsection / \frametitle) with click-to-jump.

import { useMemo } from "react";
import { parseOutline } from "../lib/latex";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

export function OutlinePane() {
  const content = useAppStore((s) => s.content);
  const jumpTo = useAppStore((s) => s.jumpTo);
  const items = useMemo(() => parseOutline(content), [content]);

  return (
    <div className="pane-scroll">
      {items.length === 0 && (
        <div className="pane-empty">
          No sections yet.
          <br />
          Add <code>\section</code>, <code>\subsection</code> or{" "}
          <code>\frametitle</code> headings and they will appear here.
        </div>
      )}
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`outline-item depth-${item.kind}`}
          onClick={() => jumpTo(item.line)}
          title={`${item.title} — line ${item.line}`}
        >
          <span className="outline-icon">
            <Icon
              name={item.kind === "frame" ? "slide" : "chevronRight"}
              size={13}
            />
          </span>
          <span className="outline-title">{item.title || "(untitled)"}</span>
          <span className="outline-line">{item.line}</span>
        </button>
      ))}
    </div>
  );
}
