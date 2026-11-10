import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],

  // The app has no URL routes — disable the dev-server SPA fallback so that
  // missing files return a real 404. The WASM LaTeX engine probes for absent
  // files (main.aux, optional .cfg …) and must see "not found", never the
  // index.html fallback (which it would happily \input as garbage).
  appType: "mpa",

  // Vite options tailored for Tauri development
  //
  // 1. prevent Vite from obscuring Rust errors
  clearScreen: false,
  // 2. Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // 4. Env variables starting with TAURI_ENV_* are exposed to the frontend
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // 5. Tauri's webviews on Windows (WebView2) and Linux (WebKitGTK) support
    //    different modern JS feature sets; target accordingly.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
