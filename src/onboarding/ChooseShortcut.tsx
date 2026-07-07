import { useState } from "react";
import { ShortcutRecorder } from "../components/ShortcutRecorder";
import { getRecordingAccelerator } from "../state/shortcuts";

type Props = {
  onContinue: () => void;
};

export function ChooseShortcut({ onContinue }: Props) {
  const [accel, setAccel] = useState(() => getRecordingAccelerator());

  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">Tu atajo para dictar.</h1>
      <p className="onb-sub">
        Púlsalo en cualquier app para empezar a grabar; vuelve a pulsarlo para parar y el texto se
        pega donde tengas el cursor. Puedes dejar el que viene o grabar el tuyo.
      </p>

      <div style={{ marginTop: 10 }}>
        <ShortcutRecorder value={accel} onChange={setAccel} />
      </div>

      <p className="onb-field-hint" style={{ maxWidth: 340, marginTop: 14 }}>
        Consejo: elige una combinación que no uses para otra cosa. Si la que grabas ya está ocupada,
        te avisaremos para que pruebes otra.
      </p>

      <button type="button" className="onb-btn primary" onClick={onContinue} style={{ marginTop: 20 }}>
        Continuar
      </button>
    </div>
  );
}
