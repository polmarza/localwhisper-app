import { useEffect, useRef, useState } from "react";
import { IconCheck } from "../components/Icons";
import { downloadWhisperModel, type ProgressEvent } from "../lib/tauri";
import { findTier, type TierId } from "../state/tiers";

type Status = "starting" | "downloading" | "done" | "error";

type Props = {
  tierId: TierId;
  onDone: () => void;
  onRetry: () => void;
};

export function InstallProgress({ tierId, onDone, onRetry }: Props) {
  const tier = findTier(tierId);
  const catalogBytes = Math.round(tier.sizeGb * 1_073_741_824);

  const [status, setStatus] = useState<Status>("starting");
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // React 19 strict-mode runs mount → cleanup → mount synchronously. Refs
  // survive that cycle, regular `let`s in the closure don't. We use TWO refs:
  //   - `startedRef` prevents starting the download twice (only first mount
  //     actually fires the IPC).
  //   - `cancelledRef` tracks "user really left this step." We reset it on
  //     every mount, so strict mode's fake cleanup (which sets it to true)
  //     gets undone immediately by the second mount — without this, ALL
  //     progress events from the in-flight download were silently dropped.
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (startedRef.current) return;
    startedRef.current = true;

    downloadWhisperModel(tier.fileName, tier.url, (event: ProgressEvent) => {
      if (cancelledRef.current) return;
      switch (event.kind) {
        case "started":
          setStatus("downloading");
          setTotal(event.total_bytes);
          break;
        case "progress":
          setStatus("downloading");
          setDownloaded(event.downloaded);
          if (event.total_bytes) setTotal(event.total_bytes);
          break;
        case "done":
          setStatus("done");
          break;
        case "error":
          setStatus("error");
          setError(event.message);
          break;
      }
    }).then(
      () => {
        if (!cancelledRef.current) setStatus("done");
      },
      (e) => {
        if (cancelledRef.current) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      },
    );

    return () => {
      cancelledRef.current = true;
    };
  }, [tier.fileName, tier.url]);

  const effectiveTotal = total ?? catalogBytes;
  const rawPct =
    effectiveTotal > 0 ? Math.min(100, (downloaded / effectiveTotal) * 100) : 0;
  const pct = status === "done" ? 100 : Math.max(2, Math.round(rawPct));

  return (
    <div
      className="onb-step"
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <h1 className="onb-heading serif">Instalando Local Whisper.</h1>
      <p className="onb-sub">
        Local Whisper nunca sube tus audios a ningún servidor.
        El modelo vive solo en tu equipo.
      </p>

      <div
        className="install-bar"
        data-status={status}
        style={{ width: "100%", maxWidth: 460 }}
      >
        <div className="install-bar-track">
          <div className="install-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="install-bar-label">
          {status === "starting" && "Preparando…"}
          {status === "downloading" && `Instalando · ${pct} %`}
          {status === "done" && "Listo"}
          {status === "error" && "Hubo un problema con la instalación"}
        </div>
      </div>

      {status === "error" && error && (
        <p
          className="install-error"
          style={{ width: "100%", maxWidth: 460, textAlign: "left" }}
        >
          {error}
        </p>
      )}

      {status === "error" ? (
        <button
          type="button"
          className="onb-btn primary"
          onClick={onRetry}
          style={{ marginTop: 18 }}
        >
          Reintentar
        </button>
      ) : (
        <button
          type="button"
          className="onb-btn primary"
          onClick={onDone}
          disabled={status !== "done"}
          style={{ marginTop: 18 }}
        >
          <IconCheck size={13} />
          Continuar
        </button>
      )}
    </div>
  );
}
