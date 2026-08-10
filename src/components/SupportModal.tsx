import { SUPPORT_URL } from "../state/support";
import { openUrl } from "../lib/tauri";

type Props = {
  /** Cerrar sin apoyar. Si el modal salió solo (aviso automático), el llamante
   *  marca `supportDismissed` para no volver a preguntar nunca. */
  onClose: () => void;
  /** true cuando lo ha abierto el aviso automático (tras N dictados) en vez de
   *  un clic explícito en Ajustes. Solo cambia el texto del botón de cerrar. */
  auto?: boolean;
};

/**
 * Petición de apoyo voluntario. Local Whisper es gratis y no bloquea nada:
 * esto NO es un muro de pago, solo una petición amable y descartable.
 */
export function SupportModal({ onClose, auto = false }: Props) {
  return (
    <div className="license-overlay">
      <div className="license-modal" role="dialog" aria-modal="true">
        <h2 className="license-title serif">¿Te está siendo útil?</h2>
        <p className="license-sub">
          Local Whisper es gratis y lo seguirá siendo: sin límite de palabras y
          sin funciones bloqueadas. La desarrollo yo solo en mis ratos libres,
          así que si te ahorra tiempo cada día y te apetece invitarme a un café,
          se agradece un montón. Y si no, úsala igual — para eso la hice.
        </p>

        <div className="license-actions">
          <button
            type="button"
            className="onb-btn primary"
            onClick={() => {
              void openUrl(SUPPORT_URL);
              onClose();
            }}
          >
            ☕ Invitar a un café
          </button>
        </div>

        <button
          type="button"
          className="license-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          {auto ? "No, gracias — no volver a preguntar" : "Cerrar"}
        </button>
      </div>
    </div>
  );
}
