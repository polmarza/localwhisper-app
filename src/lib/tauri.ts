import { invoke, Channel } from "@tauri-apps/api/core";

export type LocalModel = {
  file_name: string;
  path: string;
  size_bytes: number;
};

export type ProgressEvent =
  | { kind: "started"; total_bytes: number | null }
  | { kind: "progress"; downloaded: number; total_bytes: number | null }
  | { kind: "done" }
  | { kind: "error"; message: string };

export async function transcribeAudio(
  pcm: Float32Array,
  modelFile: string,
  language: string = "es",
  // Optional context (previous text) fed to whisper as its initial prompt —
  // used by VAD streaming to keep segments continuous. Omit for whole-clip.
  prompt?: string
): Promise<string> {
  // The Rust command takes raw bytes — send the underlying buffer reinterpreted
  // as a u8[]. We send through invoke (Tauri serializes Uint8Array efficiently).
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  return invoke<string>("transcribe_audio", {
    pcmBytes: Array.from(bytes),
    modelFile,
    language,
    prompt: prompt ?? null,
  });
}

export async function listLocalModels(): Promise<LocalModel[]> {
  return invoke<LocalModel[]>("list_local_models");
}

export async function downloadWhisperModel(
  fileName: string,
  url: string,
  onProgress: (e: ProgressEvent) => void
): Promise<string> {
  const channel = new Channel<ProgressEvent>();
  channel.onmessage = onProgress;
  return invoke<string>("download_whisper_model", {
    fileName,
    url,
    onProgress: channel,
  });
}

export async function openUrl(url: string): Promise<void> {
  return invoke("open_url", { url });
}

export type PasteOutcome = {
  app: string | null;
  pasted: boolean;
  trusted: boolean;
};

export async function pasteText(text: string): Promise<PasteOutcome> {
  return invoke<PasteOutcome>("paste_text", { text });
}
