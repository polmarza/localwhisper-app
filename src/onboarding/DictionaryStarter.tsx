import { useState } from "react";
import { IconCheck, IconPlus } from "../components/Icons";
import { useDictionary } from "../hooks/useDictionary";

type Props = {
  onContinue: () => void;
};

// Expresiones de ejemplo. `display` es cómo mostramos el "escribe" (un salto de
// línea real no se ve, así que lo etiquetamos).
const STARTERS: Array<{ term: string; replacement: string; display: string }> = [
  { term: "abro comillas", replacement: "“", display: "“" },
  { term: "cierro comillas", replacement: "”", display: "”" },
  { term: "github punto com", replacement: "github.com", display: "github.com" },
  { term: "arroba gmail", replacement: "@gmail.com", display: "@gmail.com" },
  { term: "nueva línea", replacement: "\n", display: "↵ salto de línea" },
  { term: "punto y aparte", replacement: ".\n", display: "· punto y aparte" },
];

export function DictionaryStarter({ onContinue }: Props) {
  const dict = useDictionary();
  const [added, setAdded] = useState<Set<string>>(new Set());

  const addOne = async (term: string, replacement: string) => {
    if (added.has(term)) return;
    await dict.add(term, replacement, null);
    setAdded((prev) => new Set(prev).add(term));
  };

  const addAll = async () => {
    for (const s of STARTERS) {
      if (!added.has(s.term)) await addOne(s.term, s.replacement);
    }
  };

  return (
    <div
      className="onb-step"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <h1 className="onb-heading serif">Tu diccionario.</h1>
      <p className="onb-sub">
        Enséñale a Local Whisper cómo escribir ciertas palabras o expresiones. Cuando digas algo de
        la izquierda, lo transcribe como la derecha. Añade las que quieras (o edítalas luego en
        Ajustes → Diccionario).
      </p>

      <div className="dict-starter-list">
        {STARTERS.map((s) => {
          const isAdded = added.has(s.term);
          return (
            <div className="dict-starter-row" key={s.term}>
              <div className="dict-starter-pair">
                <span className="dict-starter-term">{s.term}</span>
                <span className="dict-starter-arrow">→</span>
                <span className="dict-starter-repl">{s.display}</span>
              </div>
              <button
                type="button"
                className="dict-starter-add"
                data-added={isAdded}
                disabled={isAdded}
                onClick={() => void addOne(s.term, s.replacement)}
              >
                {isAdded ? <IconCheck size={13} /> : <IconPlus size={13} />}
                {isAdded ? "Añadida" : "Añadir"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="onb-actions" style={{ marginTop: 20 }}>
        <button type="button" className="onb-btn ghost" onClick={() => void addAll()}>
          Añadir todas
        </button>
        <button type="button" className="onb-btn primary" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>
  );
}
