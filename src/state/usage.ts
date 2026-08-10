import { invoke } from "@tauri-apps/api/core";

// Contador de palabras dictadas. Ya NO hay tope: Local Whisper es gratis y la
// transcripción es ilimitada. Mantenemos la cuenta porque alimenta la pantalla
// de Estadísticas y el aviso de apoyo (que solo aparece cuando alguien ya le ha
// sacado partido a la app). Vive en Rust (AppData/usage.json) para que limpiar
// la caché del WebView no lo resetee.

export type UsageState = {
  week_start: string;
  words_used: number;
};

export function getUsageState(): Promise<UsageState> {
  return invoke<UsageState>("usage_get_state");
}

export function addUsageWords(words: number): Promise<UsageState> {
  return invoke<UsageState>("usage_add_words", { words });
}

/** Word count of a transcription. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
