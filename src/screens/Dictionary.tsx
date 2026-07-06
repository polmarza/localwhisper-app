import { useState } from "react";
import type { ReactNode } from "react";
import { IconPlus, IconSearch } from "../components/Icons";
import { Btn, Card, inputStyle } from "../components/Ui";
import type { DictionaryEntry } from "../lib/db";

type EditState = {
  id: number | null; // null = new entry
  term: string;
  replacement: string;
  notes: string;
};

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

export function DictionaryScreen({
  entries = [],
  onAdd,
  onUpdate,
  onDelete,
}: {
  entries?: DictionaryEntry[];
  onAdd?: (term: string, replacement: string, notes?: string | null) => Promise<void>;
  onUpdate?: (
    id: number,
    term: string,
    replacement: string,
    notes?: string | null,
  ) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
} = {}) {
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = entries.filter(
    (e) =>
      !query ||
      e.term.toLowerCase().includes(query.toLowerCase()) ||
      e.replacement.toLowerCase().includes(query.toLowerCase()),
  );

  const startNew = () =>
    setEdit({ id: null, term: "", replacement: "", notes: "" });
  const startEdit = (e: DictionaryEntry) =>
    setEdit({
      id: e.id,
      term: e.term,
      replacement: e.replacement,
      notes: e.notes ?? "",
    });

  const canSave = !!edit && edit.term.trim() !== "" && edit.replacement.trim() !== "";

  const save = async () => {
    if (!edit || !canSave || busy) return;
    setBusy(true);
    try {
      const term = edit.term.trim();
      const replacement = edit.replacement.trim();
      const notes = edit.notes.trim() || null;
      if (edit.id === null) {
        await onAdd?.(term, replacement, notes);
      } else {
        await onUpdate?.(edit.id, term, replacement, notes);
      }
      setEdit(null);
    } catch (e) {
      console.error("save dictionary entry failed", e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!edit || edit.id === null || busy) return;
    setBusy(true);
    try {
      await onDelete?.(edit.id);
      setEdit(null);
    } catch (e) {
      console.error("delete dictionary entry failed", e);
    } finally {
      setBusy(false);
    }
  };

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
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>
            Corrige cómo Local Whisper escribe nombres propios, marcas y
            expresiones. Se aplica automáticamente a cada transcripción.
            <span style={{ marginLeft: 6, color: "var(--ink-3)" }}>
              {entries.length}{" "}
              {entries.length === 1 ? "entrada" : "entradas"}
            </span>
          </p>
        </div>
        <Btn variant="primary" icon={<IconPlus size={14} />} size="md" onClick={startNew}>
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
          style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
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
          </div>
          <div className="scroll" style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => startEdit(e)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
                  padding: "13px 18px",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid var(--line-2)",
                  background:
                    edit?.id === e.id ? "var(--accent-soft)" : "transparent",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13.5,
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.term}
                </span>
                <span
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.replacement}
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
                  lineHeight: 1.5,
                }}
              >
                {entries.length === 0 ? (
                  <>
                    Aún no hay entradas. Añade una, o selecciona una palabra en
                    el historial de Inicio para corregirla.
                  </>
                ) : (
                  "No hay entradas que coincidan"
                )}
              </div>
            )}
          </div>
        </Card>

        <Card padding={22}>
          {edit ? (
            <>
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
                {edit.id === null ? "Nueva entrada" : "Editar entrada"}
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 26,
                  color: "var(--ink)",
                  marginBottom: 22,
                  letterSpacing: "-.015em",
                  minHeight: 32,
                }}
              >
                {edit.replacement || "—"}
              </div>

              <Field label="Cuando oigas">
                <input
                  className="mono"
                  value={edit.term}
                  onChange={(ev) => setEdit({ ...edit, term: ev.target.value })}
                  placeholder="lo que se transcribe"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Escribe">
                <input
                  value={edit.replacement}
                  onChange={(ev) =>
                    setEdit({ ...edit, replacement: ev.target.value })
                  }
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      void save();
                    }
                  }}
                  placeholder="cómo debería escribirse"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Notas (opcional)">
                <textarea
                  value={edit.notes}
                  onChange={(ev) => setEdit({ ...edit, notes: ev.target.value })}
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
                    «{edit.term || "…"}»
                  </span>
                  <span style={{ margin: "0 8px", color: "var(--ink-3)" }}>→</span>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                    {edit.replacement || "…"}
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
                {edit.id !== null ? (
                  <button
                    onClick={remove}
                    disabled={busy}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "var(--danger)",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "6px 0",
                      cursor: "pointer",
                    }}
                  >
                    Eliminar
                  </button>
                ) : (
                  <span />
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="md" onClick={() => setEdit(null)}>
                    Cancelar
                  </Btn>
                  <Btn
                    variant="primary"
                    size="md"
                    onClick={save}
                    disabled={!canSave || busy}
                  >
                    Guardar
                  </Btn>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 12,
                color: "var(--ink-3)",
                fontSize: 13,
                lineHeight: 1.5,
                padding: 20,
              }}
            >
              Selecciona una entrada para editarla, o
              <Btn variant="ghost" size="sm" icon={<IconPlus size={13} />} onClick={startNew}>
                Añadir entrada
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
