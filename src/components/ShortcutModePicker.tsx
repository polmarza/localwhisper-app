import { getShortcutMode, setShortcutMode, type ShortcutMode } from "../state/preferences";
import { useState } from "react";

type Props = {
  /** Callback opcional tras persistir el cambio. */
  onModeChange?: (mode: ShortcutMode) => void;
};

const OPTIONS: Array<{ id: ShortcutMode; label: string; hint: string }> = [
  {
    id: "toggle",
    label: "Pulsar",
    hint: "Un toque para empezar a dictar y otro para terminar.",
  },
  {
    id: "hold",
    label: "Mantener pulsado",
    hint: "Dicta mientras mantienes el atajo; al soltarlo se transcribe. Un toque rápido también funciona.",
  },
];

/** Selector del comportamiento del atajo (toggle vs push-to-talk). Persiste en
 *  localStorage directamente; App.tsx lo lee en cada pulsación del atajo, así
 *  que el cambio aplica al instante sin recargar. */
export function ShortcutModePicker({ onModeChange }: Props) {
  const [mode, setMode] = useState<ShortcutMode>(() => getShortcutMode());
  const active = OPTIONS.find((o) => o.id === mode) ?? OPTIONS[0];

  const select = (m: ShortcutMode) => {
    setShortcutMode(m);
    setMode(m);
    onModeChange?.(m);
  };

  return (
    <div className="shortcut-mode-picker">
      <div className="shortcut-mode-tabs">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className="shortcut-mode-tab"
            data-active={mode === o.id}
            onClick={() => select(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="shortcut-mode-hint">{active.hint}</p>
    </div>
  );
}
