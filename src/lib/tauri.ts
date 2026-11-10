// Single API surface for the whole app.
//
// In the desktop app every call goes through Tauri `invoke`. When the UI is
// opened in a plain browser (`npm run dev` without the Tauri shell), a mock
// implementation keeps the app usable for frontend development.

import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo,
  EngineInfo,
  NativeCompileResult,
  RecentFile,
  UserTemplateInfo,
} from "../types";
import { mockApi } from "./mock";

export const isDesktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface TexForgeApi {
  readonly desktop: boolean;
  detectEngines(): Promise<EngineInfo[]>;
  compileLatex(req: {
    source: string;
    path: string | null;
    engine: string | null;
    customPath: string | null;
  }): Promise<NativeCompileResult>;
  pickOpenFile(): Promise<string | null>;
  pickSaveTexFile(defaultName: string): Promise<string | null>;
  pickSavePdfFile(defaultName: string): Promise<string | null>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  writePdfFromB64(path: string, b64: string): Promise<void>;
  showInFolder(path: string): Promise<void>;
  forceExit(): Promise<void>;
  getAppInfo(): Promise<AppInfo>;
  getRecents(): Promise<RecentFile[]>;
  pushRecent(path: string): Promise<void>;
  clearRecents(): Promise<void>;
  listUserTemplates(): Promise<UserTemplateInfo[]>;
  saveUserTemplate(
    name: string,
    description: string,
    kind: string,
    content: string
  ): Promise<UserTemplateInfo>;
  deleteUserTemplate(id: string): Promise<void>;
}

const desktopApi: TexForgeApi = {
  desktop: true,
  detectEngines: () => invoke<EngineInfo[]>("detect_engines"),
  compileLatex: ({ source, path, engine, customPath }) =>
    invoke<NativeCompileResult>("compile_latex", {
      source,
      path,
      engine,
      customPath,
    }),
  pickOpenFile: () => invoke<string | null>("pick_open_file"),
  pickSaveTexFile: (defaultName) =>
    invoke<string | null>("pick_save_tex_file", { defaultName }),
  pickSavePdfFile: (defaultName) =>
    invoke<string | null>("pick_save_pdf_file", { defaultName }),
  readTextFile: (path) => invoke<string>("read_text_file", { path }),
  writeTextFile: (path, contents) =>
    invoke<void>("write_text_file", { path, contents }),
  writePdfFromB64: (path, b64) =>
    invoke<void>("write_pdf_from_b64", { path, pdfB64: b64 }),
  showInFolder: (path) => invoke<void>("show_in_folder", { path }),
  forceExit: () => invoke<void>("force_exit"),
  getAppInfo: () => invoke<AppInfo>("get_app_info"),
  getRecents: () => invoke<RecentFile[]>("get_recents"),
  pushRecent: (path) => invoke<void>("push_recent", { path }),
  clearRecents: () => invoke<void>("clear_recents"),
  listUserTemplates: () => invoke<UserTemplateInfo[]>("list_user_templates"),
  saveUserTemplate: (name, description, kind, content) =>
    invoke<UserTemplateInfo>("save_user_template", {
      name,
      description,
      kind,
      content,
    }),
  deleteUserTemplate: (id) => invoke<void>("delete_user_template", { id }),
};

export const api: TexForgeApi = isDesktop ? desktopApi : mockApi;
