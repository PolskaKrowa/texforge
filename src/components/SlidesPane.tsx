// PowerPoint-style slide management for Beamer documents: frame thumbnails,
// reorder / duplicate / delete, and an "Add Slide" layout picker.

import { useMemo, useState } from "react";
import { isBeamer, parseFrames, SLIDE_LAYOUTS } from "../lib/latex";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

export function SlidesPane() {
  const content = useAppStore((s) => s.content);
  const jumpTo = useAppStore((s) => s.jumpTo);
  const frameOp = useAppStore((s) => s.frameOp);
  const insertSlide = useAppStore((s) => s.insertSlide);
  const setDialog = useAppStore((s) => s.setDialog);
  const [showLayouts, setShowLayouts] = useState(false);

  const beamer = useMemo(() => isBeamer(content), [content]);
  const frames = useMemo(() => (beamer ? parseFrames(content) : []), [content, beamer]);

  if (!beamer) {
    return (
      <div className="pane-scroll">
        <div className="pane-empty">
          <Icon name="slide" size={22} />
          <span>Slide management works with Beamer documents.</span>
          <button className="btn" onClick={() => setDialog("new")}>
            <Icon name="filePlus" size={14} /> New Beamer deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="slides-pane">
      {showLayouts && (
        <>
          <div className="popover-backdrop" onClick={() => setShowLayouts(false)} />
          <div className="layout-popover">
            <div className="layout-popover-title">Add a slide</div>
            <div className="layout-grid">
              {SLIDE_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  className="layout-card"
                  onClick={() => {
                    insertSlide(l.snippet);
                    setShowLayouts(false);
                  }}
                >
                  <div className={`layout-mock lm-${l.id}`} aria-hidden="true" />
                  <div className="layout-name">{l.name}</div>
                  <div className="layout-desc">{l.description}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="slides-head">
        <span className="slides-title">
          {frames.length} slide{frames.length === 1 ? "" : "s"}
        </span>
        <button className="btn btn-sm btn-primary" onClick={() => setShowLayouts(true)}>
          <Icon name="filePlus" size={13} /> Add Slide
        </button>
      </div>

      <div className="pane-scroll slides-list">
        {frames.length === 0 && (
          <div className="pane-empty">
            No slides yet — press <strong>Add Slide</strong> to insert your first frame.
          </div>
        )}
        {frames.map((f) => (
          <div key={f.index} className="slide-card" onClick={() => jumpTo(f.startLine)}>
            <div className="slide-mock">
              <div className="slide-mock-bar" />
              <div className="slide-mock-title">{f.title || "Untitled slide"}</div>
              {f.bullets.length === 0 && <div className="slide-mock-bullet placeholder" />}
              {f.bullets.slice(0, 3).map((b, i) => (
                <div key={i} className="slide-mock-bullet">
                  <span className="bullet-dot" />
                  <span className="bullet-text">{b || "…"}</span>
                </div>
              ))}
            </div>
            <div className="slide-card-meta">
              <span className="slide-lines">
                {f.index + 1} · lines {f.startLine}–{f.endLine}
              </span>
              <span className="slide-card-actions">
                <button
                  disabled={f.index === 0}
                  title="Move up"
                  onClick={(e) => { e.stopPropagation(); frameOp("up", f); }}
                >
                  <Icon name="chevronUp" size={13} />
                </button>
                <button
                  disabled={f.index === frames.length - 1}
                  title="Move down"
                  onClick={(e) => { e.stopPropagation(); frameOp("down", f); }}
                >
                  <Icon name="chevronDown" size={13} />
                </button>
                <button title="Duplicate" onClick={(e) => { e.stopPropagation(); frameOp("dup", f); }}>
                  <Icon name="copy" size={13} />
                </button>
                <button
                  className="danger"
                  title="Delete slide"
                  onClick={(e) => { e.stopPropagation(); frameOp("del", f); }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
