// User-facing preferences persisted in localStorage. Kept tiny on purpose —
// each entry has a getter + setter and a default so callers can read it
// synchronously without worrying about whether onboarding has run.

const KEY_AUTOPASTE = "localwhisper.autopaste";
const KEY_STORE_LOCAL = "localwhisper.storeLocal";
const KEY_VAD_STREAMING = "localwhisper.vadStreaming";
const KEY_LANGUAGE = "localwhisper.language";
const KEY_MIC_DEVICE = "localwhisper.micDeviceId";
const KEY_TEXT_SCALE = "localwhisper.textScale";
const KEY_SIDEBAR_WIDTH = "localwhisper.sidebarWidth";

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

export function getTextScale(): number {
  try {
    const raw = localStorage.getItem(KEY_TEXT_SCALE);
    if (!raw) return 1.0;
    const n = parseFloat(raw);
    return VALID_SCALES.has(n) ? n : 1.0;
  } catch {
    return 1.0;
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
