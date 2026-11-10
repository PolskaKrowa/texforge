// Save the current document as a reusable template.

import { useState } from "react";
import { isBeamer } from "../lib/latex";
import { useAppStore } from "../store";
import { Modal } from "./Modal";

export function SaveTemplateDialog() {
  const setDialog = useAppStore((s) => s.setDialog);
  const saveTemplate = useAppStore((s) => s.saveTemplate);
  const content = useAppStore((s) => s.content);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = isBeamer(content)
    ? "beamer presentation"
    : /\\documentclass(\[[^\]]*\])?\s*\{article\}/.test(content)
      ? "article"
      : "document";

  return (
    <Modal
      title="Save as Template"
      onClose={() => setDialog(null)}
      width={520}
    >
      <div className="form-grid">
        <label className="form-label">Template name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Group meeting deck"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && name.trim() && !busy) {
              setBusy(true);
              await saveTemplate(name, description);
              setBusy(false);
            }
          }}
        />

        <label className="form-label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What is this template for?"
        />

        <div className="form-note">
          Detected type: <span className="kind-chip">{kind}</span> — the current
          editor content is stored as-is and will appear in the New Document
          gallery.
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => setDialog(null)}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await saveTemplate(name, description);
            setBusy(false);
          }}
        >
          Save template
        </button>
      </div>
    </Modal>
  );
}
