import { Fragment } from "react";
import { IconCheck, IconMic } from "../components/Icons";
import { getRecordingShortcut } from "../state/shortcuts";

type Props = {
  onFinish: () => void;
};

export function Ready({ onFinish }: Props) {
  return (
    <div className="onb-step">
      <h1 className="onb-heading serif">Todo listo.</h1>
      <p className="onb-sub">
        Una última cosa antes de empezar a dictar.
      </p>

      <div className="ready-card">
        <div className="ready-row">
          <div className="ready-kbd">
            {getRecordingShortcut().map((k, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span style={{ color: "var(--ink-3)", fontSize: 14 }}>+</span>
                )}
                <kbd>{k.label}</kbd>
              </Fragment>
            ))}
          </div>
          <div>
            <div className="ready-row-title">Tu atajo para dictar</div>
            <div className="ready-row-sub">
              Pulsa en cualquier app para empezar a grabar. Vuelve a pulsar para
              parar y el texto se copiará al portapapeles.
            </div>
          </div>
        </div>
        <div className="ready-row">
          <div className="ready-row-icon">
            <IconMic size={16} />
          </div>
          <div>
            <div className="ready-row-title">Permiso de micrófono</div>
            <div className="ready-row-sub">
              La primera vez que dictes, macOS pedirá acceso al micrófono.
              Acéptalo y todo seguirá funcionando offline.
            </div>
          </div>
        </div>
      </div>

      <div className="onb-actions" style={{ marginTop: 22 }}>
        <span className="onb-meta">
          Puedes cambiar el modelo y el atajo desde Ajustes.
        </span>
        <button type="button" className="onb-btn primary" onClick={onFinish}>
          <IconCheck size={13} />
          Abrir Local Whisper
        </button>
      </div>
    </div>
  );
}
