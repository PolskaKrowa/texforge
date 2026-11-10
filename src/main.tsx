import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadSettings } from "./store";
import "./styles/global.css";

// Apply the persisted theme before the first paint.
document.documentElement.dataset.theme = loadSettings().theme;

createRoot(document.getElementById("root")!).render(<App />);
