import { getPlatformName } from "./hardware";

/**
 * Visual representation of the global recording shortcut.
 *
 * We use the modifier key that sits in the same physical position across
 * platforms — second key to the left of Space:
 *   - macOS: Option (⌥)
 *   - Windows: Win
 *   - Linux: Super (same physical key as Windows' Win key)
 *
 * The Rust side currently registers `Alt+Space` (works fine on macOS where
 * Alt = Option). When we ship Windows/Linux builds we'll switch the binding
 * to `Super+Space` and update this helper accordingly. The labels below
 * already show the intended final binding.
 */

export type ShortcutKey = {
  /** Short display label, e.g. "⌥", "Win", "Espacio". */
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
  if (platform === "Windows") {
    return [{ label: "Win", name: "Windows" }, space];
  }
  // Linux: the same physical key is conventionally called "Super".
  return [{ label: "Super", name: "Super" }, space];
}

/** A simple "⌥ + Espacio" / "Alt + Espacio" string for inline text. */
export function formatRecordingShortcut(separator = " + "): string {
  return getRecordingShortcut()
    .map((k) => k.label)
    .join(separator);
}
