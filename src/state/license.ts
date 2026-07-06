import { invoke } from "@tauri-apps/api/core";

// Rust is the source of truth — see src-tauri/src/license.rs. This module is
// just a thin typed wrapper. We never touch localStorage for license data;
// clearing the WebKit cache must not affect the trial counter.

export type LicenseStatus = "trial" | "active" | "expired" | "invalid";

export type LicenseState = {
  first_launch: string;
  machine_id: string;
  key: string | null;
  instance_id: string | null;
  status: LicenseStatus;
  last_validated_at: string | null;
  activation_limit: number | null;
  activation_usage: number | null;
};

export const TRIAL_DAYS = 14;

// Lemon Squeezy checkout URL. Opened in the user's browser when they click
// "Comprar licencia" from any of the activation entry points (banner, modal,
// onboarding, Settings → Licencia).
export const PURCHASE_URL =
  "https://local-whisper.lemonsqueezy.com/checkout/buy/b2ace9f5-c28b-49de-a877-229ff41d481a";

/** Number of days before expiry where we start showing the countdown banner. */
export const COUNTDOWN_THRESHOLD = 4;

/** Re-validate against Lemon Squeezy at most once every N days when active. */
export const REVALIDATE_EVERY_DAYS = 7;

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

export function getLicenseState(): Promise<LicenseState> {
  return invoke<LicenseState>("license_get_state");
}

export function activateLicense(key: string): Promise<LicenseState> {
  return invoke<LicenseState>("license_activate", { key });
}

export function validateLicense(): Promise<LicenseState> {
  return invoke<LicenseState>("license_validate");
}

export function deactivateLicense(): Promise<LicenseState> {
  return invoke<LicenseState>("license_deactivate");
}

// ---------------------------------------------------------------------------
// Derived helpers (pure)
// ---------------------------------------------------------------------------

/** Whole days left in the trial. Negative once expired. */
export function trialDaysLeft(state: LicenseState): number {
  const start = new Date(state.first_launch).getTime();
  const elapsedDays = (Date.now() - start) / 86_400_000;
  return Math.ceil(TRIAL_DAYS - elapsedDays);
}

/**
 * True when the user has access to premium features (Estadísticas + the
 * arena/bosque themes). Recording itself is ALWAYS free and never gated — the
 * license only unlocks the premium extras. During the 14-day trial everyone
 * gets premium; after that it requires an active key.
 */
export function hasPremium(state: LicenseState): boolean {
  if (state.status === "active") return true;
  if (state.status === "trial") return trialDaysLeft(state) > 0;
  return false;
}

/** True if we should nudge the user with a countdown banner during the
 *  *trial* (last few days only). */
export function shouldShowCountdown(state: LicenseState): boolean {
  if (state.status !== "trial") return false;
  const left = trialDaysLeft(state);
  return left > 0 && left <= COUNTDOWN_THRESHOLD;
}

/** True if a persistent banner should appear above the main content. Shown
 *  throughout the entire trial (from day 1) and during expired/invalid
 *  states. Hidden only when the license is active. */
export function shouldShowLicenseBanner(state: LicenseState): boolean {
  return state.status !== "active";
}

/** Whether enough time has passed to silently re-check the key online. */
export function shouldRevalidate(state: LicenseState): boolean {
  if (state.status !== "active") return false;
  if (!state.last_validated_at) return true;
  const last = new Date(state.last_validated_at).getTime();
  const elapsedDays = (Date.now() - last) / 86_400_000;
  return elapsedDays >= REVALIDATE_EVERY_DAYS;
}

/** Mask a key for display, e.g. `ABCD-EF12-...-7890`. */
export function maskKey(key: string): string {
  const compact = key.replace(/\s+/g, "");
  if (compact.length <= 12) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-···-${compact.slice(-4)}`;
}
