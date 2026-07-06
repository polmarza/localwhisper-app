// Theme is applied via `body[data-palette]` where the palette value is the
// combination `${themeId}-${mode}` (e.g. "arena-dark"). Three themes × two
// modes = six palettes, all defined in global.css.

const KEY_THEME = "localwhisper.theme";
const KEY_MODE = "localwhisper.themeMode";

export type ThemeId = "arena" | "pizarra" | "bosque";
export type ThemeMode = "light" | "dark";

export type Theme = {
  id: ThemeId;
  label: string;
  accent: string; // same accent in both modes
  /** Requires an active license / trial. Pizarra is the free default. */
  premium?: boolean;
  preview: {
    light: { bg: string };
    dark: { bg: string };
  };
};

export const THEMES: Theme[] = [
  {
    id: "pizarra",
    label: "Pizarra",
    accent: "#5b50d9",
    preview: {
      light: { bg: "#f4f5f7" },
      dark: { bg: "#14161a" },
    },
  },
  {
    id: "arena",
    label: "Arena",
    accent: "#c0651e",
    premium: true,
    preview: {
      light: { bg: "#fbf8f3" },
      dark: { bg: "#1f1d1a" },
    },
  },
  {
    id: "bosque",
    label: "Bosque",
    accent: "#4f7d50",
    premium: true,
    preview: {
      light: { bg: "#f3f5f0" },
      dark: { bg: "#161a16" },
    },
  },
];

// Pizarra is the only theme available without a license — it's the free
// default. Arena and bosque are premium (unlocked during trial / with a key).
const DEFAULT_THEME: ThemeId = "pizarra";
const DEFAULT_MODE: ThemeMode = "light";

function isValidId(id: string): id is ThemeId {
  return THEMES.some((t) => t.id === id);
}
function isValidMode(m: string): m is ThemeMode {
  return m === "light" || m === "dark";
}

export function getTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(KEY_THEME);
    if (raw && isValidId(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

export function getMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(KEY_MODE);
    if (raw && isValidMode(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_MODE;
}

export function setTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY_THEME, id);
  } catch {
    // ignore
  }
}

export function setMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY_MODE, mode);
  } catch {
    // ignore
  }
}

// Set the data-palette attribute on <body> using the "id-mode" combo.
export function applyTheme(id: ThemeId, mode: ThemeMode) {
  document.body.setAttribute("data-palette", `${id}-${mode}`);
}

export function findTheme(id: ThemeId): Theme {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown theme ${id}`);
  return t;
}

/** True if the theme requires a license (everything except pizarra). */
export function isPremiumTheme(id: ThemeId): boolean {
  return THEMES.find((t) => t.id === id)?.premium === true;
}

/** The free theme non-premium users fall back to. */
export const FREE_THEME: ThemeId = "pizarra";
