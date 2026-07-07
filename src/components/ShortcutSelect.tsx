import { useCallback, useState } from "react";
import { setShortcut } from "../lib/tauri";
import { getShortcutPref, setShortcutPref } from "../state/preferences";
import {
  defaultAccelerator,
  formatAccelerator,
  getAccelerator,
  shortcutPresets,
} from "../state/shortcuts";

/**
 * Estado y lógica compartidos del atajo de dictado (Ajustes y onboarding): un
 * desplegable de combinaciones que se aplica en Rust al momento. Si el registro
 * falla (combinación en uso por otra app), revierte el valor y muestra la causa.
 */
export function useShortcutConfig() {
  const [accel, setAccel] = useState(() => getShortcutPref() || defaultAccelerator());
  const [error, setError] = useState<string | null>(null);

  const change = useCallback(
    async (next: string) => {
      const prev = getAccelerator();
      setAccel(next);
      try {
        await setShortcut(next);
        setShortcutPref(next);
        setError(null);
      } catch (e) {
        setAccel(prev); // revertir al último bueno
        setError(String(e));
      }
    },
    [],
  );

  return { accel, error, setAccel: (v: string) => void change(v) };
}

type SelectProps = {
  value: string;
  onChange: (accelerator: string) => void;
};

export function ShortcutSelect({ value, onChange }: SelectProps) {
  const options = shortcutPresets();
  // Si el valor guardado no está en los presets (p. ej. de una versión
  // anterior), lo mostramos igualmente para no enseñar un valor falso.
  if (!options.includes(value)) options.unshift(value);

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
    </select>
  );
}
