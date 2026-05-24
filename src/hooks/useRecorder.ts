import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/tauri";

// 16 kHz mono f32 — what whisper.cpp expects.
const TARGET_SAMPLE_RATE = 16_000;
const BUFFER_SIZE = 4096;

type Status = "idle" | "preparing" | "recording" | "transcribing";

export type RecorderResult = {
  text: string;
  durationSec: number;
  at: Date;
};

export function useRecorder(opts: {
  modelFile: string;
  language?: string;
  // MediaDeviceInfo.deviceId, or null/undefined to use the system default.
  deviceId?: string | null;
  onResult: (r: RecorderResult) => void;
  onError?: (err: string) => void;
}) {
  const {
    modelFile,
    language = "auto",
    deviceId = null,
    onResult,
    onError,
  } = opts;

  const [status, setStatus] = useState<Status>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);

  // Mic stream + AudioContext + source are PRE-WARMED on mount and kept alive
  // across recordings — this is what eliminates the 1-2 s `getUserMedia`
  // delay at the start of every dictation, the same trick Wispr Flow uses.
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // Processor is created per-recording: we only want audio flowing while the
  // user is actually dictating.
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const primedRef = useRef(false);

  const teardownProcessor = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
  }, []);

  const teardownAll = useCallback(() => {
    teardownProcessor();
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    primedRef.current = false;
  }, [teardownProcessor]);

  // Acquire the mic + audio graph. Idempotent: returns the existing context if
  // it's already primed.
  const prime = useCallback(async (): Promise<AudioContext | null> => {
    if (
      primedRef.current &&
      streamRef.current &&
      audioCtxRef.current &&
      sourceRef.current
    ) {
      return audioCtxRef.current;
    }
    try {
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (deviceId) {
        // exact forces the picked device; the browser errors out if it's gone
        // (e.g. AirPods disconnected), which is the behavior we want — we'd
        // rather surface the error than silently fall back to a different mic.
        audioConstraints.deviceId = { exact: deviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      primedRef.current = true;
      return ctx;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
      teardownAll();
      return null;
    }
  }, [deviceId, onError, teardownAll]);

  // Pre-warm the mic on mount and re-prime whenever the picked device
  // changes — we tear down the current stream/context and acquire the new
  // one. The user pays the getUserMedia cost once per device switch, not on
  // every recording.
  useEffect(() => {
    teardownAll();
    void prime();
    return () => teardownAll();
  }, [prime, teardownAll]);

  const start = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("preparing");

    const ctx = await prime();
    if (!ctx || !sourceRef.current) {
      setStatus("idle");
      return;
    }

    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;
    chunksRef.current = [];

    processor.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0);
      // Copy — the buffer is reused by the audio thread.
      chunksRef.current.push(new Float32Array(input));
    };

    sourceRef.current.connect(processor);
    processor.connect(ctx.destination);

    startTsRef.current = performance.now();
    setElapsedSec(0);
    tickRef.current = window.setInterval(() => {
      setElapsedSec(Math.floor((performance.now() - startTsRef.current) / 1000));
    }, 250);

    setStatus("recording");
  }, [prime, status]);

  const stop = useCallback(async () => {
    if (status !== "recording") return;
    const ctx = audioCtxRef.current;
    const chunks = chunksRef.current;
    const startTs = startTsRef.current;
    teardownProcessor();
    setStatus("transcribing");

    try {
      if (!ctx) throw new Error("Audio context perdido");
      const inputRate = ctx.sampleRate;
      const totalLen = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }

      const resampled = resampleLinear(merged, inputRate, TARGET_SAMPLE_RATE);
      const durationSec = (performance.now() - startTs) / 1000;

      const text = await transcribeAudio(resampled, modelFile, language);
      onResult({ text: text.trim(), durationSec, at: new Date() });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("idle");
      setElapsedSec(0);
    }
  }, [language, modelFile, onError, onResult, status, teardownProcessor]);

  const toggle = useCallback(() => {
    if (status === "recording") void stop();
    else if (status === "idle") void start();
    // Ignore taps during "preparing" / "transcribing" — those are transitional
    // states the user should wait through.
  }, [status, start, stop]);

  return {
    status,
    elapsedSec,
    start,
    stop,
    toggle,
  };
}

function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLen = Math.floor(input.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const srcIdx = i * ratio;
    const idxLow = Math.floor(srcIdx);
    const idxHigh = Math.min(idxLow + 1, input.length - 1);
    const frac = srcIdx - idxLow;
    out[i] = input[idxLow] * (1 - frac) + input[idxHigh] * frac;
  }
  return out;
}

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
