import { Fragment, useEffect, useState } from "react";
import { getRecordingShortcut, type Shortcut } from "../state/shortcuts";

const SAMPLE_TEXT =
  "Hola Local Whisper, estoy probando el dictado por primera vez.";

type Step = 1 | 2 | 3;

type Props = {
  /** Text captured by the parent when the user dictates during step 2.
   *  When this transitions from null → string, we run the typewriter
   *  animation and enable the "Continuar" button. */
  capturedText: string | null;
  /** Called when entering step 2 — tells the parent to route the next
   *  transcription result to this modal instead of the normal autopaste/
   *  storage pipeline. */
  onArmCapture: () => void;
  /** Called when entering step 3 (or skipping) so the parent can stop
   *  intercepting transcription results. */
  onDisarmCapture: () => void;
  /** Marks the tutorial as completed and closes. */
  onClose: () => void;
};

export function TutorialModal({
  capturedText,
  onArmCapture,
  onDisarmCapture,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>(1);

  const goToStep2 = () => {
    setStep(2);
    onArmCapture();
  };

  const goToStep3 = () => {
    setStep(3);
    onDisarmCapture();
  };

  const skip = () => {
    onDisarmCapture();
    onClose();
  };

  // When the captured text arrives during step 2, we *don't* auto-advance —
  // the user explicitly clicks "Continuar" to ack the magic moment.
  // (Auto-advance would feel rushed; this gives them a beat to read it.)

  return (
    <div className="tut-overlay" role="dialog" aria-modal="true">
      <div className="tut-modal">
        <ProgressDots step={step} />

        {step === 1 && <StepShortcut onNext={goToStep2} />}
        {step === 2 && (
          <StepPractice
            capturedText={capturedText}
            onNext={goToStep3}
          />
        )}
        {step === 3 && <StepDone onFinish={onClose} />}

        {step !== 3 && (
          <button type="button" className="tut-skip" onClick={skip}>
            Saltar tutorial
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress dots (3 steps)
// ---------------------------------------------------------------------------

function ProgressDots({ step }: { step: Step }) {
  return (
    <div className="tut-dots">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="tut-dot"
          data-active={i === step}
          data-done={i < step}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Shortcut explanation
// ---------------------------------------------------------------------------

function StepShortcut({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2 className="tut-title serif">Tu atajo para dictar.</h2>
      <p className="tut-sub">
        Pulsa estas teclas desde cualquier app para empezar a grabar. Pulsa
        otra vez para parar — y el texto se pegará donde tengas el cursor.
      </p>

      <KeyRow shortcut={getRecordingShortcut()} />

      <button type="button" className="onb-btn primary tut-cta" onClick={onNext}>
        Probarlo →
      </button>
    </>
  );
}

/** Renders a row of keys with "+" separators. Used both for the big tutorial
 *  step 1 keys and the smaller inline hint. */
function KeyRow({
  shortcut,
  size = "lg",
}: {
  shortcut: Shortcut;
  size?: "lg" | "sm";
}) {
  const keyClass = size === "sm" ? "tut-key sm" : "tut-key";
  const plusClass = size === "sm" ? "tut-key-plus sm" : "tut-key-plus";
  const wrapClass = size === "sm" ? "tut-hint-keys" : "tut-keys";
  return (
    <div className={wrapClass}>
      {shortcut.map((k, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={plusClass}>+</span>}
          <span className={keyClass}>{k.label}</span>
        </Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Interactive practice
// ---------------------------------------------------------------------------

function StepPractice({
  capturedText,
  onNext,
}: {
  capturedText: string | null;
  onNext: () => void;
}) {
  const [displayed, setDisplayed] = useState("");

  // Typewriter: when a new captured text arrives, type it out letter-by-
  // letter for a satisfying "wow" moment. Skip the animation on subsequent
  // captures during the same step (rare — user records twice).
  useEffect(() => {
    if (capturedText === null) {
      setDisplayed("");
      return;
    }
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(capturedText.slice(0, i));
      if (i >= capturedText.length) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [capturedText]);

  const ready = capturedText !== null && displayed === capturedText;

  return (
    <>
      <h2 className="tut-title serif">Pruébalo ahora.</h2>
      <p className="tut-sub">
        Lee este texto en voz alta. Cuando termines, pulsa de nuevo el atajo
        para parar la grabación.
      </p>

      <div className="tut-prompt">
        <span className="tut-prompt-label">Lee esto:</span>
        <span className="tut-prompt-text serif">«{SAMPLE_TEXT}»</span>
      </div>

      <div className="tut-output">
        {displayed ? (
          <span className="tut-output-text">{displayed}</span>
        ) : (
          <span className="tut-output-placeholder">
            Tu transcripción aparecerá aquí…
          </span>
        )}
        {!displayed && <span className="tut-cursor" aria-hidden />}
      </div>

      <div className="tut-hint">
        <KeyRow shortcut={getRecordingShortcut()} size="sm" />
        <span className="tut-hint-text">para empezar a grabar</span>
      </div>

      <button
        type="button"
        className="onb-btn primary tut-cta"
        onClick={onNext}
        disabled={!ready}
      >
        Continuar →
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Done
// ---------------------------------------------------------------------------

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <AnimatedCheck />
      <h2 className="tut-title serif">¡Ya estás dictando!</h2>
      <p className="tut-sub">
        Lo has hecho. Ya puedes usar Local Whisper en cualquier app — Notas,
        Mail, tu navegador, cualquier sitio donde escribas.
      </p>

      <div className="tut-tip">
        <span className="tut-tip-label">Tip</span>
        <span className="tut-tip-text">
          Selecciona cualquier palabra del historial para añadirla a tu diccionario
          y mejorar futuras transcripciones.
        </span>
      </div>

      <button type="button" className="onb-btn primary tut-cta" onClick={onFinish}>
        Empezar a usar Local Whisper
      </button>
    </>
  );
}

function AnimatedCheck() {
  // Stripe-style draw-in animation: outer circle, then the check itself.
  return (
    <svg
      className="tut-check"
      width="72"
      height="72"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="var(--good)"
        strokeWidth="3"
        strokeDasharray="226"
        strokeDashoffset="226"
        className="tut-check-circle"
      />
      <path
        d="M24 41 L35 52 L56 28"
        stroke="var(--good)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset="60"
        className="tut-check-tick"
      />
    </svg>
  );
}
