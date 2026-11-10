// Toast notifications (bottom-right stack).

import { useEffect } from "react";
import { useAppStore } from "../store";
import { Icon } from "./Icons";

function ToastRow({ id }: { id: number }) {
  const toast = useAppStore((s) => s.toasts.find((t) => t.id === id));
  const dismiss = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    const ttl = toast?.action ? 8000 : 4500;
    const timer = setTimeout(() => dismiss(id), ttl);
    return () => clearTimeout(timer);
  }, [id, dismiss, toast]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.kind}`}>
      <span className="toast-icon">
        <Icon
          name={
            toast.kind === "error"
              ? "alertCircle"
              : toast.kind === "success"
                ? "check"
                : "info"
          }
        />
      </span>
      <span className="toast-message">{toast.message}</span>
      {toast.action && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            toast.action?.run();
            dismiss(id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button className="icon-btn icon-btn-sm" onClick={() => dismiss(id)} aria-label="Dismiss">
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

export function Toasts() {
  const ids = useAppStore((s) => s.toasts.map((t) => t.id).join(","));
  const list = ids ? ids.split(",").map(Number) : [];
  return (
    <div className="toast-stack">
      {list.map((id) => (
        <ToastRow key={id} id={id} />
      ))}
    </div>
  );
}
