import type { Hardware } from "../state/hardware";

type Props = {
  hardware: Hardware | null;
  onContinue: () => void;
};

export function Welcome({ hardware, onContinue }: Props) {
  return (
    <div
      className="onb-step"
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <h1 className="onb-wordmark serif">
        Local Whisper
        <span className="wordmark-dot" />
      </h1>

      <p className="onb-sub">
        Dictado y transcripción 100% en tu equipo.
      </p>

      <button
        type="button"
        className="onb-btn primary"
        onClick={onContinue}
        disabled={!hardware}
        style={{ marginTop: 8 }}
      >
        Empezar
      </button>
    </div>
  );
}
