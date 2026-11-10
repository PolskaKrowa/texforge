// Help: keyboard shortcuts + about.

import { useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { useAppStore } from "../store";
import { Modal } from "./Modal";

const SHORTCUTS: [string, string][] = [
  ["Ctrl + Enter", "Compile the document"],
  ["Ctrl + S", "Save (and recompile)"],
  ["Ctrl + N", "New document from template"],
  ["Ctrl + O", "Open a .tex file"],
  ["Ctrl + E", "Export the compiled PDF"],
  ["Ctrl + F", "Find in document (CodeMirror)"],
  ["Ctrl + / Ctrl − / Ctrl 0", "Preview zoom in / out / reset"],
  ["Tab", "Indent (also accepts completions)"],
  ["Esc", "Close dialogs / completion pop-ups"],
];

export function HelpDialog() {
  const setDialog = useAppStore((s) => s.setDialog);
  const [info, setInfo] = useState<{ name: string; version: string } | null>(null);

  useEffect(() => {
    api
      .getAppInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  return (
    <Modal title="Help & About" onClose={() => setDialog(null)} width={560}>
      <h3 className="gallery-section">Keyboard shortcuts</h3>
      <table className="shortcut-table">
        <tbody>
          {SHORTCUTS.map(([keys, desc]) => (
            <tr key={keys}>
              <td>
                <kbd>{keys}</kbd>
              </td>
              <td>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="gallery-section">About</h3>
      <div className="about-box">
        <div className="app-mark big" aria-hidden="true">
          T<span>X</span>
        </div>
        <div>
          <div className="about-name">
            {info?.name ?? "TexForge"}{" "}
            <span className="about-version">{info?.version ?? ""}</span>
          </div>
          <p>
            A LaTeX editor with a live PDF preview, Beamer slide management and
            document templates. Built with Tauri, React, CodeMirror 6 and
            pdf.js; the built-in fallback engine is{" "}
            <a href="https://www.swiftlatex.com" target="_blank" rel="noreferrer">
              SwiftLaTeX
            </a>{" "}
            (EPL-2.0 / GPL-2.0-with-classpath-exception).
          </p>
        </div>
      </div>
    </Modal>
  );
}
