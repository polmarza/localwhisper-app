import { getPlatformName } from "./hardware";
import { getHoldShortcutPref, getToggleShortcutPref } from "./preferences";

/**
 * Atajos globales de grabación. Hay dos, independientes y simultáneos:
 *
 *   - toggle: pulsar para empezar a dictar, pulsar otra vez para parar.
 *   - hold:   mantener pulsado para dictar (push-to-talk); al soltar,
 *             transcribe. Opcional ("Ninguno").
 *
 * Se eligen de una lista curada de combinaciones seguras (desplegable), no de
 * un grabador de teclado — capturar teclas dentro del WebView de macOS resultó
 * poco fiable. Los defaults por plataforma evitan atajos reservados del SO;
 * Rust los registra al arrancar y App.tsx aplica los guardados del usuario.
 * Si cambias un default aquí, cambia también `src-tauri/src/lib.rs`.
 */

export type ShortcutKey = {
  /** Short display label, e.g. "⌥", "Ctrl", "Espacio". */
  label: string;
  /** Full name for screen readers or longer text. */
  name: string;
};

export type Shortcut = ShortcutKey[];

/** Valor especial en la pref de hold: push-to-talk desactivado. */
export const SHORTCUT_NONE = "none";

export function defaultToggleAccelerator(): string {
  return getPlatformName() === "Mac" ? "Alt+Space" : "Ctrl+Shift+Space";
}

export function defaultHoldAccelerator(): string {
  return "Ctrl+Alt+Space";
}

/** Combinaciones ofrecidas en los desplegables, seguras por plataforma
 *  (evitan Cmd+Space/Spotlight, Ctrl+Space/cambio de idioma, Alt+Space en
 *  Windows = menú de ventana, etc.). */
export function shortcutPresets(): string[] {
  if (getPlatformName() === "Mac") {
    return [
      "Alt+Space",
      "Ctrl+Alt+Space",
      "Cmd+Shift+Space",
      "Alt+Z",
      "Ctrl+Alt+D",
      "Cmd+Shift+D",
    ];
  }
  return [
    "Ctrl+Shift+Space",
    "Ctrl+Alt+Space",
    "Ctrl+Alt+Z",
    "Ctrl+Alt+D",
    "Ctrl+Shift+D",
  ];
}

/** Acelerador activo del atajo de pulsar (pref del usuario o default). */
export function getToggleAccelerator(): string {
  return getToggleShortcutPref() || defaultToggleAccelerator();
}

/** Acelerador activo del push-to-talk, o null si está desactivado. */
export function getHoldAccelerator(): string | null {
  const pref = getHoldShortcutPref();
  if (pref === SHORTCUT_NONE) return null;
  return pref || defaultHoldAccelerator();
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

/** "⌥ + Espacio" — etiqueta legible de un acelerador. */
export function formatAccelerator(accelerator: string, separator = " + "): string {
  return parseAccelerator(accelerator)
    .map((k) => k.label)
    .join(separator);
}

/** El atajo principal (toggle) para mostrar en tutoriales y ayuda. */
export function getRecordingShortcut(): Shortcut {
  return parseAccelerator(getToggleAccelerator());
}

/** A simple "⌥ + Espacio" string for inline text (toggle shortcut). */
export function formatRecordingShortcut(separator = " + "): string {
  return getRecordingShortcut()
    .map((k) => k.label)
    .join(separator);
}
