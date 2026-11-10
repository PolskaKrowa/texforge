// A tiny imperative bridge so non-React code (store actions, panes) can
// drive the CodeMirror view: squiggles, jump-to-line and content replacement.

import { EditorView } from "@codemirror/view";
import { setErrorLines } from "../editor/cm";

export const editorBridge = {
  view: null as EditorView | null,

  setErrors(lines: number[]): void {
    const v = this.view;
    if (!v) return;
    v.dispatch({ effects: setErrorLines.of(lines) });
  },

  clearErrors(): void {
    this.setErrors([]);
  },

  jumpTo(line: number): void {
    const v = this.view;
    if (!v) return;
    const ln = Math.min(Math.max(1, line), v.state.doc.lines);
    const pos = v.state.doc.line(ln).from;
    v.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    v.focus();
  },

  setContent(text: string): void {
    const v = this.view;
    if (!v) return;
    if (v.state.doc.toString() !== text) {
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: text },
      });
    }
  },

  focus(): void {
    this.view?.focus();
  },
};
