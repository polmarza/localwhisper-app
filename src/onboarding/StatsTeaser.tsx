import { IconBolt, IconClock, IconChart } from "../components/Icons";

type Props = {
  onContinue: () => void;
};

const TILES = [
  { icon: IconBolt, value: "0", label: "días de racha", hint: "dicta cada día para mantenerla" },
  { icon: IconClock, value: "—", label: "palabras/min", hint: "tu velocidad media dictando" },
  { icon: IconChart, value: "0", label: "palabras totales", hint: "todo lo que has transcrito" },
];

export function StatsTeaser({ onContinue }: Props) {
  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">Tus estadísticas.</h1>
      <p className="onb-sub">
        A medida que dictes, Local Whisper lleva la cuenta: tu racha de días, tu velocidad y cuánto
        has escrito con la voz. Las verás en la pantalla de Estadísticas.
      </p>

      <div className="stats-teaser-grid">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <div className="stats-teaser-tile" key={t.label}>
              <div className="stats-teaser-icon">
                <Icon size={18} />
              </div>
              <div className="stats-teaser-value serif">{t.value}</div>
              <div className="stats-teaser-label">{t.label}</div>
              <div className="stats-teaser-hint">{t.hint}</div>
            </div>
          );
        })}
      </div>

      <button type="button" className="onb-btn primary" onClick={onContinue} style={{ marginTop: 24 }}>
        Continuar
      </button>
    </div>
  );
}
