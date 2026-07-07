import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../lib/tauri";
import { getSounds, getVadStreaming } from "../state/preferences";
import { playStartSound, playStopSound } from "../lib/sounds";

// 16 kHz mono f32 — what whisper.cpp expects.
const TARGET_SAMPLE_RATE = 16_000;
const BUFFER_SIZE = 4096;

// VAD streaming is retired for now: it only existed to mask slow transcription,
// which is fixed (Metal on Mac). Chunking hurts quality (whisper mis-detects
// language and drops short segments), so it's disabled and hidden from the UI.
// The implementation is kept below for a possible future revisit (e.g. Windows
// CPU). Flip this to true (and restore the Settings toggle) to re-enable.
const VAD_STREAMING_ENABLED = false;

// --- VAD streaming tunables ------------------------------------------------
// Energy-based voice activity detection. A frame whose RMS is above the
// threshold counts as speech; a run of silence after speech closes a segment,
// which is transcribed while the user keeps talking. Splitting on silence (not
// on a fixed clock) means we never cut a word mid-way.
const VAD_RMS_THRESHOLD = 0.01;
// ~1 s of silence closes a segment. Kept high on purpose: short mid-sentence
// hesitations shouldn't split a segment (each split becomes its own whisper
// call, which whisper punctuates as a standalone sentence — a period at every
// pause). At ~1 s we cut mostly on real end-of-sentence pauses.
const VAD_SILENCE_HANGOVER_MS = 1000;
const VAD_MIN_SEGMENT_MS = 1000; // don't auto-close segments shorter than this
const VAD_MAX_SEGMENT_MS = 20_000; // force-close very long continuous speech

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
  // Whether live (VAD) transcription is allowed — it's a premium feature, so a
  // lapsed user falls back to the classic transcribe-on-stop path even if the
  // pref is still on. Defaults to true.
  streamingAllowed?: boolean;
  onResult: (r: RecorderResult) => void;
  onError?: (err: string) => void;
}) {
  const {
    modelFile,
    language = "auto",
    deviceId = null,
    streamingAllowed = true,
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

  // Latest model/language, mirrored into refs so the streaming worker (created
  // once per recording) always calls the command with current values without
  // needing them in a dependency array.
  const modelFileRef = useRef(modelFile);
  modelFileRef.current = modelFile;
  const languageRef = useRef(language);
  languageRef.current = language;
  const streamingAllowedRef = useRef(streamingAllowed);
  streamingAllowedRef.current = streamingAllowed;

  // --- VAD streaming state (only used when the pref is on) -----------------
  const streamingRef = useRef(false);
  const segRef = useRef<Float32Array[]>([]); // frames of the open segment (input rate)
  const segSamplesRef = useRef(0);
  const segHasSpeechRef = useRef(false);
  const silenceSamplesRef = useRef(0);
  const inputRateRef = useRef(TARGET_SAMPLE_RATE);
  const queueRef = useRef<Float32Array[]>([]); // 16 kHz segments awaiting transcription
  const busyRef = useRef(false);
  const partsRef = useRef<string[]>([]);
  const drainResolversRef = useRef<Array<() => void>>([]);
  // Set at start() when streaming; flushes the last segment and resolves once
  // the whole queue has been transcribed, returning the assembled text.
  const finishStreamingRef = useRef<null | (() => Promise<string>)>(null);

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
        // Voice processing (echo cancellation / noise suppression / AGC) is
        // deliberately OFF. On macOS, holding an always-warm mic *with* voice
        // processing puts the system into "call" mode and ducks all other
        // audio to ~half volume (and keeps the orange mic dot lit). Whisper
        // dictation doesn't need echo cancellation, so we open a plain input
        // instead — this keeps the mic pre-warmed (no re-acquire delay) without
        // the ducking. If dictation quality suffers in noisy rooms we can
        // revisit (e.g. release the mic on idle instead).
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
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

    if (getSounds()) playStartSound();

    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;
    chunksRef.current = [];

    const streaming =
      VAD_STREAMING_ENABLED && getVadStreaming() && streamingAllowedRef.current;
    streamingRef.current = streaming;

    if (streaming) {
      const inputRate = ctx.sampleRate;
      inputRateRef.current = inputRate;
      segRef.current = [];
      segSamplesRef.current = 0;
      segHasSpeechRef.current = false;
      silenceSamplesRef.current = 0;
      queueRef.current = [];
      busyRef.current = false;
      partsRef.current = [];
      drainResolversRef.current = [];

      const minSamples = (VAD_MIN_SEGMENT_MS / 1000) * inputRate;
      const hangoverSamples = (VAD_SILENCE_HANGOVER_MS / 1000) * inputRate;
      const maxSamples = (VAD_MAX_SEGMENT_MS / 1000) * inputRate;

      // Sequential worker: transcribes one queued segment at a time so the
      // assembled text stays in order and we never run two whisper passes at
      // once. Cheap now that the model stays loaded (see lib.rs cache).
      const pump = () => {
        if (busyRef.current) return;
        const next = queueRef.current.shift();
        if (!next) {
          const resolvers = drainResolversRef.current;
          drainResolversRef.current = [];
          resolvers.forEach((r) => r());
          return;
        }
        busyRef.current = true;
        // Feed the tail of what we've transcribed so far as context so whisper
        // continues the same sentence/flow instead of restarting punctuation.
        const prior = partsRef.current.join(" ");
        const prompt = prior ? prior.slice(-200) : undefined;
        transcribeAudio(next, modelFileRef.current, languageRef.current, prompt)
          .then((text) => {
            const t = text.trim();
            if (t) partsRef.current.push(t);
          })
          .catch((err) => {
            onError?.(err instanceof Error ? err.message : String(err));
          })
          .finally(() => {
            busyRef.current = false;
            pump();
          });
      };

      const closeSegment = () => {
        const frames = segRef.current;
        const samples = segSamplesRef.current;
        segRef.current = [];
        segSamplesRef.current = 0;
        segHasSpeechRef.current = false;
        silenceSamplesRef.current = 0;
        if (samples === 0) return; // nothing but trimmed silence
        const merged = new Float32Array(samples);
        let off = 0;
        for (const f of frames) {
          merged.set(f, off);
          off += f.length;
        }
        queueRef.current.push(
          resampleLinear(merged, inputRateRef.current, TARGET_SAMPLE_RATE),
        );
        pump();
      };

      const drain = (): Promise<void> =>
        new Promise((resolve) => {
          if (queueRef.current.length === 0 && !busyRef.current) resolve();
          else drainResolversRef.current.push(resolve);
        });

      finishStreamingRef.current = async () => {
        closeSegment(); // flush the final, still-open segment
        await drain(); // wait for every queued transcription to finish
        return partsRef.current.join(" ").replace(/\s+/g, " ").trim();
      };

      processor.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0);
        const voiced = rms(input) >= VAD_RMS_THRESHOLD;
        // Trim leading silence between utterances: don't start buffering a
        // segment until speech actually begins.
        if (!segHasSpeechRef.current && !voiced) return;
        segRef.current.push(new Float32Array(input));
        segSamplesRef.current += input.length;
        if (voiced) {
          segHasSpeechRef.current = true;
          silenceSamplesRef.current = 0;
        } else {
          silenceSamplesRef.current += input.length;
        }
        const longEnough = segSamplesRef.current >= minSamples;
        const trailingSilence = silenceSamplesRef.current >= hangoverSamples;
        const tooLong = segSamplesRef.current >= maxSamples;
        if ((segHasSpeechRef.current && longEnough && trailingSilence) || tooLong) {
          closeSegment();
        }
      };
    } else {
      finishStreamingRef.current = null;
      processor.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0);
        // Copy — the buffer is reused by the audio thread.
        chunksRef.current.push(new Float32Array(input));
      };
    }

    sourceRef.current.connect(processor);
    processor.connect(ctx.destination);

    startTsRef.current = performance.now();
    setElapsedSec(0);
    tickRef.current = window.setInterval(() => {
      setElapsedSec(Math.floor((performance.now() - startTsRef.current) / 1000));
    }, 250);

    setStatus("recording");
  }, [prime, status, onError]);

  const stop = useCallback(async () => {
    if (status !== "recording") return;
    if (getSounds()) playStopSound();
    const ctx = audioCtxRef.current;
    const chunks = chunksRef.current;
    const startTs = startTsRef.current;
    const wasStreaming = streamingRef.current;
    teardownProcessor();
    setStatus("transcribing");

    try {
      let text: string;
      if (wasStreaming && finishStreamingRef.current) {
        // Most of the audio was already transcribed while recording; here we
        // only flush the tail and wait for the queue to drain.
        text = await finishStreamingRef.current();
      } else {
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
        text = await transcribeAudio(resampled, modelFile, language);
      }

      const durationSec = (performance.now() - startTs) / 1000;
      onResult({ text: text.trim(), durationSec, at: new Date() });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      finishStreamingRef.current = null;
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

/** Root-mean-square amplitude of a frame — cheap voice-activity proxy. */
function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i];
    sum += v * v;
  }
  return Math.sqrt(sum / frame.length);
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
