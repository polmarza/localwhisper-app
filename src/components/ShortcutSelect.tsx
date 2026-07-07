import { useCallback, useState } from "react";
import { setShortcuts } from "../lib/tauri";
import {
  getHoldShortcutPref,
  getToggleShortcutPref,
  setHoldShortcutPref,
  setToggleShortcutPref,
} from "../state/preferences";
import {
  SHORTCUT_NONE,
  defaultHoldAccelerator,
  defaultToggleAccelerator,
  formatAccelerator,
  shortcutPresets,
} from "../state/shortcuts";

/**
 * Estado y lógica compartidos de la configuración de atajos (Ajustes y
 * onboarding): dos desplegables —pulsar y mantener— que se aplican en Rust al
 * momento. Si el registro falla (combinación en uso por otra app), se revierte
 * el valor y se muestra la causa.
 */
export function useShortcutsConfig() {
  const [toggleAccel, setToggleAccel] = useState(
    () => getToggleShortcutPref() || defaultToggleAccelerator(),
  );
  const [holdAccel, setHoldAccel] = useState(
    () => getHoldShortcutPref() || defaultHoldAccelerator(),
  );
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (nextToggle: string, nextHold: string) => {
      const prev = { toggle: toggleAccel, hold: holdAccel };
      setToggleAccel(nextToggle);
      setHoldAccel(nextHold);
      try {
        await setShortcuts(
          nextToggle,
          nextHold === SHORTCUT_NONE ? null : nextHold,
        );
        setToggleShortcutPref(nextToggle);
        setHoldShortcutPref(nextHold);
        setError(null);
        return true;
      } catch (e) {
        // Revertimos a la última configuración buena (y la re-aplicamos por si
        // el fallo dejó algo a medio registrar).
        setToggleAccel(prev.toggle);
        setHoldAccel(prev.hold);
        void setShortcuts(
          prev.toggle,
          prev.hold === SHORTCUT_NONE ? null : prev.hold,
        ).catch(() => {});
        setError(String(e));
        return false;
      }
    },
    [toggleAccel, holdAccel],
  );

  return {
    toggleAccel,
    holdAccel,
    error,
    setToggle: (accel: string) => void apply(accel, holdAccel),
    setHold: (accel: string) => void apply(toggleAccel, accel),
  };
}

type SelectProps = {
  value: string;
  onChange: (accelerator: string) => void;
  /** El acelerador elegido en el otro desplegable, para no ofrecerlo aquí. */
  exclude?: string;
  /** Añade la opción "Ninguno" (solo tiene sentido en el push-to-talk). */
  allowNone?: boolean;
};

export function ShortcutSelect({ value, onChange, exclude, allowNone }: SelectProps) {
  const options = shortcutPresets().filter((p) => p !== exclude);
  // Si el valor guardado no está en los presets (p. ej. venía del grabador
  // antiguo), lo mostramos igualmente para no enseñar un valor falso.
  if (value !== SHORTCUT_NONE && !options.includes(value)) options.unshift(value);

  return (
    <select
      className="shortcut-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((accel) => (
        <option key={accel} value={accel}>
          {formatAccelerator(accel)}
        </option>
      ))}
      {allowNone && <option value={SHORTCUT_NONE}>Ninguno</option>}
    </select>
  );
}
