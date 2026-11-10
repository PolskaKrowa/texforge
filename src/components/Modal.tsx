// Generic modal dialog: overlay, panel, Esc/backdrop close (both optional).

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icons";

export function Modal({
  title,
  onClose,
  children,
  width = 720,
  dismissible = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!dismissible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dismissible, onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" style={{ width: `min(${width}px, 94vw)` }} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          {dismissible && (
            <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
