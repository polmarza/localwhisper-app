import { useCallback, useEffect, useState } from "react";
import { setShortcut as applyShortcut } from "../lib/tauri";
import { setShortcut as saveShortcut } from "../state/preferences";
import { getPlatformName } from "../state/hardware";
import { defaultAccelerator, parseAccelerator } from "../state/shortcuts";

type Props = {
  /** Current accelerator in Tauri format ("Alt+Space", "CmdOrCtrl+Shift+D"). */
  value: string;
  /** Called after the new accelerator is successfully registered + saved. */
  onChange: (accelerator: string) => void;
};

/** Builds a Tauri accelerator string from a keydown event, or null if the
 *  event isn't a valid global-shortcut combo yet (pure modifiers, no strong
 *  modifier, or an unsupported key). */
function acceleratorFromEvent(e: KeyboardEvent): { accel: string } | { error: string } | null {
  const mods: string[] = [];
  if (e.metaKey) mods.push(getPlatformName() === "Mac" ? "Cmd" : "Super");
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");

  const code = e.code;
  // Pure modifier press → keep waiting for the main key.
  if (
    code.startsWith("Meta") ||
    code.startsWith("Control") ||
    code.startsWith("Alt") ||
    code.startsWith("Shift") ||
    code === "OSLeft" ||
    code === "OSRight"
  ) {
    return null;
  }

  let mainKey: string | null = null;
  if (code === "Space") mainKey = "Space";
  else if (/^Key[A-Z]$/.test(code)) mainKey = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) mainKey = code.slice(5);
  else if (/^F([1-9]|1[0-2])$/.test(code)) mainKey = code;
  else if (code === "Enter" || code === "Return") mainKey = "Enter";
  else if (code === "Backslash") mainKey = "Backslash";
  else if (code === "Period") mainKey = "Period";
  else if (code === "Comma") mainKey = "Comma";

  if (!mainKey) {
    return { error: "Esa tecla no sirve como atajo. Prueba una letra, número o Espacio." };
  }

  // A global shortcut needs a strong modifier — Shift solo no basta.
  const hasStrongMod = e.metaKey || e.ctrlKey || e.altKey;
  if (!hasStrongMod) {
    return { error: "Añade ⌘, Ctrl o ⌥ a la combinación." };
  }

  return { accel: [...mods, mainKey].join("+") };
}

export function ShortcutRecorder({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keys = parseAccelerator(value);
  const isDefault = value === defaultAccelerator();

  const commit = useCallback(
    async (accel: string) => {
      try {
        // Registra en Rust primero: si la combinación está en uso, lanza.
        await applyShortcut(accel);
        saveShortcut(accel);
        onChange(accel);
        setRecording(false);
        setError(null);
      } catch {
        setError("Esa combinación ya está en uso por el sistema u otra app. Prueba otra.");
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        setError(null);
        return;
      }
      const result = acceleratorFromEvent(e);
      if (result === null) return; // esperando la tecla principal
      if ("error" in result) {
        setError(result.error);
        return;
      }
      void commit(result.accel);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, commit]);

  const resetToDefault = () => {
    saveShortcut(""); // borra el override → vuelve al default
    void applyShortcut(defaultAccelerator()).catch(() => {});
    onChange(defaultAccelerator());
    setError(null);
  };

  return (
    <div className="shortcut-recorder">
      <button
        type="button"
        className="shortcut-recorder-slot"
        data-recording={recording}
        onClick={() => {
          setError(null);
          setRecording((r) => !r);
        }}
      >
        {recording ? (
          <span className="shortcut-recorder-hint">Pulsa la combinación… (Esc para cancelar)</span>
        ) : (
          <span className="shortcut-recorder-keys">
            {keys.map((k, i) => (
              <kbd key={i}>{k.label}</kbd>
            ))}
          </span>
        )}
      </button>

      <div className="shortcut-recorder-actions">
        <button
          type="button"
          className="shortcut-recorder-btn"
          onClick={() => {
            setError(null);
            setRecording((r) => !r);
          }}
        >
          {recording ? "Cancelar" : "Cambiar"}
        </button>
        {!isDefault && (
          <button type="button" className="shortcut-recorder-btn ghost" onClick={resetToDefault}>
            Restablecer
          </button>
        )}
      </div>

      {error && <p className="shortcut-recorder-error">{error}</p>}
    </div>
  );
}
