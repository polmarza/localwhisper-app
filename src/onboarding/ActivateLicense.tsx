import { useState } from "react";
import { IconCheck, IconDownload } from "../components/Icons";
import { PURCHASE_URL } from "../state/license";
import { openUrl } from "../lib/tauri";

type Props = {
  /** Called with the trimmed key. Should call `activateLicense` and rethrow
   *  any error so we can show it in the UI. Resolves on success — we then
   *  advance to the next onboarding step. */
  onActivate: (key: string) => Promise<void>;
  /** Continue without activating — start the trial. */
  onSkip: () => void;
};

/**
 * Optional onboarding step between "install" and "ready".
 *
 * We offer three paths:
 *   - Paste a key and activate now  → primary CTA
 *   - Buy a license (opens browser) → secondary CTA, user comes back later
 *   - Skip and use the 14-day trial → quiet text link, NOT a button, so we
 *     don't visually compete with the paid path
 */
export function ActivateLicense({ onActivate, onSkip }: Props) {
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!key.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onActivate(key.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
    // On success the parent unmounts this step — no need to setSubmitting(false).
  };

  return (
    <div
      className="onb-step"
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <h1 className="onb-heading serif">Activa tu licencia.</h1>
      <p className="onb-sub">
        Si ya la has comprado, introduce tu clave para activarla.
        <br />
        Si no, puedes empezar con 14 días de prueba.
      </p>

      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 12,
        }}
      >
        <input
          type="text"
          className="mono"
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          style={{
            width: "100%",
            fontSize: 14,
            padding: "12px 14px",
            borderRadius: 9,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            textAlign: "center",
            letterSpacing: "0.04em",
            outline: "none",
            fontFamily: "var(--font-mono)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
          }}
        />

        {error && (
          <p
            style={{
              margin: 0,
              padding: "8px 12px",
              background: "rgba(179, 74, 58, 0.08)",
              border: "1px solid rgba(179, 74, 58, 0.25)",
              borderRadius: 8,
              color: "var(--danger)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="onb-btn ghost"
            onClick={() => void openUrl(PURCHASE_URL)}
            disabled={submitting}
          >
            <IconDownload size={13} />
            Comprar licencia
          </button>
          <button
            type="button"
            className="onb-btn primary"
            onClick={() => void submit()}
            disabled={submitting || key.trim().length === 0}
          >
            <IconCheck size={13} />
            {submitting ? "Activando…" : "Activar"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        disabled={submitting}
        style={{
          marginTop: 28,
          background: "none",
          border: 0,
          color: "var(--ink-3)",
          fontSize: 13,
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 3,
          fontFamily: "var(--font-sans)",
        }}
      >
        Empezar con 14 días de prueba
      </button>
    </div>
  );
}
