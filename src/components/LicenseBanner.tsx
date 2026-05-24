import {
  COUNTDOWN_THRESHOLD,
  PURCHASE_URL,
  trialDaysLeft,
  type LicenseState,
} from "../state/license";
import { openUrl } from "../lib/tauri";

type Props = {
  state: LicenseState;
  onActivate: () => void;
};

type Tone = "info" | "accent" | "danger";

/**
 * Persistent banner above the main content. Three visual tiers based on how
 * urgent the state is — the color reinforces the message:
 *
 *   - info    → trial, plenty of time left   (gris suave, mensaje informativo)
 *   - accent  → trial, last few days          (color de marca, urgencia leve)
 *   - danger  → expired or invalid            (rojo, grabación bloqueada)
 */
export function LicenseBanner({ state, onActivate }: Props) {
  const tone: Tone =
    state.status === "expired" || state.status === "invalid"
      ? "danger"
      : trialDaysLeft(state) <= COUNTDOWN_THRESHOLD
        ? "accent"
        : "info";

  const text = (() => {
    if (state.status === "expired") {
      return "Tu prueba ha terminado. Activa tu licencia para volver a grabar.";
    }
    if (state.status === "invalid") {
      return "Tu licencia ya no es válida. La grabación está bloqueada.";
    }
    const days = Math.max(0, trialDaysLeft(state));
    if (days === 1) return "Te queda 1 día de prueba.";
    if (tone === "info") return `Periodo de prueba: te quedan ${days} días.`;
    return `Te quedan ${days} días de prueba.`;
  })();

  return (
    <div className="trial-banner" data-tone={tone}>
      <span className="trial-banner-text">{text}</span>
      <div className="trial-banner-actions">
        <button
          type="button"
          className="trial-banner-btn ghost"
          onClick={onActivate}
        >
          Ya tengo una clave
        </button>
        <button
          type="button"
          className="trial-banner-btn primary"
          onClick={() => void openUrl(PURCHASE_URL)}
        >
          Comprar licencia
        </button>
      </div>
    </div>
  );
}
