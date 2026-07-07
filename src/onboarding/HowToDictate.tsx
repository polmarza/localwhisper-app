import { Fragment } from "react";
import { IconBolt, IconArrowDn } from "../components/Icons";
import { getRecordingShortcut } from "../state/shortcuts";

type Props = {
  onContinue: () => void;
};

export function HowToDictate({ onContinue }: Props) {
  return (
    <div className="onb-step">
      <h1 className="onb-heading serif">Así se dicta.</h1>
      <p className="onb-sub">Ya tienes el modelo. Dictar es tan simple como esto:</p>

      <div className="ready-card">
        <div className="ready-row">
          <div className="ready-kbd">
            {getRecordingShortcut().map((k, i) => (
              <Fragment key={i}>
                {i > 0 && <span style={{ color: "var(--ink-3)", fontSize: 14 }}>+</span>}
                <kbd>{k.label}</kbd>
              </Fragment>
            ))}
          </div>
          <div>
            <div className="ready-row-title">1 · Pulsa y habla</div>
            <div className="ready-row-sub">
              Desde cualquier app, pulsa tu atajo y empieza a hablar. Vuelve a pulsarlo para parar.
            </div>
          </div>
        </div>
        <div className="ready-row">
          <div className="ready-row-icon">
            <IconArrowDn size={16} />
          </div>
          <div>
            <div className="ready-row-title">2 · El texto se pega solo</div>
            <div className="ready-row-sub">
              Local Whisper transcribe y pega el texto justo donde tengas el cursor. Sin copiar y
              pegar.
            </div>
          </div>
        </div>
        <div className="ready-row">
          <div className="ready-row-icon">
            <IconBolt size={16} />
          </div>
          <div>
            <div className="ready-row-title">3 · Todo en tu equipo</div>
            <div className="ready-row-sub">
              La transcripción ocurre en local, sin conexión. Tu voz nunca sale de tu ordenador.
            </div>
          </div>
        </div>
      </div>

      <div className="onb-actions" style={{ marginTop: 22 }}>
        <button type="button" className="onb-btn primary" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>
  );
}
