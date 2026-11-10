// pdf.js setup — the worker script is bundled by Vite and served from the
// app's own assets, so the preview works fully offline.

import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
