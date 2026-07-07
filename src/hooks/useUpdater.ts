import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkForUpdate,
  installUpdate,
  onUpdateProgress,
  restartApp,
  type UpdateMeta,
} from "../lib/updater";
import { getUpdateChannel } from "../state/preferences";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; meta: UpdateMeta }
  | { kind: "downloading"; meta: UpdateMeta; pct: number | null }
  | { kind: "installed"; meta: UpdateMeta }
  | { kind: "uptodate" }
  | { kind: "error"; message: string };

/**
 * Gestiona el ciclo de auto-actualización: comprueba en silencio al arrancar y
 * expone acciones para comprobar a mano, instalar y reiniciar. El canal se lee
 * de la preferencia (stable/preview) en cada comprobación.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const stateRef = useRef(state);
  stateRef.current = state;

  // `silent` no pinta "checking" ni "uptodate" (para la comprobación de
  // arranque, que no debe molestar si no hay nada nuevo).
  const check = useCallback(async (silent = false) => {
    if (!silent) setState({ kind: "checking" });
    try {
      const meta = await checkForUpdate(getUpdateChannel());
      if (meta) setState({ kind: "available", meta });
      else if (!silent) setState({ kind: "uptodate" });
      else setState({ kind: "idle" });
    } catch (e) {
      // En arranque, un fallo de red no debe mostrar error; solo lo enseñamos
      // en la comprobación manual.
      if (!silent) setState({ kind: "error", message: String(e) });
    }
  }, []);

  const install = useCallback(async () => {
    const cur = stateRef.current;
    const meta =
      cur.kind === "available" || cur.kind === "downloading" ? cur.meta : null;
    if (!meta) return;
    setState({ kind: "downloading", meta, pct: null });
    try {
      await installUpdate(getUpdateChannel());
      setState({ kind: "installed", meta });
    } catch (e) {
      setState({ kind: "error", message: String(e) });
    }
  }, []);

  const restart = useCallback(() => void restartApp(), []);
  const dismiss = useCallback(() => setState({ kind: "idle" }), []);

  // Progreso de descarga → porcentaje.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onUpdateProgress(({ downloaded, total }) => {
      setState((s) => {
        if (s.kind !== "downloading") return s;
        return { ...s, pct: total ? Math.min(100, Math.round((downloaded / total) * 100)) : null };
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  // Comprobación silenciosa al arrancar.
  useEffect(() => {
    void check(true);
  }, [check]);

  return { state, check, install, restart, dismiss };
}
