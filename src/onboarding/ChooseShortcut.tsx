import { ShortcutSelect, useShortcutConfig } from "../components/ShortcutSelect";

type Props = {
  onContinue: () => void;
};

export function ChooseShortcut({ onContinue }: Props) {
  const shortcut = useShortcutConfig();

  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">Tu atajo para dictar.</h1>
      <p className="onb-sub">
        Púlsalo en cualquier app para empezar a grabar; vuelve a pulsarlo para parar y el texto se
        pega donde tengas el cursor. Podrás cambiarlo en Ajustes → Atajos.
      </p>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <ShortcutSelect value={shortcut.accel} onChange={shortcut.setAccel} />
        {shortcut.error && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--danger)" }}>{shortcut.error}</p>
        )}
      </div>

      <p className="onb-field-hint" style={{ maxWidth: 340, marginTop: 14 }}>
        Consejo: elige una combinación que no uses para otra cosa.
      </p>

      <button type="button" className="onb-btn primary" onClick={onContinue} style={{ marginTop: 20 }}>
        Continuar
      </button>
    </div>
  );
}
