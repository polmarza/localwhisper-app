import { IconCheck, IconSparkle, IconDownload } from "../components/Icons";
import { type Hardware } from "../state/hardware";
import { TIERS, recommendTier, tierWarning, type TierId } from "../state/tiers";

type Props = {
  hardware: Hardware;
  tier: TierId;
  onTierChange: (id: TierId) => void;
  onInstall: () => void;
};

export function ChooseTier({ hardware, tier, onTierChange, onInstall }: Props) {
  const recommended = recommendTier(hardware);
  const warning = tierWarning(tier, hardware);
  const ramLabel = `${Math.round(hardware.total_ram_gb)} GB`;

  return (
    <div className="onb-step" style={{ alignItems: "center", textAlign: "center" }}>
      <h1 className="onb-heading serif">Modo de instalación</h1>
      <p className="onb-sub">
        Tu equipo tiene <strong>{ramLabel}</strong> de RAM.
      </p>

      <div className="tier-row" style={{ textAlign: "left" }}>
        {TIERS.map((t) => (
          <TierCard
            key={t.id}
            label={t.label}
            blurb={t.blurb}
            size={formatSize(t.sizeGb)}
            speed={t.speed}
            precision={t.precision}
            selected={tier === t.id}
            recommended={recommended === t.id}
            onSelect={() => onTierChange(t.id)}
          />
        ))}
      </div>

      {warning && (
        <div className="hw-warning">
          <IconSparkle size={13} />
          <div>{warning}</div>
        </div>
      )}

      <p className="tier-footnote">* Espacio que ocupa en disco</p>

      <button type="button" className="onb-btn primary" onClick={onInstall} style={{ marginTop: 4 }}>
        <IconDownload size={13} />
        Instalar
      </button>
    </div>
  );
}

type TierCardProps = {
  label: string;
  blurb: string;
  size: string;
  speed: number;
  precision: number;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
};

function TierCard({
  label,
  blurb,
  size,
  speed,
  precision,
  selected,
  recommended,
  onSelect,
}: TierCardProps) {
  return (
    <button
      type="button"
      className="tier-card"
      data-selected={selected}
      onClick={onSelect}
    >
      {selected && (
        <span className="tier-check" aria-label="Seleccionado">
          <IconCheck size={11} />
        </span>
      )}
      {recommended && !selected && (
        <span className="tier-rec">
          <IconSparkle size={9} />
          Recomendado
        </span>
      )}
      <div className="tier-name serif">{label}</div>
      <p className="tier-blurb">{blurb}</p>

      <div className="tier-stats">
        <StatBar label="Velocidad" value={speed} />
        <StatBar label="Precisión" value={precision} />
      </div>

      <div className="tier-size mono">{size}*</div>
    </button>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="tier-stat">
      <span className="tier-stat-label">{label}</span>
      <div className="tier-stat-track">
        <div className="tier-stat-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatSize(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  return `${gb.toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} GB`;
}
