// Idiomas ofrecidos para la transcripción. "auto" deja que whisper detecte el
// idioma (cuesta algo más por dictado). Compartido entre el onboarding
// (paso "Sobre ti") y Ajustes → Transcripción.
export const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "auto", label: "Automático (detectar)" },
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "ca", label: "Catalán" },
  { code: "pt", label: "Portugués" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
];
