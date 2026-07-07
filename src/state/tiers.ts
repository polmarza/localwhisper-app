import { getPlatformName, type Hardware } from "./hardware";

export type TierId = "small" | "medium" | "large";

export type Tier = {
  id: TierId;
  label: string;
  blurb: string;
  fileName: string;
  url: string;
  sizeGb: number;
  speed: number;
  precision: number;
};

const MODEL_BASE = "https://downloads.localwhisper.app";

export const TIERS: readonly Tier[] = [
  {
    id: "small",
    label: "Ligero",
    blurb: "Funciona en cualquier equipo.",
    fileName: "ggml-small-q5_1.bin",
    url: `${MODEL_BASE}/ggml-small-q5_1.bin`,
    sizeGb: 0.177,
    speed: 95,
    precision: 70,
  },
  {
    id: "medium",
    label: "Equilibrado",
    blurb: "Para equipos con 8 GB de RAM o más.",
    fileName: "ggml-large-v3-turbo-q5_0.bin",
    url: `${MODEL_BASE}/ggml-large-v3-turbo-q5_0.bin`,
    sizeGb: 0.535,
    speed: 70,
    precision: 85,
  },
  {
    id: "large",
    label: "Máximo",
    blurb: "Recomendado en Apple Silicon con 16 GB o más.",
    fileName: "ggml-large-v3-turbo-q8_0.bin",
    url: `${MODEL_BASE}/ggml-large-v3-turbo-q8_0.bin`,
    sizeGb: 0.834,
    speed: 45,
    precision: 95,
  },
];

export function findTier(id: TierId): Tier {
  const t = TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier ${id}`);
  return t;
}

export function tierForFile(fileName: string): TierId | null {
  return TIERS.find((t) => t.fileName === fileName)?.id ?? null;
}

export function recommendTier(hw: Hardware): TierId {
  // Windows/Linux transcriben en CPU (sin Metal), así que los modelos grandes
  // van lentos — recomendamos Ligero por defecto en esas plataformas.
  if (getPlatformName() !== "Mac") return "small";
  // Equilibrado es el default: large-v3-turbo cuantizado es genuinamente bueno
  // para casi cualquier Mac moderno y 548 MB son asumibles. Solo bajamos a
  // Ligero en equipos flojos (RAM ajustada para la carga del modelo).
  if (hw.total_ram_gb < 8) return "small";
  // Máximo NUNCA se auto-recomienda: es demasiado para el usuario medio y solo
  // aporta un plus marginal de precisión a cambio de bastante velocidad. Queda
  // disponible bajo demanda desde la pantalla de Modelos, no en el onboarding.
  return "medium";
}

export function tierWarning(id: TierId, hw: Hardware): string | null {
  // On Windows/Linux there's no GPU backend yet, so anything above Ligera runs
  // on CPU and is noticeably slower. Let the user install it, but warn.
  if (getPlatformName() !== "Mac" && id !== "small") {
    return "En Windows y Linux la transcripción usa la CPU (todavía sin aceleración por GPU), así que los modelos Equilibrado y Máximo irán bastante más lentos. Para máxima velocidad, elige el Ligero.";
  }
  if (id === "large") {
    if (!hw.is_apple_silicon) {
      return "El modelo Máximo está pensado para Apple Silicon. En tu equipo funcionará, pero la transcripción será notablemente más lenta.";
    }
    if (hw.total_ram_gb < 12) {
      return `El modelo Máximo recomienda 16 GB de RAM y tu equipo tiene ${Math.round(hw.total_ram_gb)} GB. Puedes instalarlo, pero podría ir lento.`;
    }
  }
  if (id === "medium" && hw.total_ram_gb < 6) {
    return `El modelo Equilibrado está pensado para equipos con 8 GB de RAM o más. Con ${Math.round(hw.total_ram_gb)} GB funcionará, pero podría ir lento.`;
  }
  return null;
}
