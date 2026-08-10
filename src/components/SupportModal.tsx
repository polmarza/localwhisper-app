import { useState } from "react";
import { SUPPORT_URL } from "../state/license";
import { openUrl } from "../lib/tauri";

type Props = {
  /** Called with the pasted key. Should call `activateLicense` and surface any
   *  error it throws. Resolves once activation succeeds. */
  onActivate: (key: string) => Promise<void>;
  /** Cerrar sin apoyar. Si el modal salió solo (aviso automático), el llamante
   *  marca `supportDismissed` para no volver a preguntar nunca. */
  onClose: () => void;
  /** true cuando lo ha abierto el aviso automático (tras N dictados) en vez de
   *  un clic explícito en Ajustes. Solo cambia el texto del botón de cerrar. */
  auto?: boolean;
};

/**
 * Modal de apoyo voluntario. Local Whisper es gratis y no bloquea nada: esto
 * NO es un muro de pago, solo una petición amable y descartable.
 */
export function SupportModal({ onActivate, onClose, auto = false }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h2 className="license-title serif">¿Te está siendo útil?</h2>
        <p className="license-sub">
          Local Whisper es gratis y lo seguirá siendo: sin límite de palabras y
          sin funciones bloqueadas. Lo mantengo yo solo en mis ratos libres, así
          que si te ahorra tiempo cada día y te apetece echar una mano, se
          agradece un montón. Y si no, úsala igual — para eso la hice.
        </p>

        {showKey ? (
          <>
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
                onClick={() => setShowKey(false)}
                disabled={submitting}
              >
                Volver
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
          </>
        ) : (
          <div className="license-actions">
            <button
              type="button"
              className="onb-btn ghost"
              onClick={() => setShowKey(true)}
            >
              Ya tengo una clave
            </button>
            <button
              type="button"
              className="onb-btn primary"
              onClick={() => void openUrl(SUPPORT_URL)}
            >
              Apoyar el proyecto
            </button>
          </div>
        )}

        <button
          type="button"
          className="license-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Cerrar"
        >
          {auto ? "No, gracias — no volver a preguntar" : "Cerrar"}
        </button>
      </div>
    </div>
  );
}
