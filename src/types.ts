// Shared types for the TexForge frontend.

export interface EngineInfo {
  name: string;
  path: string;
}

export type IssueSeverity = "error" | "warning" | "badbox";

export interface CompileIssue {
  severity: IssueSeverity;
  line: number | null;
  file: string | null;
  message: string;
}

export interface CompileResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  issues: CompileIssue[];
  logTail: string;
  engineUsed: string;
  durationMs: number;
  passes: number;
  /** True when no engine was available at all (drives the setup banner). */
  noEngine?: boolean;
}

/** Raw shape returned by the Rust `compile_latex` command (snake_case). */
export interface NativeCompileResult {
  success: boolean;
  pdf_b64: string | null;
  issues: CompileIssue[];
  log_tail: string;
  engine_used: string;
  duration_ms: number;
  passes: number;
}

export type TemplateKind = "beamer" | "article" | "basic";

export interface TemplateCard {
  id: string;
  name: string;
  description: string;
  kind: TemplateKind;
  builtin: boolean;
  content: string;
}

/** Raw shape returned by the Rust `list_user_templates` / `save_user_template`. */
export interface UserTemplateInfo {
  id: string;
  name: string;
  description: string;
  kind: string;
  created_at: number;
  content: string;
}

export interface RecentFile {
  path: string;
  name: string;
  updated_at: number;
}

export interface AppInfo {
  name: string;
  version: string;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
  action?: ToastAction;
}

export type EngineChoice =
  | "auto"
  | "xelatex"
  | "pdflatex"
  | "lualatex"
  | "tectonic"
  | "wasm"
  | "custom";

export interface Settings {
  theme: "dark" | "light";
  wordWrap: boolean;
  lineNumbers: boolean;
  fontSize: number;
  engineChoice: EngineChoice;
  customEnginePath: string;
  autoRecompile: boolean;
  compileOnSave: boolean;
  reopenLastFile: boolean;
  lastFile: string | null;
  /** Editor pane width in percent of the main area (30–75). */
  editorWidthPct: number;
  previewFit: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  wordWrap: false,
  lineNumbers: true,
  fontSize: 14,
  engineChoice: "auto",
  customEnginePath: "",
  autoRecompile: false,
  compileOnSave: true,
  reopenLastFile: true,
  lastFile: null,
  editorWidthPct: 50,
  previewFit: true,
};

export function isEngineChoice(v: string): v is EngineChoice {
  return ["auto", "xelatex", "pdflatex", "lualatex", "tectonic", "wasm", "custom"].includes(v);
}
