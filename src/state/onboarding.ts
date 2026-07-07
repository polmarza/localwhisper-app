import { tierForFile } from "./tiers";

const KEY_DONE = "localwhisper.onboardingCompleted";
const KEY_MODEL = "localwhisper.modelFile";
const KEY_INSTALLED = "localwhisper.installedTiers";
const KEY_TUTORIAL_DONE = "localwhisper.tutorialCompleted";

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(KEY_DONE) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingCompleted() {
  try {
    localStorage.setItem(KEY_DONE, "true");
  } catch {
    // ignore — Tauri WebView always has localStorage available
  }
}

export function getSelectedModelFile(): string | null {
  try {
    return localStorage.getItem(KEY_MODEL);
  } catch {
    return null;
  }
}

export function setSelectedModelFile(fileName: string) {
  try {
    localStorage.setItem(KEY_MODEL, fileName);
  } catch {
    // ignore
  }
}

// Tracks which model tiers have actually been downloaded to disk. The
// onboarding flow only downloads one tier, so we keep the list authoritative
// here. Callers (Settings) use this to decide whether to show "Activar" or
// "Descargar" per row.
export function getInstalledTiers(): string[] {
  try {
    const raw = localStorage.getItem(KEY_INSTALLED);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // fall through to the inference path
  }
  // Migration for users who completed onboarding before we tracked this.
  // Whatever model is currently selected is, by definition, installed.
  const file = getSelectedModelFile();
  const tier = file ? tierForFile(file) : null;
  return tier ? [tier] : [];
}

export function addInstalledTier(tierId: string) {
  const existing = getInstalledTiers();
  if (existing.includes(tierId)) return;
  try {
    localStorage.setItem(
      KEY_INSTALLED,
      JSON.stringify([...existing, tierId]),
    );
  } catch {
    // ignore
  }
}

/** Tracks whether the in-app interactive tutorial (the one that fires after
 *  the install onboarding) has been completed. We never auto-show it again
 *  once true. Users can replay it from Ayuda → "Repetir tutorial". */
export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(KEY_TUTORIAL_DONE) === "true";
  } catch {
    return false;
  }
}

export function markTutorialCompleted() {
  try {
    localStorage.setItem(KEY_TUTORIAL_DONE, "true");
  } catch {
    // ignore
  }
}

export function resetTutorial() {
  try {
    localStorage.removeItem(KEY_TUTORIAL_DONE);
  } catch {
    // ignore
  }
}

/** Fully resets onboarding as if the app had just been installed: clears the
 *  "completed" flag, the selected model and the installed-tiers list. Used by
 *  "Ver la introducción otra vez" in Ajustes — a real reinstall, not just a
 *  replay, since the user explicitly wants to see the whole flow again
 *  (including model selection). */
export function resetOnboarding() {
  try {
    localStorage.removeItem(KEY_DONE);
    localStorage.removeItem(KEY_MODEL);
    localStorage.removeItem(KEY_INSTALLED);
  } catch {
    // ignore
  }
}
