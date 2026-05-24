import type { ComponentType, ReactNode } from "react";
import type { Screen } from "../App";
import type { SettingsSection } from "../screens/Settings";
import {
  ChartIllustration,
  PaletteIllustration,
  QuotesIllustration,
  TypographyIllustration,
  WaveformIllustration,
} from "../components/HeroIllustrations";
import { formatDurationHm, formatThousands } from "./stats";

export type NavTarget = {
  screen: Screen;
  settingsSection?: SettingsSection;
};

// Everything the banners may need to template their copy. Computed in Home
// from the live data and passed to `pickBanner`.
export type BannerContext = {
  modelTierLabel: string;
  weekWords: number;
  weekTimeSavedMs: number;
  totalTranscriptions: number;
};

export type Banner = {
  id: string;
  badge: string;
  title: ReactNode;
  subtitle: (ctx: BannerContext) => string;
  ctaLabel: string;
  target: NavTarget;
  Illustration: ComponentType;
  // Returns false to hide the banner — e.g. don't pitch Estadísticas when
  // the user has no data yet.
  showWhen: (ctx: BannerContext) => boolean;
};

const italic = (text: string) => (
  <em style={{ fontStyle: "italic" }}>{text}</em>
);

export const BANNERS: Banner[] = [
  {
    id: "privacidad",
    badge: "PRIVADO · EN TU MAC",
    title: <>Tu voz, sin {italic("servidores")}.</>,
    subtitle: (ctx) =>
      `El modelo ${ctx.modelTierLabel} corre en tu dispositivo. Nada de lo que dictas se envía a la nube.`,
    ctaLabel: "Configurar modelo",
    target: { screen: "settings", settingsSection: "model" },
    Illustration: WaveformIllustration,
    showWhen: () => true,
  },
  {
    id: "tema",
    badge: "PERSONALIZA · A TU ESTILO",
    title: <>Hazla {italic("tuya")}.</>,
    subtitle: () =>
      "Cinco paletas claras u oscuras y cuatro tamaños de texto. Cambia el aspecto sin reiniciar la app.",
    ctaLabel: "Elegir tema",
    target: { screen: "settings", settingsSection: "general" },
    Illustration: PaletteIllustration,
    showWhen: () => true,
  },
  {
    id: "tipografias",
    badge: "Aa · LETRAS A TU MEDIDA",
    title: <>Tu {italic("tipo")}grafía favorita.</>,
    subtitle: () =>
      "Sans, serif o monoespaciada. Próximamente podrás elegir cómo se lee tu historial.",
    ctaLabel: "Personalizar interfaz",
    target: { screen: "settings", settingsSection: "general" },
    Illustration: TypographyIllustration,
    showWhen: () => true,
  },
  {
    id: "estadisticas",
    badge: "ESTA SEMANA · TU PROGRESO",
    title: <>Cada minuto {italic("cuenta")}.</>,
    subtitle: (ctx) => {
      const words = formatThousands(ctx.weekWords);
      const saved =
        ctx.weekTimeSavedMs > 0 ? formatDurationHm(ctx.weekTimeSavedMs) : null;
      return saved
        ? `Llevas ${words} palabras esta semana y ${saved} ahorradas frente a teclear. Mira cuándo eres más rápido.`
        : `Llevas ${words} palabras esta semana. Mira cuándo y dónde eres más rápido.`;
    },
    ctaLabel: "Ver estadísticas",
    target: { screen: "insights" },
    Illustration: ChartIllustration,
    // Don't pitch the stats screen if the user has nothing dictated yet —
    // a banner that says "you have 0 words" reads as a bug.
    showWhen: (ctx) => ctx.weekWords > 0,
  },
  {
    id: "diccionario",
    badge: "TUS PALABRAS · BIEN ESCRITAS",
    title: <>Enseña a Local Whisper a {italic("deletrearte")}.</>,
    subtitle: () =>
      "Añade nombres propios, marcas o frases frecuentes. La próxima transcripción ya las escribirá bien.",
    ctaLabel: "Ir al diccionario",
    target: { screen: "dictionary" },
    Illustration: QuotesIllustration,
    showWhen: () => true,
  },
];

// Module-level cache so the banner stays stable across Home re-mounts within
// the same app session. Re-launching the app picks a fresh one.
let cachedBannerId: string | null = null;

export function pickBanner(ctx: BannerContext): Banner {
  if (cachedBannerId) {
    const cached = BANNERS.find((b) => b.id === cachedBannerId);
    if (cached && cached.showWhen(ctx)) return cached;
  }
  const eligible = BANNERS.filter((b) => b.showWhen(ctx));
  const pool = eligible.length > 0 ? eligible : BANNERS;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  cachedBannerId = picked.id;
  return picked;
}
