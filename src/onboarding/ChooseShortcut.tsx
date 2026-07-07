import { ShortcutSelect, useShortcutsConfig } from "../components/ShortcutSelect";

type Props = {
  onContinue: () => void;
};

export function ChooseShortcut({ onContinue }: Props) {
  const shortcuts = useShortcutsConfig();

  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">Tus atajos para dictar.</h1>
      <p className="onb-sub">
        Funcionan desde cualquier app y el texto se pega donde tengas el cursor. Puedes cambiarlos
        cuando quieras en Ajustes → Atajos.
      </p>

      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
          <span className="onb-field-label">Pulsar para dictar</span>
          <ShortcutSelect
            value={shortcuts.toggleAccel}
            onChange={shortcuts.setToggle}
            exclude={shortcuts.holdAccel}
          />
          <span className="onb-field-hint">Un toque para empezar a grabar y otro para terminar.</span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
          <span className="onb-field-label">Mantener pulsado para dictar</span>
          <ShortcutSelect
            value={shortcuts.holdAccel}
            onChange={shortcuts.setHold}
            exclude={shortcuts.toggleAccel}
            allowNone
          />
          <span className="onb-field-hint">
            Dictas mientras lo sostienes; al soltarlo se transcribe. Elige «Ninguno» si no lo
            quieres.
          </span>
        </label>

        {shortcuts.error && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--danger)", textAlign: "left" }}>
            {shortcuts.error}
          </p>
        )}
      </div>

      <button type="button" className="onb-btn primary" onClick={onContinue} style={{ marginTop: 22 }}>
        Continuar
      </button>
    </div>
  );
}
