// User-facing preferences persisted in localStorage. Kept tiny on purpose —
// each entry has a getter + setter and a default so callers can read it
// synchronously without worrying about whether onboarding has run.

const KEY_AUTOPASTE = "localwhisper.autopaste";
const KEY_STORE_LOCAL = "localwhisper.storeLocal";
const KEY_VAD_STREAMING = "localwhisper.vadStreaming";
const KEY_SOUNDS = "localwhisper.sounds";
const KEY_TRANSCRIPT_FONT = "localwhisper.transcriptFont";
const KEY_LANGUAGE = "localwhisper.language";
const KEY_MIC_DEVICE = "localwhisper.micDeviceId";
const KEY_TEXT_SCALE = "localwhisper.textScale";
const KEY_SIDEBAR_WIDTH = "localwhisper.sidebarWidth";
const KEY_USER_NAME = "localwhisper.userName";
const KEY_SHORTCUT_TOGGLE = "localwhisper.shortcutToggle";
const KEY_SHORTCUT_HOLD = "localwhisper.shortcutHold";

function readBool(key: string, defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
  } catch {
    return defaultValue;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore — Tauri WebView always has localStorage available
  }
}

export const getAutopaste = () => readBool(KEY_AUTOPASTE, true);
export const setAutopaste = (v: boolean) => writeBool(KEY_AUTOPASTE, v);

export const getStoreLocal = () => readBool(KEY_STORE_LOCAL, true);
export const setStoreLocal = (v: boolean) => writeBool(KEY_STORE_LOCAL, v);

// Play a short "pop" when recording starts and stops. On by default — it's
// nice audio feedback, and easy to toggle off.
export const getSounds = () => readBool(KEY_SOUNDS, true);
export const setSounds = (v: boolean) => writeBool(KEY_SOUNDS, v);

// Font used to render transcription/history text. "sans" (default) or "mono".
export type TranscriptFont = "sans" | "mono";
export function getTranscriptFont(): TranscriptFont {
  try {
    return localStorage.getItem(KEY_TRANSCRIPT_FONT) === "mono" ? "mono" : "sans";
  } catch {
    return "sans";
  }
}
export function setTranscriptFont(v: TranscriptFont) {
  try {
    localStorage.setItem(KEY_TRANSCRIPT_FONT, v);
  } catch {
    // ignore
  }
}

// VAD streaming: transcribe while the user talks, splitting on silences,
// instead of processing the whole clip after they stop. Off by default —
// it's an optimisation the user opts into. Read fresh at each recording's
// start, so toggling it in Settings takes effect on the next dictation.
export const getVadStreaming = () => readBool(KEY_VAD_STREAMING, false);
export const setVadStreaming = (v: boolean) => writeBool(KEY_VAD_STREAMING, v);

// BCP-47 code ("es", "en", "ca", …) or "auto" to let whisper detect.
// Default "auto" — works out of the box for users who dictate in their
// system language without configuring anything.
export function getLanguage(): string {
  try {
    return localStorage.getItem(KEY_LANGUAGE) ?? "auto";
  } catch {
    return "auto";
  }
}

export function setLanguage(code: string) {
  try {
    localStorage.setItem(KEY_LANGUAGE, code);
  } catch {
    // ignore
  }
}

// Nombre del usuario, capturado en el onboarding. Vacío si aún no lo ha dado
// (los saludos hacen fallback a un texto genérico en vez de un nombre real).
export function getUserName(): string {
  try {
    return (localStorage.getItem(KEY_USER_NAME) ?? "").trim();
  } catch {
    return "";
  }
}

export function setUserName(name: string) {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(KEY_USER_NAME, trimmed);
    else localStorage.removeItem(KEY_USER_NAME);
  } catch {
    // ignore
  }
}

// Los dos atajos globales de grabación, en formato del plugin de Tauri
// ("Alt+Space", "Ctrl+Alt+D", …). Vacío = default de plataforma.
//   - toggle: pulsar para empezar, pulsar otra vez para parar.
//   - hold:   mantener pulsado para dictar (push-to-talk); "none" = desactivado.
export function getToggleShortcutPref(): string {
  try {
    return (localStorage.getItem(KEY_SHORTCUT_TOGGLE) ?? "").trim();
  } catch {
    return "";
  }
}

export function setToggleShortcutPref(accelerator: string) {
  try {
    if (accelerator) localStorage.setItem(KEY_SHORTCUT_TOGGLE, accelerator);
    else localStorage.removeItem(KEY_SHORTCUT_TOGGLE);
  } catch {
    // ignore
  }
}

export function getHoldShortcutPref(): string {
  try {
    return (localStorage.getItem(KEY_SHORTCUT_HOLD) ?? "").trim();
  } catch {
    return "";
  }
}

export function setHoldShortcutPref(acceleratorOrNone: string) {
  try {
    if (acceleratorOrNone) localStorage.setItem(KEY_SHORTCUT_HOLD, acceleratorOrNone);
    else localStorage.removeItem(KEY_SHORTCUT_HOLD);
  } catch {
    // ignore
  }
}

// MediaDeviceInfo.deviceId, or null for the system default.
export function getMicDeviceId(): string | null {
  try {
    const v = localStorage.getItem(KEY_MIC_DEVICE);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setMicDeviceId(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY_MIC_DEVICE, id);
    else localStorage.removeItem(KEY_MIC_DEVICE);
  } catch {
    // ignore
  }
}

// UI text scale — applied via CSS `zoom` on the body, so it scales every
// hardcoded pixel value uniformly without touching component code.
export const TEXT_SCALES: Array<{ value: number; label: string }> = [
  { value: 0.9, label: "Pequeño" },
  { value: 1.0, label: "Normal" },
  { value: 1.15, label: "Grande" },
  { value: 1.3, label: "Muy grande" },
];

const VALID_SCALES = new Set(TEXT_SCALES.map((s) => s.value));

// "Muy grande" by default — the app is a dictation tool people glance at from a
// distance, and the larger scale reads much better out of the box.
const DEFAULT_TEXT_SCALE = 1.3;

export function getTextScale(): number {
  try {
    const raw = localStorage.getItem(KEY_TEXT_SCALE);
    if (!raw) return DEFAULT_TEXT_SCALE;
    const n = parseFloat(raw);
    return VALID_SCALES.has(n) ? n : DEFAULT_TEXT_SCALE;
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function setTextScale(scale: number) {
  try {
    localStorage.setItem(KEY_TEXT_SCALE, String(scale));
  } catch {
    // ignore
  }
}

// Sidebar width — adjustable via a drag handle. Constants are kept here so
// the Sidebar's drag handler and the persisted-value clamp use the same
// bounds.
export const DEFAULT_SIDEBAR_WIDTH = 264;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 420;

export function getSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(KEY_SIDEBAR_WIDTH);
    if (!raw) return DEFAULT_SIDEBAR_WIDTH;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return DEFAULT_SIDEBAR_WIDTH;
    return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, n));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

export function setSidebarWidth(width: number) {
  try {
    localStorage.setItem(KEY_SIDEBAR_WIDTH, String(Math.round(width)));
  } catch {
    // ignore
  }
}
