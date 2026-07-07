import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type UpdateMeta = {
  version: string;
  current_version: string;
  body: string | null;
};

export type UpdateProgress = {
  downloaded: number;
  total: number | null;
};

/** Comprueba (en silencio) si hay una versión nueva en el canal indicado. */
export function checkForUpdate(channel: string): Promise<UpdateMeta | null> {
  return invoke<UpdateMeta | null>("check_for_update", { channel });
}

/** Descarga e instala la actualización. Emite progreso vía `onUpdateProgress`. */
export function installUpdate(channel: string): Promise<void> {
  return invoke("install_update", { channel });
}

/** Reinicia la app para aplicar la actualización instalada. */
export function restartApp(): Promise<void> {
  return invoke("restart_app");
}

export function onUpdateProgress(cb: (p: UpdateProgress) => void): Promise<UnlistenFn> {
  return listen<UpdateProgress>("update-progress", (e) => cb(e.payload));
}
