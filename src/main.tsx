import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { App } from "./App";
import { RecordingOverlay } from "./RecordingOverlay";
import { applyTheme, getMode, getTheme, type ThemeId, type ThemeMode } from "./state/theme";
import "./styles/global.css";

const isOverlay = getCurrentWindow().label === "overlay";

// Apply whatever palette this window's localStorage has cached. The overlay
// may have stale or empty storage on first launch — the main window will
// re-emit `theme-changed` once it mounts, so this is just a best-effort
// initial paint.
applyTheme(getTheme(), getMode());

if (isOverlay) {
  // Inline transparent backgrounds override the `body[data-palette]`
  // selector — the overlay must always be see-through.
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";

  // Listen for theme changes from the main window as early as possible —
  // module init runs before React mounts, so we don't miss the first emit
  // that the main window fires on its own mount.
  void listen<{ id: ThemeId; mode: ThemeMode }>("theme-changed", (event) => {
    applyTheme(event.payload.id, event.payload.mode);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isOverlay ? <RecordingOverlay /> : <App />}
  </React.StrictMode>
);
