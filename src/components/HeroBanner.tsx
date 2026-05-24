import type { ComponentType, ReactNode } from "react";
import { IconChevR } from "./Icons";

// Generic hero banner — the shell stays the same (dark card with glow,
// serif title, CTA pill) and each banner instance plugs its own copy and
// illustration. Picking which banner to show happens in lib/banners.tsx.
export function HeroBanner({
  badge,
  title,
  subtitle,
  ctaLabel,
  onCta,
  Illustration,
}: {
  badge: string;
  title: ReactNode;
  subtitle: ReactNode;
  ctaLabel: string;
  onCta: () => void;
  Illustration: ComponentType;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--hero-bg)",
        color: "var(--hero-ink)",
        borderRadius: "var(--radius)",
        padding: "28px 32px 30px",
        minHeight: 188,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Soft accent glow on the right half of the card — its color is
          themed via --hero-glow so it matches the active palette. */}
      <div
        style={{
          position: "absolute",
          right: -20,
          top: 0,
          bottom: 0,
          width: 380,
          opacity: 0.35,
          background:
            "radial-gradient(60% 80% at 100% 50%, var(--hero-glow), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 32,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--accent)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      >
        <Illustration />
      </div>

      <div style={{ position: "relative", maxWidth: 460 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 18,
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="live-dot"
            style={{ boxShadow: "0 0 0 2px rgba(79,125,80,.25)" }}
          />
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {badge}
          </span>
        </div>
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: 38,
            lineHeight: 1.05,
            letterSpacing: "-.015em",
            fontWeight: 400,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "12px 0 20px",
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "rgba(245,239,224,.72)",
            maxWidth: 380,
          }}
        >
          {subtitle}
        </p>
        <button
          onClick={onCta}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--hero-ink)",
            color: "var(--hero-bg)",
            border: 0,
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {ctaLabel} <IconChevR size={14} />
        </button>
      </div>
    </div>
  );
}
