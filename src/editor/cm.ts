// CodeMirror 6 setup for the LaTeX editor:
// syntax highlighting (legacy stex mode), line numbers, optional word wrap,
// bracket matching, search, LaTeX autocompletion and error-line decorations.

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentUnit,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
  type Extension,
  type Range,
} from "@codemirror/state";
import {
  crosshairCursor,
  Decoration,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  type DecorationSet,
} from "@codemirror/view";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { tags as t } from "@lezer/highlight";
import { latexCompletion } from "./completion";
import { cmDark, cmLight, latexHighlight } from "./theme";
import type { Settings } from "../types";

// ---------------------------------------------------------------------------
// LaTeX language
// ---------------------------------------------------------------------------

export const latexLanguage = StreamLanguage.define({
  ...stex,
  languageData: { commentTokens: { line: "%" } },
  // stex emits some custom token names (\begin, \ref, …) — map them to
  // standard tags so the highlight style can pick them up.
  tokenTable: {
    begin: t.keyword,
    end: t.keyword,
    documentclass: t.meta,
    usepackage: t.meta,
    importmodule: t.meta,
    label: t.variableName,
    ref: t.variableName,
    eqref: t.variableName,
    cite: t.variableName,
    bibitem: t.variableName,
    Bibitem: t.variableName,
    RBibitem: t.variableName,
  },
});

// ---------------------------------------------------------------------------
// Error line decorations (red tint + left border, styled in global.css)
// ---------------------------------------------------------------------------

export const setErrorLines = StateEffect.define<number[]>();

const errorLinesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setErrorLines)) {
        const parts: Range<Decoration>[] = [];
        const seen = new Set<number>();
        for (const ln of effect.value) {
          if (typeof ln !== "number" || ln < 1) continue;
          const clamped = Math.min(ln, tr.state.doc.lines);
          if (seen.has(clamped)) continue;
          seen.add(clamped);
          parts.push(
            Decoration.line({ class: "cm-errorLine" }).range(tr.state.doc.line(clamped).from)
          );
        }
        value = Decoration.set(parts, true);
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ---------------------------------------------------------------------------
// Compartments for live-reconfigurable settings
// ---------------------------------------------------------------------------

export const wrapComp = new Compartment();
export const themeComp = new Compartment();
export const fontSizeComp = new Compartment();
export const gutterComp = new Compartment();

export function fontSizeTheme(px: number): Extension {
  return EditorView.theme({
    "&": { fontSize: `${px}px` },
    ".cm-content": { fontFamily: "var(--font-mono)" },
    ".cm-gutters": { fontFamily: "var(--font-mono)" },
  });
}

export interface EditorCallbacks {
  onDocChange(doc: string): void;
  onCursor(line: number, col: number, totalLines: number): void;
}

export function createEditorState(
  content: string,
  settings: Settings,
  cb: EditorCallbacks
): EditorState {
  const extensions: Extension[] = [
    gutterComp.of(settings.lineNumbers ? lineNumbers() : []),
    wrapComp.of(settings.wordWrap ? EditorView.lineWrapping : []),
    themeComp.of(settings.theme === "dark" ? cmDark : cmLight),
    fontSizeComp.of(fontSizeTheme(settings.fontSize)),
    latexLanguage,
    indentUnit.of("  "),
    syntaxHighlighting(latexHighlight, { fallback: true }),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ override: [latexCompletion], icons: false }),
    search({ top: true }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    errorLinesField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        cb.onDocChange(update.state.doc.toString());
      }
      if (update.docChanged || update.selectionSet) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        cb.onCursor(line.number, head - line.from + 1, update.state.doc.lines);
      }
    }),
  ];
  return EditorState.create({ doc: content, extensions });
}

export function reconfigureSettings(view: EditorView, settings: Settings): void {
  view.dispatch({
    effects: [
      wrapComp.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
      themeComp.reconfigure(settings.theme === "dark" ? cmDark : cmLight),
      fontSizeComp.reconfigure(fontSizeTheme(settings.fontSize)),
      gutterComp.reconfigure(settings.lineNumbers ? lineNumbers() : []),
    ],
  });
}
