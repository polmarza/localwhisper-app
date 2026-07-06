import {
  COUNTDOWN_THRESHOLD,
  PURCHASE_URL,
  trialDaysLeft,
  type LicenseState,
} from "../state/license";
import { WEEKLY_WORD_CAP } from "../state/usage";
import { openUrl } from "../lib/tauri";

type Props = {
  state: LicenseState;
  // Free-tier words left this week. Provided only for non-premium users.
  remaining?: number;
  onActivate: () => void;
};

type Tone = "info" | "accent" | "danger";

/**
 * Persistent banner above the main content. Three visual tiers based on how
 * urgent the state is — the color reinforces the message:
 *
 *   - info    → trial, plenty of time left   (gris suave, mensaje informativo)
 *   - accent  → trial ending, or free tier with words left
 *   - danger  → weekly quota exhausted / invalid licence
 */
export function LicenseBanner({ state, remaining, onActivate }: Props) {
  const outOfWords = remaining !== undefined && remaining <= 0;

  const tone: Tone =
    state.status === "invalid" || outOfWords
      ? "danger"
      : state.status === "expired"
        ? "accent"
        : trialDaysLeft(state) <= COUNTDOWN_THRESHOLD
          ? "accent"
          : "info";

  const text = (() => {
    if (state.status === "invalid") {
      return "Tu licencia ya no es válida.";
    }
    if (state.status === "expired") {
      if (remaining !== undefined) {
        return remaining > 0
          ? `Plan gratuito: te quedan ${remaining} de ${WEEKLY_WORD_CAP} palabras esta semana.`
          : `Has agotado tus ${WEEKLY_WORD_CAP} palabras gratis de esta semana. Actívate para dictar sin límite.`;
      }
      return "Tu prueba ha terminado.";
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
