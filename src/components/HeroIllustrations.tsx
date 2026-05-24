// Each illustration renders to a fixed-height SVG sized to sit on the right
// side of the hero banner. They share a `currentColor` paint so the parent
// can tint them via the accent variable — the palette one ignores that and
// uses explicit theme swatch colors so the chips actually preview the
// available palettes.

export function WaveformIllustration() {
  // Same sine-modulated bar pattern the original hero used, ported to SVG
  // for consistency with the other banners.
  const COUNT = 42;
  const STEP = 7;
  const bars = Array.from({ length: COUNT }, (_, i) => {
    const a = Math.sin(i * 0.4) * 0.5 + 0.5;
    const b = Math.cos(i * 0.17 + 1.2) * 0.5 + 0.5;
    const h = 8 + (a * 0.4 + b * 0.6) * 78;
    return {
      x: i * STEP,
      h,
      opacity: 0.4 + 0.6 * (i / COUNT),
    };
  });
  const W = (COUNT - 1) * STEP + 3;
  return (
    <svg width={W} height={86} viewBox={`0 0 ${W} 86`} fill="currentColor">
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={(86 - b.h) / 2}
          width={3}
          height={b.h}
          rx={1.5}
          opacity={b.opacity}
        />
      ))}
    </svg>
  );
}

export function PaletteIllustration() {
  // Five rounded "paint chip" rectangles fanned out like a swatch deck.
  // Colors are the accent of each shipped theme so the illustration doubles
  // as a real preview.
  const swatches = [
    { color: "#c0651e", rotate: -14 },
    { color: "#d97757", rotate: -7 },
    { color: "#5b50d9", rotate: 0 },
    { color: "#5fb3d4", rotate: 7 },
    { color: "#4f7d50", rotate: 14 },
  ];
  return (
    <svg width={260} height={140} viewBox="0 0 260 140">
      {swatches.map((s, i) => (
        <g
          key={s.color}
          transform={`translate(${30 + i * 44}, 70) rotate(${s.rotate})`}
        >
          <rect
            x={-20}
            y={-46}
            width={40}
            height={92}
            rx={10}
            fill={s.color}
            opacity={0.95}
          />
        </g>
      ))}
    </svg>
  );
}

export function TypographyIllustration() {
  // Big serif "Aa" centered, with smaller sans + mono ghost versions
  // floating around it. Matches the actual fonts the app uses.
  return (
    <svg width={220} height={140} viewBox="0 0 220 140">
      <text
        x={110}
        y={118}
        textAnchor="middle"
        fontSize={130}
        fontFamily='"Instrument Serif", serif'
        fontStyle="italic"
        fill="currentColor"
      >
        Aa
      </text>
      <text
        x={32}
        y={48}
        fontSize={28}
        fontFamily='"DM Sans", system-ui, sans-serif'
        fontWeight={700}
        fill="currentColor"
        opacity={0.45}
      >
        Aa
      </text>
      <text
        x={158}
        y={48}
        fontSize={28}
        fontFamily='"JetBrains Mono", ui-monospace, monospace'
        fill="currentColor"
        opacity={0.45}
      >
        Aa
      </text>
    </svg>
  );
}

export function ChartIllustration() {
  // Rising bar chart — last bar in full opacity to mimic "this week" vs
  // history, echoing the same visual language Insights uses.
  const heights = [22, 36, 30, 50, 44, 64, 82];
  const W = 18;
  const GAP = 12;
  return (
    <svg
      width={heights.length * (W + GAP) - GAP + 20}
      height={110}
      viewBox={`0 0 ${heights.length * (W + GAP) - GAP + 20} 110`}
      fill="currentColor"
    >
      {heights.map((h, i) => {
        const isLast = i === heights.length - 1;
        return (
          <rect
            key={i}
            x={10 + i * (W + GAP)}
            y={100 - h}
            width={W}
            height={h}
            rx={3}
            opacity={isLast ? 1 : 0.35 + i * 0.07}
          />
        );
      })}
    </svg>
  );
}

export function QuotesIllustration() {
  // Two large serif quotation marks side by side, with a thin connecting
  // line — reads as "we'll fix what's between these quotes".
  return (
    <svg width={240} height={140} viewBox="0 0 240 140" fill="currentColor">
      <text
        x={20}
        y={115}
        fontSize={150}
        fontFamily='"Instrument Serif", serif'
        opacity={0.95}
      >
        “
      </text>
      <text
        x={140}
        y={115}
        fontSize={150}
        fontFamily='"Instrument Serif", serif'
        opacity={0.95}
      >
        ”
      </text>
      <line
        x1={70}
        y1={86}
        x2={150}
        y2={86}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}
