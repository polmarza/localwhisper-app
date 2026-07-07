import { useState } from "react";
import { getLanguage, getUserName, setLanguage, setUserName } from "../state/preferences";
import { LANGUAGES } from "../state/languages";

type Props = {
  onContinue: () => void;
};

export function AboutYou({ onContinue }: Props) {
  const [name, setName] = useState(() => getUserName());
  const [lang, setLang] = useState(() => getLanguage());

  const submit = () => {
    setUserName(name);
    setLanguage(lang);
    onContinue();
  };

  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">¿Cómo te llamas?</h1>
      <p className="onb-sub">Lo usamos solo para saludarte. Nada sale de tu equipo.</p>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
          <span className="onb-field-label">Tu nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Escribe tu nombre"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className="onb-input"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
          <span className="onb-field-label">Idioma al dictar</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="onb-input">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="onb-field-hint">
            Indícale a Local Whisper en qué idioma hablas. Con “Automático” lo detecta solo, pero
            cuesta un poco más en cada dictado.
          </span>
        </label>
      </div>

      <button type="button" className="onb-btn primary" onClick={submit} style={{ marginTop: 22 }}>
        Continuar
      </button>
    </div>
  );
}
