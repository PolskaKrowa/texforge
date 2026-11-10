// Unsaved-changes confirmation (also used when switching documents / exiting).

import { useAppStore } from "../store";
import { Modal } from "./Modal";

export function UnsavedDialog() {
  const name = useAppStore((s) => s.name);
  const resolve = useAppStore((s) => s.resolveUnsaved);
  const saving = useAppStore((s) => s.compileStatus === "running");

  return (
    <Modal title="Unsaved changes" onClose={() => {}} dismissible={false} width={440}>
      <p className="unsaved-text">
        Do you want to save the changes to <strong>{name}</strong> before
        continuing?
      </p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => resolve("cancel")} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={() => resolve("discard")} disabled={saving}>
          Don't save
        </button>
        <button className="btn btn-primary" onClick={() => resolve("save")} disabled={saving}>
          Save
        </button>
      </div>
    </Modal>
  );
}
