// PowerPoint-style "New Document" gallery: Beamer deck templates, the user's
// own saved templates, and a blank document.

import { BUILTIN_TEMPLATES } from "../builtinTemplates";
import { useAppStore } from "../store";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

function TemplateThumb({ id, kind }: { id: string; kind: string }) {
  if (kind !== "beamer") {
    return (
      <div className="thumb thumb-page" aria-hidden="true">
        <div className="p-line w-60" />
        <div className="p-gap" />
        <div className="p-line w-95" />
        <div className="p-line w-88" />
        <div className="p-line w-92" />
        <div className="p-gap" />
        <div className="p-line w-75" />
      </div>
    );
  }
  const variant = id.includes("dark")
    ? "dark"
    : id.includes("academic")
      ? "academic"
      : id.includes("blank")
        ? "plain"
        : "teal";
  return (
    <div className={`thumb thumb-slide thumb-${variant}`} aria-hidden="true">
      <div className="t-bar" />
      <div className="t-title" />
      <div className="t-bullet" />
      <div className="t-bullet short" />
      <div className="t-bullet short" />
    </div>
  );
}

export function NewFileDialog() {
  const setDialog = useAppStore((s) => s.setDialog);
  const startNew = useAppStore((s) => s.startNewFromTemplate);
  const userTemplates = useAppStore((s) => s.userTemplates);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);

  const beamerBuiltins = BUILTIN_TEMPLATES.filter((t) => t.kind === "beamer");
  const basicBuiltins = BUILTIN_TEMPLATES.filter((t) => t.kind !== "beamer");

  return (
    <Modal title="New Document" onClose={() => setDialog(null)} width={860}>
      <h3 className="gallery-section">Beamer presentations</h3>
      <div className="tpl-grid">
        {beamerBuiltins.map((t) => (
          <button key={t.id} className="tpl-card" onClick={() => startNew(t)}>
            <div className="tpl-thumb">
              <TemplateThumb id={t.id} kind={t.kind} />
            </div>
            <div className="tpl-body">
              <div className="tpl-name">{t.name}</div>
              <div className="tpl-desc">{t.description}</div>
            </div>
          </button>
        ))}
      </div>

      <h3 className="gallery-section">
        My templates
        <span className="gallery-hint">— saved from your documents via File → Save as Template…</span>
      </h3>
      <div className="tpl-grid">
        {userTemplates.length === 0 && (
          <div className="tpl-empty">
            No saved templates yet. Open any document and choose{" "}
            <strong>File → Save as Template…</strong> to pin it here.
          </div>
        )}
        {userTemplates.map((t) => (
          <button
            key={t.id}
            className="tpl-card"
            onClick={() =>
              startNew({
                id: t.id,
                name: t.name,
                description: t.description,
                kind: (t.kind === "beamer" ? "beamer" : t.kind === "article" ? "article" : "basic"),
                builtin: false,
                content: t.content,
              })
            }
          >
            <div className="tpl-thumb">
              <TemplateThumb id={t.id} kind={t.kind} />
              <span
                className="tpl-delete"
                role="button"
                title="Delete template"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteTemplate(t.id);
                }}
              >
                <Icon name="trash" size={13} />
              </span>
            </div>
            <div className="tpl-body">
              <div className="tpl-name">{t.name}</div>
              <div className="tpl-desc">{t.description || `Saved ${new Date(t.created_at * 1000).toLocaleDateString()}`}</div>
            </div>
          </button>
        ))}
      </div>

      <h3 className="gallery-section">Basics</h3>
      <div className="tpl-grid">
        {basicBuiltins.map((t) => (
          <button key={t.id} className="tpl-card" onClick={() => startNew(t)}>
            <div className="tpl-thumb">
              <TemplateThumb id={t.id} kind={t.kind} />
            </div>
            <div className="tpl-body">
              <div className="tpl-name">{t.name}</div>
              <div className="tpl-desc">{t.description}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
