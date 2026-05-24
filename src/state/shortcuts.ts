import { getPlatformName } from "./hardware";

/**
 * Visual representation of the global recording shortcut.
 *
 * We use different combos per platform because the OS-reserved shortcuts
 * differ — what's free on macOS clashes with system functions on
 * Windows/Linux:
 *
 *   - macOS:   ⌥ + Space     (Option+Space, no system conflict)
 *   - Windows: Ctrl+Shift+Space   (Win+Space switches keyboard layout,
 *                                  Alt+Space opens the window control menu)
 *   - Linux:   Ctrl+Shift+Space   (Super+Space typically opens the app
 *                                  launcher in GNOME/KDE)
 *
 * The Rust side picks the matching binding at compile time via cfg flags.
 * If you change one side, keep the other in sync (or the user sees a
 * shortcut here that doesn't actually fire). Eventually this becomes
 * user-configurable from Ajustes → Atajos.
 */

export type ShortcutKey = {
  /** Short display label, e.g. "⌥", "Ctrl", "Espacio". */
  label: string;
  /** Full name for screen readers or longer text. */
  name: string;
};

export type Shortcut = ShortcutKey[];

/** Returns the recording shortcut formatted for the current platform. */
export function getRecordingShortcut(): Shortcut {
  const platform = getPlatformName();
  const space: ShortcutKey = { label: "Espacio", name: "Espacio" };

  if (platform === "Mac") {
    return [{ label: "⌥", name: "Option" }, space];
  }
  // Windows + Linux share the same combo for now.
  return [
    { label: "Ctrl", name: "Control" },
    { label: "Shift", name: "Shift" },
    space,
  ];
}

/** A simple "⌥ + Espacio" / "Alt + Espacio" string for inline text. */
export function formatRecordingShortcut(separator = " + "): string {
  return getRecordingShortcut()
    .map((k) => k.label)
    .join(separator);
}
