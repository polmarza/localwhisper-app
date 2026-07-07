import { useCallback, useEffect, useRef, useState } from "react";
import { disableShortcut, setShortcut as applyShortcut } from "../lib/tauri";
import { setShortcut as saveShortcut } from "../state/preferences";
import { getPlatformName } from "../state/hardware";
import { defaultAccelerator, parseAccelerator } from "../state/shortcuts";

type Props = {
  /** Current accelerator in Tauri format ("Alt+Space", "CmdOrCtrl+Shift+D"). */
  value: string;
  /** Called after the new accelerator is successfully registered + saved. */
  onChange: (accelerator: string) => void;
};

/** Modifier labels currently held, in Tauri accelerator vocabulary
 *  ("Cmd"/"Super", "Ctrl", "Alt", "Shift") — read straight from the event's
 *  boolean flags, so it stays correct through keydown AND keyup. */
function modsFromEvent(e: KeyboardEvent): string[] {
  const mods: string[] = [];
  if (e.metaKey) mods.push(getPlatformName() === "Mac" ? "Cmd" : "Super");
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  return mods;
}

/** Builds a Tauri accelerator string from a keydown event, or null if the
 *  event isn't a valid global-shortcut combo yet (pure modifiers, no strong
 *  modifier, or an unsupported key). */
function acceleratorFromEvent(e: KeyboardEvent): { accel: string } | { error: string } | null {
  const mods = modsFromEvent(e);
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
  // "armed" = el atajo anterior ya está desregistrado a nivel de SO, así que
  // las teclas ahora sí llegan como eventos normales a la ventana. Hasta que
  // esto se confirme, no escuchamos — evita perder la primera pulsación.
  const [armed, setArmed] = useState(false);
  const [liveMods, setLiveMods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const keys = parseAccelerator(value);
  const isDefault = value === defaultAccelerator();

  // Refs para poder restaurar el atajo anterior desde el cleanup del efecto
  // (p. ej. si el usuario cierra Ajustes a media grabación) sin depender de
  // closures obsoletas.
  const valueRef = useRef(value);
  valueRef.current = value;
  const recordingRef = useRef(recording);
  recordingRef.current = recording;

  const commit = useCallback(
    async (accel: string) => {
      console.info("[atajo] registrando:", accel);
      try {
        // El atajo anterior ya está desregistrado (disableShortcut), así que
        // esto solo tiene que registrar el nuevo.
        await applyShortcut(accel);
        console.info("[atajo] registrado OK:", accel);
        saveShortcut(accel);
        onChange(accel);
        setRecording(false);
        setArmed(false);
        setLiveMods([]);
        setError(null);
      } catch (e) {
        // La combinación choca con otra cosa (SO u otra app). Nos quedamos
        // grabando para que pueda probar otra — el anterior sigue
        // desregistrado hasta que cancele o grabe una válida.
        console.warn("[atajo] fallo al registrar:", e);
        setError(
          `No se pudo registrar esa combinación (${String(e)}). ` +
            "Puede que ya esté en uso por el sistema u otra app — prueba otra.",
        );
        setLiveMods([]);
      }
    },
    [onChange],
  );

  const startRecording = () => {
    setError(null);
    setRecording(true);
    setArmed(false);
    // Libera el atajo activo: si no, pulsar la MISMA combinación que ya
    // tienes nunca llegaría aquí (el SO la intercepta como atajo global
    // antes de que sea un evento de teclado normal).
    void disableShortcut()
      .then(() => {
        console.info("[atajo] grabador armado (atajo anterior liberado)");
        setArmed(true);
      })
      .catch((e) => {
        // Aun si falla (p. ej. binario Rust antiguo sin el comando), armamos
        // igual: se puede grabar cualquier combinación menos la que ya está
        // activa (esa la seguirá interceptando el SO).
        console.warn("[atajo] disable_shortcut falló, grabando igualmente:", e);
        setArmed(true);
      });
  };

  const cancelRecording = useCallback(() => {
    setRecording(false);
    setArmed(false);
    setLiveMods([]);
    setError(null);
    // Restaura el atajo que había antes de entrar a grabar.
    void applyShortcut(valueRef.current).catch(() => {});
  }, []);

  useEffect(() => {
    if (!recording || !armed) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.info(
        "[atajo] keydown:",
        e.code,
        { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey },
      );
      if (e.key === "Escape") {
        cancelRecording();
        return;
      }
      const result = acceleratorFromEvent(e);
      if (result === null) {
        setLiveMods(modsFromEvent(e)); // modificador puro: feedback en vivo
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      void commit(result.accel);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      setLiveMods(modsFromEvent(e));
    };
    // Si la ventana pierde el foco a media grabación (alt-tab…), no dejamos
    // chips de modificador "pegados" en pantalla.
    const onBlur = () => setLiveMods([]);

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [recording, armed, commit, cancelRecording]);

  // Red de seguridad: si el componente se desmonta a media grabación (p. ej.
  // el usuario cambia de sección en Ajustes), restauramos el atajo anterior
  // para no dejar la app sin atajo funcionando.
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void applyShortcut(valueRef.current).catch(() => {});
      }
    };
  }, []);

  const resetToDefault = () => {
    saveShortcut(""); // borra el override → vuelve al default
    void applyShortcut(defaultAccelerator()).catch(() => {});
    onChange(defaultAccelerator());
    setError(null);
  };

  const liveKeys = parseAccelerator(liveMods.join("+"));

  return (
    <div className="shortcut-recorder">
      <button
        type="button"
        className="shortcut-recorder-slot"
        data-recording={recording}
        onClick={() => (recording ? cancelRecording() : startRecording())}
      >
        {recording ? (
          !armed ? (
            <span className="shortcut-recorder-hint">Preparando…</span>
          ) : liveKeys.length > 0 ? (
            <span className="shortcut-recorder-keys">
              {liveKeys.map((k, i) => (
                <kbd key={i} data-live>
                  {k.label}
                </kbd>
              ))}
            </span>
          ) : (
            <span className="shortcut-recorder-hint">Pulsa la combinación… (Esc para cancelar)</span>
          )
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
          onClick={() => (recording ? cancelRecording() : startRecording())}
        >
          {recording ? "Cancelar" : "Cambiar"}
        </button>
        {!recording && !isDefault && (
          <button type="button" className="shortcut-recorder-btn ghost" onClick={resetToDefault}>
            Restablecer
          </button>
        )}
      </div>

      {error && <p className="shortcut-recorder-error">{error}</p>}
    </div>
  );
}
