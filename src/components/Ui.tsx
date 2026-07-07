import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode, MouseEventHandler } from "react";

export function Card({
  children,
  padding = 20,
  style,
  ...rest
}: {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

type PillTone = "neutral" | "accent" | "good" | "solid" | "danger";

export function Pill({
  children,
  tone = "neutral",
  style,
}: {
  children: ReactNode;
  tone?: PillTone;
  style?: CSSProperties;
}) {
  const tones: Record<PillTone, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: "transparent", fg: "var(--ink-2)", bd: "var(--line)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)", bd: "transparent" },
    good: { bg: "rgba(79,125,80,.10)", fg: "var(--good)", bd: "transparent" },
    solid: { bg: "var(--ink)", fg: "var(--bg)", bd: "transparent" },
    danger: { bg: "rgba(179,74,58,.10)", fg: "var(--danger)", bd: "transparent" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 500,
        letterSpacing: ".01em",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "accent" | "ghost" | "quiet";
type BtnSize = "sm" | "md" | "lg";

export function Btn({
  children,
  variant = "primary",
  size = "md",
  icon,
  onClick,
  style,
  type = "button",
  disabled,
  ...rest
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "style" | "type">) {
  const sizes: Record<BtnSize, { h: number; px: number; fs: number; gap: number }> = {
    sm: { h: 28, px: 10, fs: 12.5, gap: 5 },
    md: { h: 34, px: 14, fs: 13, gap: 7 },
    lg: { h: 40, px: 18, fs: 14, gap: 8 },
  };
  const variants: Record<BtnVariant, { bg: string; fg: string; bd: string }> = {
    primary: { bg: "var(--ink)", fg: "var(--bg)", bd: "var(--ink)" },
    accent: { bg: "var(--accent)", fg: "var(--accent-ink)", bd: "var(--accent)" },
    ghost: { bg: "transparent", fg: "var(--ink)", bd: "var(--line)" },
    quiet: { bg: "transparent", fg: "var(--ink-2)", bd: "transparent" },
  };
  const s = sizes[size];
  const v = variants[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: 8,
        border: `1px solid ${v.bd}`,
        background: v.bg,
        color: v.fg,
        fontSize: s.fs,
        fontWeight: 500,
        letterSpacing: "-.005em",
        whiteSpace: "nowrap",
        flexShrink: 0,
        filter: hover && variant === "ghost" ? "brightness(0.97)" : "none",
        opacity:
          disabled
            ? 0.55
            : hover && (variant === "primary" || variant === "accent")
              ? 0.92
              : 1,
        boxShadow:
          variant === "primary" || variant === "accent"
            ? "0 1px 0 rgba(255,255,255,.08) inset, 0 1px 2px rgba(0,0,0,.05)"
            : "none",
        transition: "opacity .15s, filter .15s, background .15s",
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Small "Pro" chip marking a premium feature. Always shown (even in trial) so
 *  users can see what's premium. */
export function ProTag({ style }: { style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        padding: "1px 5px",
        borderRadius: 4,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        lineHeight: 1.5,
        ...style,
      }}
    >
      Pro
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 4px",
        borderRadius: 4,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        fontSize: 11,
        color: "var(--ink-2)",
      }}
    >
      {children}
    </span>
  );
}

export function NavItem({
  icon,
  label,
  active,
  onClick,
  badge,
  indent = false,
  disabled = false,
}: {
  icon?: ReactNode;
  label: ReactNode;
  active?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  badge?: ReactNode;
  indent?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const interactive = !disabled;
  return (
    <button
      onClick={interactive ? onClick : undefined}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: 32,
        padding: `0 10px 0 ${indent ? 22 : 10}px`,
        border: 0,
        background: active
          ? "var(--sidebar-2)"
          : interactive && hover
            ? "rgba(0,0,0,.035)"
            : "transparent",
        borderRadius: 8,
        color: active ? "var(--ink)" : "var(--ink-2)",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-.005em",
        textAlign: "left",
        opacity: disabled ? 0.55 : 1,
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          color: active ? "var(--ink)" : "var(--ink-2)",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{badge}</span>
      )}
    </button>
  );
}

export function Waveform({
  active = true,
  color,
  count = 22,
  height = 28,
}: {
  active?: boolean;
  color?: string;
  count?: number;
  height?: number;
}) {
  const heights = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = Math.sin(i * 1.7) * 0.5 + 0.5;
        const y = Math.cos(i * 0.7 + 1.1) * 0.5 + 0.5;
        return 0.3 + (x * 0.4 + y * 0.6) * 0.7;
      }),
    [count]
  );
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        height,
        color: color || "currentColor",
      }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="wf-bar"
          style={{
            height: `${Math.round(h * height)}px`,
            animationDuration: `${0.9 + (i % 5) * 0.15}s`,
            animationDelay: `${(i % 7) * 0.07}s`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function inputStyle(): CSSProperties {
  return {
    width: "100%",
    height: 34,
    padding: "0 10px",
    border: "1px solid var(--line)",
    borderRadius: 7,
    background: "var(--surface)",
    fontSize: 13.5,
    color: "var(--ink)",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
}
