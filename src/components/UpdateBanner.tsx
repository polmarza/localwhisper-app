import type { UpdateState } from "../hooks/useUpdater";

type Props = {
  state: UpdateState;
  onInstall: () => void;
  onRestart: () => void;
  onDismiss: () => void;
};

/**
 * Aviso de actualización, anclado arriba del todo. Solo aparece cuando hay algo
 * accionable (update disponible, descargando o instalada); en el resto de
 * estados no se renderiza para no molestar.
 */
export function UpdateBanner({ state, onInstall, onRestart, onDismiss }: Props) {
  if (state.kind === "available") {
    return (
      <Bar>
        <span>
          <strong>Actualización disponible</strong> — Local Whisper {state.meta.version} ya está
          lista.
        </span>
        <div className="update-banner-actions">
          <button className="update-banner-btn primary" onClick={onInstall}>
            Actualizar ahora
          </button>
          <button className="update-banner-btn ghost" onClick={onDismiss}>
            Ahora no
          </button>
        </div>
      </Bar>
    );
  }

  if (state.kind === "downloading") {
    return (
      <Bar>
        <span>
          Descargando la actualización{state.pct !== null ? ` · ${state.pct} %` : "…"}
        </span>
        <div className="update-banner-progress">
          <div
            className="update-banner-progress-fill"
            style={{ width: state.pct !== null ? `${state.pct}%` : "40%" }}
            data-indeterminate={state.pct === null}
          />
        </div>
      </Bar>
    );
  }

  if (state.kind === "installed") {
    return (
      <Bar>
        <span>
          <strong>Actualización instalada.</strong> Reinicia para usar la versión{" "}
          {state.meta.version}.
        </span>
        <div className="update-banner-actions">
          <button className="update-banner-btn primary" onClick={onRestart}>
            Reiniciar ahora
          </button>
        </div>
      </Bar>
    );
  }

  return null;
}

function Bar({ children }: { children: React.ReactNode }) {
  return <div className="update-banner">{children}</div>;
}
