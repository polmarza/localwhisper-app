import { useState } from "react";
import type { ReactNode } from "react";
import { IconPlus, IconSearch } from "../components/Icons";
import { Btn, Card, Kbd, Pill, inputStyle } from "../components/Ui";

type DictEntry = {
  id: number;
  term: string;
  replacement: string;
  notes: string;
  category: string;
  uses: number;
};

const DICT_ENTRIES: DictEntry[] = [
  { id: 1, term: "Anthropic", replacement: "Anthropic", notes: "Empresa", category: "Marcas", uses: 142 },
  { id: 2, term: "wisper", replacement: "Local Whisper", notes: "Producto", category: "Marcas", uses: 86 },
  { id: 3, term: "pol gerart", replacement: "Pol Gerard", notes: "Mi nombre", category: "Personas", uses: 73 },
  { id: 4, term: "mer", replacement: "Mer Vidal", notes: "Diseñadora del equipo", category: "Personas", uses: 51 },
  { id: 5, term: "cer si es", replacement: "que sí, es", notes: "Frase frecuente", category: "Expresiones", uses: 38 },
  { id: 6, term: "OKR", replacement: "OKR", notes: "Acrónimo", category: "Acrónimos", uses: 34 },
  { id: 7, term: "SLA", replacement: "SLA", notes: "Acrónimo", category: "Acrónimos", uses: 27 },
  { id: 8, term: "nubi", replacement: "NUBI", notes: "Producto interno", category: "Marcas", uses: 24 },
  { id: 9, term: "roadmaping", replacement: "roadmapping", notes: "Ortografía", category: "Expresiones", uses: 21 },
  { id: 10, term: "sebastian gomara", replacement: "Sebastián Gómara", notes: "CTO", category: "Personas", uses: 19 },
  { id: 11, term: "a be testing", replacement: "A/B testing", notes: "Término técnico", category: "Expresiones", uses: 17 },
  { id: 12, term: "figma", replacement: "Figma", notes: "Herramienta", category: "Marcas", uses: 16 },
];

const CATEGORIES = ["Todos", "Personas", "Marcas", "Acrónimos", "Expresiones"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: "var(--ink-2)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function DictionaryScreen() {
  const [cat, setCat] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(2);

  const filtered = DICT_ENTRIES.filter(
    (e) =>
      (cat === "Todos" || e.category === cat) &&
      (!query ||
        e.term.toLowerCase().includes(query.toLowerCase()) ||
        e.replacement.toLowerCase().includes(query.toLowerCase()))
  );
  const sel = DICT_ENTRIES.find((e) => e.id === selected);

  return (
    <div
      style={{
        padding: "24px 28px 40px",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-.015em",
              color: "var(--ink)",
            }}
          >
            Diccionario
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}
          >
            Enseña a Local Whisper cómo escribir nombres propios, marcas y
            expresiones.
            <span style={{ marginLeft: 6, color: "var(--ink-3)" }}>
              {DICT_ENTRIES.length} entradas · sincronizadas localmente
            </span>
          </p>
        </div>
        <Btn variant="primary" icon={<IconPlus size={14} />} size="md">
          Añadir entrada
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "0 10px 0 12px",
            height: 36,
          }}
        >
          <IconSearch size={15} style={{ color: "var(--ink-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar término o reemplazo…"
            style={{
              flex: 1,
              height: "100%",
              border: 0,
              outline: 0,
              background: "transparent",
              fontSize: 13.5,
              color: "var(--ink)",
            }}
          />
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
        <div
          style={{
            display: "inline-flex",
            padding: 2,
            background: "var(--sidebar-2)",
            borderRadius: 8,
            height: 36,
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: "0 12px",
                fontSize: 12.5,
                fontWeight: 500,
                border: 0,
                borderRadius: 6,
                background: cat === c ? "var(--surface)" : "transparent",
                color: cat === c ? "var(--ink)" : "var(--ink-2)",
                boxShadow:
                  cat === c ? "0 1px 2px rgba(0,0,0,.06)" : "none",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 340px",
          gap: 18,
        }}
      >
        <Card
          padding={0}
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.4fr 1fr 80px",
              padding: "12px 18px",
              borderBottom: "1px solid var(--line)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            <span>Cuando oigas</span>
            <span>Escribe</span>
            <span>Categoría</span>
            <span style={{ textAlign: "right" }}>Usos</span>
          </div>
          <div className="scroll" style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.4fr 1fr 80px",
                  padding: "13px 18px",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid var(--line-2)",
                  background:
                    selected === e.id ? "var(--accent-soft)" : "transparent",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 12.5, color: "var(--ink-2)" }}
                >
                  {e.term}
                </span>
                <span style={{ fontWeight: 500 }}>{e.replacement}</span>
                <span>
                  <Pill>{e.category}</Pill>
                </span>
                <span
                  style={{
                    textAlign: "right",
                    color: "var(--ink-3)",
                    fontSize: 12.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {e.uses}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                No hay entradas que coincidan
              </div>
            )}
          </div>
        </Card>

        <Card padding={22}>
          <div
            style={{
              marginBottom: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".10em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            Editar entrada
          </div>
          <div
            className="serif"
            style={{
              fontSize: 26,
              color: "var(--ink)",
              marginBottom: 22,
              letterSpacing: "-.015em",
            }}
          >
            {sel?.replacement}
          </div>

          <Field label="Cuando oigas">
            <input
              className="mono"
              defaultValue={sel?.term}
              style={inputStyle()}
            />
          </Field>
          <Field label="Escribe">
            <input defaultValue={sel?.replacement} style={inputStyle()} />
          </Field>
          <Field label="Categoría">
            <select defaultValue={sel?.category} style={inputStyle()}>
              {CATEGORIES.filter((c) => c !== "Todos").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Notas">
            <textarea
              defaultValue={sel?.notes}
              rows={3}
              style={{
                ...inputStyle(),
                height: "auto",
                padding: "8px 10px",
                resize: "vertical",
              }}
            />
          </Field>

          <div
            style={{
              margin: "6px 0 18px",
              padding: 12,
              background: "var(--bg)",
              borderRadius: 8,
              border: "1px solid var(--line-2)",
              fontSize: 12.5,
              color: "var(--ink-2)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginBottom: 6,
              }}
            >
              Vista previa
            </div>
            <div>
              <span className="mono" style={{ color: "var(--ink-3)" }}>
                «{sel?.term}»
              </span>
              <span style={{ margin: "0 8px", color: "var(--ink-3)" }}>→</span>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                {sel?.replacement}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              style={{
                border: 0,
                background: "transparent",
                color: "var(--danger)",
                fontSize: 13,
                fontWeight: 500,
                padding: "6px 0",
              }}
            >
              Eliminar
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="md">
                Cancelar
              </Btn>
              <Btn variant="primary" size="md">
                Guardar
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
