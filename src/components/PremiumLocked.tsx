import { Btn } from "./Ui";

/**
 * Full-screen upsell shown in place of a premium screen (e.g. Estadísticas)
 * when the user's trial has lapsed and they have no active license. Recording
 * stays free — this only gates the premium extras.
 */
export function PremiumLocked({
  title,
  blurb,
  onActivate,
}: {
  title: string;
  blurb: string;
  onActivate?: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          fontSize: 24,
        }}
      >
        🔒
      </div>
      <h2
        style={{
          margin: 0,
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-.01em",
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          maxWidth: 380,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--ink-2)",
        }}
      >
        {blurb}
      </p>
      <Btn variant="accent" size="lg" onClick={onActivate} style={{ marginTop: 4 }}>
        Desbloquear con licencia
      </Btn>
    </div>
  );
}
