// CodeMirror themes (dark + light) driven by the global CSS variables, plus
// the LaTeX token highlighting style.

import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const baseThemeSpec = {
  "&": { backgroundColor: "var(--bg-0)", height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--accent)" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground": { backgroundColor: "var(--sel)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-1)",
    color: "var(--fg-3)",
    border: "none",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine": { backgroundColor: "var(--active-line)" },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-1)",
    color: "var(--fg-1)",
    fontWeight: 600,
  },
  ".cm-panels": {
    backgroundColor: "var(--bg-2)",
    color: "var(--fg-1)",
    borderBottom: "1px solid var(--border)",
  },
  ".cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label": {
    background: "var(--bg-3)",
    color: "var(--fg-1)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "2px 6px",
  },
  ".cm-searchMatch": { backgroundColor: "var(--sel-strong)" },
  ".cm-searchMatch-selected": { backgroundColor: "var(--sel-active)" },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--bg-accent)",
    color: "var(--fg-1)",
  },
  ".cm-completionDetail": { color: "var(--fg-3)", fontStyle: "normal" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 12px", minWidth: "38px" },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 2px" },
};

export const cmDark = EditorView.theme(baseThemeSpec, { dark: true });
export const cmLight = EditorView.theme(baseThemeSpec, { dark: false });

// Token colors reference CSS variables from global.css so both themes share
// the definitions.
export const latexHighlight = HighlightStyle.define([
  { tag: [t.tagName, t.keyword], color: "var(--tok-cs)" }, // \commands
  { tag: t.comment, color: "var(--tok-comment)", fontStyle: "italic" },
  { tag: t.string, color: "var(--tok-string)" }, // braces/arguments
  { tag: t.bracket, color: "var(--tok-bracket)" }, // {} []
  { tag: t.meta, color: "var(--tok-math)" },
  { tag: t.atom, color: "var(--tok-atom)" },
  { tag: t.variableName, color: "var(--tok-link)" }, // \label, \ref …
  { tag: t.standard(t.variableName), color: "var(--tok-op)" },
  { tag: t.operator, color: "var(--tok-op)" },
  { tag: t.link, color: "var(--tok-link)", textDecoration: "underline" },
  { tag: t.number, color: "var(--tok-num)" },
  { tag: t.processingInstruction, color: "var(--tok-math)" },
  { tag: t.invalid, color: "var(--err)" },
]);
