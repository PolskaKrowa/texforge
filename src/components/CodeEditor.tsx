// The CodeMirror 6 editor pane.

import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState, reconfigureSettings } from "../editor/cm";
import { editorBridge } from "../lib/editorBridge";
import { useAppStore } from "../store";

export function CodeEditor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const content = useAppStore((s) => s.content);
  const settings = useAppStore((s) => s.settings);

  // Mount the editor once.
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const store = useAppStore.getState();
    const view = new EditorView({
      state: createEditorState(store.content, store.settings, {
        onDocChange(doc) {
          const st = useAppStore.getState();
          if (doc !== st.content) st.setContent(doc);
        },
        onCursor(line, col, totalLines) {
          const st = useAppStore.getState();
          st.setCursor(line, col);
          st.setTotalLines(totalLines);
        },
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    editorBridge.view = view;
    // Report the initial document size (the update listener only fires on
    // user interactions, so the line count would otherwise stay stale).
    useAppStore.getState().setTotalLines(view.state.doc.lines);
    return () => {
      view.destroy();
      viewRef.current = null;
      editorBridge.view = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure compartments when settings change.
  useEffect(() => {
    const v = viewRef.current;
    if (v) reconfigureSettings(v, settings);
  }, [settings]);

  // Sync external content changes (open / new / slide operations).
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    if (v.state.doc.toString() !== content) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: content } });
    }
  }, [content]);

  return <div className="editor-host" ref={hostRef} />;
}
