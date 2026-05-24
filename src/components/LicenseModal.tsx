import { useState } from "react";
import { PURCHASE_URL, type LicenseState } from "../state/license";
import { openUrl } from "../lib/tauri";

type Props = {
  /** Current license state — used to choose the modal headline. */
  state: LicenseState;
  /** Called with the pasted key. Should call `activateLicense` and surface
   *  any error message it throws. Resolves once activation succeeds. */
  onActivate: (key: string) => Promise<void>;
  /** Close the modal. Always available — the user can dismiss and continue
   *  using the parts of the app that don't require an active license
   *  (history, settings, export…). Recording stays blocked until they
   *  enter a valid key. */
  onClose: () => void;
};

export function LicenseModal({ state, onActivate, onClose }: Props) {
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headline =
    state.status === "invalid"
      ? "Tu licencia ya no es válida."
      : state.status === "expired"
        ? "El periodo de prueba ha terminado."
        : "Activar tu licencia.";
  const subline =
    state.status === "expired" || state.status === "invalid"
      ? "Introduce tu clave de licencia o adquiere una para volver a grabar."
      : "Pega la clave que recibiste por email tras la compra.";

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onActivate(key.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="license-overlay">
      <div className="license-modal" role="dialog" aria-modal="true">
        <h2 className="license-title serif">{headline}</h2>
        <p className="license-sub">{subline}</p>

        <input
          type="text"
          className="license-input mono"
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
        />

        {error && <p className="license-error">{error}</p>}

        <div className="license-actions">
          <button
            type="button"
            className="onb-btn ghost"
            onClick={() => void openUrl(PURCHASE_URL)}
            disabled={submitting}
          >
            Comprar licencia
          </button>
          <button
            type="button"
            className="onb-btn primary"
            onClick={() => void submit()}
            disabled={submitting || key.trim().length === 0}
          >
            {submitting ? "Activando…" : "Activar"}
          </button>
        </div>

        <button
          type="button"
          className="license-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Cerrar"
        >
          Más tarde
        </button>
      </div>
    </div>
  );
}
