import { useEffect, useRef } from "react";
import { Btn } from "./Ui";

/**
 * Diálogo de confirmación propio.
 *
 * Existe porque `window.confirm()` no es fiable dentro del webview: en macOS
 * (WKWebView vía wry) no se pinta ningún panel y la llamada devuelve `false`
 * de inmediato, así que el código que esperaba un "aceptar" no se ejecutaba
 * nunca y la acción parecía no hacer nada. Lo mismo vale para `window.alert`.
 *
 * Al ser un componente React normal se comporta igual en las tres
 * plataformas y hereda los estilos de la app.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tiñe de rojo el botón de confirmar para acciones destructivas. */
  danger?: boolean;
  /** Bloquea los botones mientras la acción está en curso. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Foco en el botón de confirmar al abrir, y Esc para cancelar: lo que
  // cualquiera espera de un diálogo, y que el confirm nativo daba gratis.
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => !busy && onCancel()}
    >
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="confirm-title">
          {title}
        </h2>
        {body && <p className="confirm-body">{body}</p>}
        <div className="confirm-actions">
          <Btn variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Btn>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-go${danger ? " confirm-go--danger" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Borrando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
