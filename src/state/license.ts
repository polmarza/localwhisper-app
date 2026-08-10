import { invoke } from "@tauri-apps/api/core";

// Rust is the source of truth — see src-tauri/src/license.rs. This module is
// just a thin typed wrapper. We never touch localStorage for license data;
// clearing the WebKit cache must not lose an activated support key.
//
// ⚠️ Local Whisper es GRATIS: la app no bloquea nada. Todo lo que hay aquí es
// el flujo opcional de "apoyar el proyecto" — quien quiera puede comprar una
// licencia de apoyo y activarla para que la app le dé las gracias y deje de
// mostrar el aviso. Los estados "trial"/"expired" los sigue calculando Rust
// pero ya no gobiernan ninguna función.

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

// Sección "Apoyar el proyecto" de la landing. Local Whisper es gratis y sin
// funciones bloqueadas; esto es una aportación voluntaria (café o licencia de
// apoyo). Apuntamos a la web —y no a un checkout fijo de Lemon Squeezy— para
// tener los importes en un único sitio: si cambian, solo se toca la landing,
// sin necesidad de publicar una versión nueva de la app.
export const SUPPORT_URL = "https://localwhisper.app/#apoyar";

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

/**
 * True when the user has activated a support key.
 *
 * Local Whisper es gratis y no tiene NINGUNA función bloqueada: no existe un
 * `hasPremium`. Esto solo sirve para darle las gracias a quien ha apoyado el
 * proyecto (insignia en Ajustes) y para dejar de mostrarle el aviso de apoyo.
 */
export function isSupporter(state: LicenseState): boolean {
  return state.status === "active";
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
