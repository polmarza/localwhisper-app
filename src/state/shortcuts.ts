import { getPlatformName } from "./hardware";
import { getShortcut } from "./preferences";

/**
 * Global recording shortcut.
 *
 * Default per platform (chosen to avoid OS-reserved combos):
 *   - macOS:   ⌥ + Space     (Option+Space, no system conflict)
 *   - Windows: Ctrl+Shift+Space   (Win+Space switches keyboard layout,
 *                                  Alt+Space opens the window control menu)
 *   - Linux:   Ctrl+Shift+Space   (Super+Space opens the launcher in GNOME/KDE)
 *
 * The user can override it from Ajustes → Atajos / the onboarding recorder;
 * the chosen accelerator is stored in `localwhisper.shortcut` and re-registered
 * in Rust via `set_shortcut`. Rust registers the default at boot; App.tsx
 * applies the saved override on startup.
 */

export type ShortcutKey = {
  /** Short display label, e.g. "⌥", "Ctrl", "Espacio". */
  label: string;
  /** Full name for screen readers or longer text. */
  name: string;
};

export type Shortcut = ShortcutKey[];

/** Platform default accelerator in Tauri's format. */
export function defaultAccelerator(): string {
  return getPlatformName() === "Mac" ? "Alt+Space" : "Ctrl+Shift+Space";
}

/** The active accelerator: the user's custom one, or the platform default. */
export function getRecordingAccelerator(): string {
  return getShortcut() || defaultAccelerator();
}

/** Maps one accelerator token to its display + accessible name per platform. */
function tokenToKey(token: string): ShortcutKey {
  const isMac = getPlatformName() === "Mac";
  switch (token.toLowerCase()) {
    case "cmdorctrl":
    case "cmd":
    case "command":
      return isMac
        ? { label: "⌘", name: "Command" }
        : { label: "Ctrl", name: "Control" };
    case "ctrl":
    case "control":
      return isMac
        ? { label: "⌃", name: "Control" }
        : { label: "Ctrl", name: "Control" };
    case "alt":
    case "option":
      return isMac
        ? { label: "⌥", name: "Option" }
        : { label: "Alt", name: "Alt" };
    case "shift":
      return isMac
        ? { label: "⇧", name: "Shift" }
        : { label: "Shift", name: "Shift" };
    case "super":
    case "meta":
      return isMac
        ? { label: "⌘", name: "Command" }
        : { label: "Win", name: "Windows" };
    case "space":
      return { label: "Espacio", name: "Espacio" };
    default: {
      // Single letter/number → uppercase; anything else (F5, Enter…) as-is.
      const label = token.length === 1 ? token.toUpperCase() : token;
      return { label, name: label };
    }
  }
}

/** Parses a Tauri accelerator ("Alt+Space") into display keys. */
export function parseAccelerator(accelerator: string): Shortcut {
  return accelerator
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean)
    .map(tokenToKey);
}

/** Returns the recording shortcut formatted for the current platform. */
export function getRecordingShortcut(): Shortcut {
  return parseAccelerator(getRecordingAccelerator());
}

/** A simple "⌥ + Espacio" / "Ctrl + Shift + Espacio" string for inline text. */
export function formatRecordingShortcut(separator = " + "): string {
  return getRecordingShortcut()
    .map((k) => k.label)
    .join(separator);
}
