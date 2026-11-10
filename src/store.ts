// The app store: document state, compile orchestration, file flows,
// templates, recents, settings and UI state (zustand).

import { create } from "zustand";
import { BUILTIN_TEMPLATES } from "./builtinTemplates";
import { runCompile } from "./lib/compile";
import { editorBridge } from "./lib/editorBridge";
import {
  deleteFrame,
  duplicateFrame,
  frameInsertionLine,
  insertBlockAtLine,
  isBeamer,
  moveFrame,
  type Frame,
} from "./lib/latex";
import { api } from "./lib/tauri";
import { basename, bytesToB64 } from "./lib/util";
import {
  DEFAULT_SETTINGS,
  isEngineChoice,
  type CompileResult,
  type EngineInfo,
  type RecentFile,
  type Settings,
  type TemplateCard,
  type Toast,
  type UserTemplateInfo,
} from "./types";

export type DialogKind = "new" | "settings" | "saveTemplate" | "unsaved" | "help" | null;
export type SidePanelKind = "outline" | "slides" | null;
export type CompileStatus = "idle" | "running" | "ok" | "error";
export type UnsavedChoice = "save" | "discard" | "cancel";

const SETTINGS_KEY = "texforge.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const s: Settings = { ...DEFAULT_SETTINGS, ...parsed };
    if (typeof s.fontSize !== "number" || s.fontSize < 10 || s.fontSize > 24) {
      s.fontSize = DEFAULT_SETTINGS.fontSize;
    }
    if (!isEngineChoice(String(s.engineChoice))) s.engineChoice = "auto";
    s.editorWidthPct = Math.min(75, Math.max(30, Number(s.editorWidthPct) || 50));
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled — settings then live for this session only */
  }
}

interface AppStore {
  // Document
  path: string | null;
  name: string;
  content: string;
  savedContent: string;

  // Compilation
  compileStatus: CompileStatus;
  compileResult: CompileResult | null;
  pdfBytes: Uint8Array | null;
  compiledFromContent: string;

  // Environment
  engines: EngineInfo[];
  recents: RecentFile[];
  userTemplates: UserTemplateInfo[];

  // UI
  settings: Settings;
  dialog: DialogKind;
  sidePanel: SidePanelKind;
  problemsOpen: boolean;
  toasts: Toast[];
  cursor: { line: number; col: number };
  totalLines: number;
  unsavedResolver: ((choice: UnsavedChoice) => void) | null;
  previewZoom: number;

  // ---- actions ----
  init(): Promise<void>;
  refreshEngines(): Promise<void>;
  refreshRecents(): Promise<void>;
  clearRecents(): Promise<void>;
  refreshUserTemplates(): Promise<void>;

  setContent(content: string): void;
  setCursor(line: number, col: number): void;
  setTotalLines(n: number): void;
  loadDoc(path: string, content: string): void;
  startNewFromTemplate(card: TemplateCard): void;

  compileNow(trigger?: "manual" | "auto" | "save" | "export"): Promise<void>;
  saveNow(): Promise<boolean>;
  saveAsNow(): Promise<boolean>;
  openPath(path: string): Promise<void>;
  openDialog(): Promise<void>;
  newDialog(): Promise<void>;
  exportPdf(): Promise<void>;
  saveTemplate(name: string, description: string): Promise<boolean>;
  deleteTemplate(id: string): Promise<void>;
  insertSlide(snippet: string): void;
  frameOp(op: "up" | "down" | "dup" | "del", frame: Frame): void;

  confirmUnsaved(): Promise<UnsavedChoice>;
  resolveUnsaved(choice: UnsavedChoice): void;
  maybeContinue(): Promise<boolean>;
  exitApp(): Promise<void>;

  updateSettings(patch: Partial<Settings>): void;
  setPreviewZoom(z: number): void;
  zoomPreview(dir: 1 | -1): void;
  resetPreviewZoom(): void;
  setDialog(d: DialogKind): void;
  setSidePanel(p: SidePanelKind): void;
  toggleSidePanel(p: Exclude<SidePanelKind, null>): void;
  setProblemsOpen(open: boolean): void;
  toast(message: string, kind?: Toast["kind"], action?: Toast["action"]): void;
  dismissToast(id: number): void;
  jumpTo(line: number): void;
}

let toastSeq = 1;

export const useAppStore = create<AppStore>()((set, get) => ({
  path: null,
  name: "untitled.tex",
  content: BUILTIN_TEMPLATES[0].content,
  savedContent: BUILTIN_TEMPLATES[0].content,
  compileStatus: "idle",
  compileResult: null,
  pdfBytes: null,
  compiledFromContent: "",
  engines: [],
  recents: [],
  userTemplates: [],
  settings: { ...DEFAULT_SETTINGS },
  dialog: null,
  sidePanel: null,
  problemsOpen: true,
  toasts: [],
  cursor: { line: 1, col: 1 },
  totalLines: 1,
  unsavedResolver: null,
  previewZoom: 1,

  async init() {
    set({ settings: loadSettings() });
    void get().refreshEngines();
    void get().refreshRecents();
    void get().refreshUserTemplates();

    const s = get().settings;
    if (s.reopenLastFile && s.lastFile) {
      try {
        const content = await api.readTextFile(s.lastFile);
        get().loadDoc(s.lastFile, content);
        return;
      } catch {
        /* file is gone — fall through to a fresh document */
      }
    }
    const tpl = BUILTIN_TEMPLATES[0];
    set({
      path: null,
      name: "untitled.tex",
      content: tpl.content,
      savedContent: tpl.content,
      compileStatus: "idle",
      compileResult: null,
      pdfBytes: null,
    });
  },

  async refreshEngines() {
    try {
      set({ engines: await api.detectEngines() });
    } catch {
      set({ engines: [] });
    }
  },

  async refreshRecents() {
    try {
      set({ recents: await api.getRecents() });
    } catch {
      /* ignore */
    }
  },

  async clearRecents() {
    try {
      await api.clearRecents();
    } catch {
      /* ignore */
    }
    set({ recents: [] });
  },

  async refreshUserTemplates() {
    try {
      set({ userTemplates: await api.listUserTemplates() });
    } catch {
      /* ignore */
    }
  },

  setContent(content) {
    set({ content });
  },

  setCursor(line, col) {
    const cur = get().cursor;
    if (cur.line !== line || cur.col !== col) set({ cursor: { line, col } });
  },

  setTotalLines(n) {
    set({ totalLines: n });
  },

  loadDoc(path, content) {
    set({
      path,
      name: basename(path),
      content,
      savedContent: content,
      compileStatus: "idle",
      compileResult: null,
      pdfBytes: null,
      compiledFromContent: "",
    });
    editorBridge.setContent(content);
    editorBridge.clearErrors();
    get().updateSettings({ lastFile: path });
    void api.pushRecent(path).then(() => get().refreshRecents()).catch(() => {});
  },

  startNewFromTemplate(card) {
    set({
      path: null,
      name: "untitled.tex",
      content: card.content,
      savedContent: card.content,
      compileStatus: "idle",
      compileResult: null,
      pdfBytes: null,
      compiledFromContent: "",
      dialog: null,
      sidePanel: card.kind === "beamer" ? "slides" : null,
    });
    editorBridge.setContent(card.content);
    editorBridge.clearErrors();
  },

  async compileNow(trigger = "manual") {
    if (get().compileStatus === "running") return;
    set({ compileStatus: "running" });
    const source = get().content;
    let result: CompileResult;
    try {
      result = await runCompile(source, get().path, get().settings);
    } catch (e) {
      result = {
        success: false,
        pdfBytes: null,
        issues: [
          {
            severity: "error",
            line: null,
            file: null,
            message: e instanceof Error ? e.message : String(e),
          },
        ],
        logTail: "",
        engineUsed: "—",
        durationMs: 0,
        passes: 0,
      };
    }
    set({
      compileStatus: result.success ? "ok" : "error",
      compileResult: result,
      pdfBytes: result.pdfBytes,
      compiledFromContent: source,
    });

    const docName = get().name;
    const errorLines = result.issues
      .filter(
        (i) =>
          i.severity === "error" &&
          i.line != null &&
          (i.file == null || i.file === "main.tex" || i.file === docName)
      )
      .map((i) => i.line as number);
    editorBridge.setErrors(errorLines);

    if (trigger === "manual" && !result.success) set({ problemsOpen: true });
  },

  async saveNow() {
    const s = get();
    if (s.path == null) return get().saveAsNow();
    try {
      await api.writeTextFile(s.path, s.content);
    } catch (e) {
      get().toast(String(e), "error");
      return false;
    }
    set({ savedContent: s.content });
    get().updateSettings({ lastFile: s.path });
    void api.pushRecent(s.path).then(() => get().refreshRecents()).catch(() => {});
    if (get().settings.compileOnSave && get().compiledFromContent !== s.content) {
      void get().compileNow("save");
    }
    return true;
  },

  async saveAsNow() {
    const s = get();
    const picked = await api.pickSaveTexFile(s.name || "untitled.tex");
    if (!picked) return false;
    set({ path: picked, name: basename(picked) });
    return get().saveNow();
  },

  async openPath(path) {
    let content: string;
    try {
      content = await api.readTextFile(path);
    } catch (e) {
      get().toast(String(e), "error");
      return;
    }
    get().loadDoc(path, content);
  },

  async openDialog() {
    if (!(await get().maybeContinue())) return;
    const picked = await api.pickOpenFile();
    if (picked) await get().openPath(picked);
  },

  async newDialog() {
    if (!(await get().maybeContinue())) return;
    set({ dialog: "new" });
  },

  async exportPdf() {
    let s = get();
    if (!s.pdfBytes || s.compiledFromContent !== s.content) {
      await get().compileNow("export");
      s = get();
      if (!s.pdfBytes) {
        get().toast("Cannot export: the document does not compile.", "error");
        return;
      }
    }
    const base = (s.name || "document").replace(/\.tex$/i, "");
    const picked = await api.pickSavePdfFile(`${base}.pdf`);
    if (!picked) return;
    try {
      await api.writePdfFromB64(picked, bytesToB64(s.pdfBytes));
    } catch (e) {
      get().toast(String(e), "error");
      return;
    }
    get().toast(`Exported ${basename(picked)}`, "success", {
      label: "Show in folder",
      run: () => {
        api.showInFolder(picked).catch((e) => get().toast(String(e), "error"));
      },
    });
  },

  async saveTemplate(name, description) {
    const s = get();
    const kind = isBeamer(s.content) ? "beamer" : /\\documentclass(\[[^\]]*\])?\s*\{article\}/.test(s.content) ? "article" : "basic";
    try {
      await api.saveUserTemplate(name, description, kind, s.content);
    } catch (e) {
      get().toast(String(e), "error");
      return false;
    }
    await get().refreshUserTemplates();
    set({ dialog: null });
    get().toast(`Template “${name}” saved.`, "success");
    return true;
  },

  async deleteTemplate(id) {
    try {
      await api.deleteUserTemplate(id);
    } catch (e) {
      get().toast(String(e), "error");
      return;
    }
    await get().refreshUserTemplates();
    get().toast("Template deleted.", "info");
  },

  insertSlide(snippet) {
    const s = get();
    const at = frameInsertionLine(s.content, s.cursor.line);
    const next = insertBlockAtLine(s.content, at, snippet);
    set({ content: next });
    editorBridge.setContent(next);
    editorBridge.jumpTo(at);
  },

  frameOp(op, frame) {
    const s = get();
    let next: string;
    switch (op) {
      case "up":
        next = moveFrame(s.content, frame, -1);
        break;
      case "down":
        next = moveFrame(s.content, frame, 1);
        break;
      case "dup":
        next = duplicateFrame(s.content, frame);
        break;
      case "del":
        next = deleteFrame(s.content, frame);
        break;
    }
    if (next === s.content) return;
    set({ content: next });
    editorBridge.setContent(next);
  },

  confirmUnsaved() {
    return new Promise<UnsavedChoice>((resolve) => {
      set({ dialog: "unsaved", unsavedResolver: resolve });
    });
  },

  resolveUnsaved(choice) {
    const r = get().unsavedResolver;
    set({ dialog: null, unsavedResolver: null });
    r?.(choice);
  },

  async maybeContinue() {
    const s = get();
    if (s.content === s.savedContent) return true;
    const choice = await get().confirmUnsaved();
    if (choice === "cancel") return false;
    if (choice === "save") return get().saveNow();
    return true;
  },

  async exitApp() {
    if (await get().maybeContinue()) {
      await api.forceExit();
    }
  },

  updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    persistSettings(next);
  },

  setPreviewZoom(z) {
    set({ previewZoom: Math.min(3, Math.max(0.4, z)) });
  },

  zoomPreview(dir) {
    const factor = dir === 1 ? 1.2 : 1 / 1.2;
    get().setPreviewZoom(Math.round(get().previewZoom * factor * 100) / 100);
  },

  resetPreviewZoom() {
    set({ previewZoom: 1 });
  },

  setDialog(d) {
    set({ dialog: d });
  },

  setSidePanel(p) {
    set({ sidePanel: p });
  },

  toggleSidePanel(p) {
    set((st) => ({ sidePanel: st.sidePanel === p ? null : p }));
  },

  setProblemsOpen(open) {
    set({ problemsOpen: open });
  },

  toast(message, kind = "info", action) {
    const id = toastSeq++;
    set((st) => ({ toasts: [...st.toasts, { id, message, kind, action }] }));
  },

  dismissToast(id) {
    set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) }));
  },

  jumpTo(line) {
    editorBridge.jumpTo(line);
  },
}));
