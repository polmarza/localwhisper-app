import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { Card, Kbd } from "../components/Ui";
import { getRecordingShortcut } from "../state/shortcuts";
import { resetTutorial } from "../state/onboarding";
import {
  IconBolt,
  IconChevR,
  IconCheck,
  IconNote,
  IconSparkle,
} from "../components/Icons";
import { openUrl } from "../lib/tauri";

const TALLY_BUG = "https://tally.so/r/9qovLV";
const TALLY_FEATURE = "https://tally.so/r/A7jqK0";
const TALLY_CONTACT = "https://tally.so/r/b568jg";
const SUPPORT_EMAIL = "hola@localwhisper.app";

/**
 * In-app Help screen — distilled version of the public landing.
 * Same copy in spirit but adapted to the app's vocabulary (no marketing-y
 * CTAs, accordions instead of long-form text, links to deeper actions
 * where it makes sense).
 */
export function HelpScreen() {
  return (
    <div
      style={{
        padding: "24px 28px 60px",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 28,
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
          Ayuda
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>
          Cómo sacarle partido a Local Whisper y respuestas a las dudas más
          habituales.
        </p>
      </div>

      <HowItWorks />
      <Privacy />
      <Faq />
      <Support />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: cómo funciona
// ---------------------------------------------------------------------------

function HowItWorks() {
  const replayTutorial = () => {
    resetTutorial();
    // The Dashboard listens for this event and reopens the tutorial without
    // forcing a page reload — feels instant, doesn't lose recorder state.
    window.dispatchEvent(new CustomEvent("replay-tutorial"));
  };

  return (
    <section>
      <SectionTitle eyebrow="Cómo funciona" title="Tres pasos." />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <StepCard
          number={1}
          title="Pulsa el atajo"
          desc="Desde cualquier app, sin cambiar de ventana."
          preview={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              {getRecordingShortcut().map((k, i) => (
                <Fragment key={i}>
                  {i > 0 && <span style={{ color: "var(--ink-3)" }}>+</span>}
                  <Kbd>{k.label}</Kbd>
                </Fragment>
              ))}
            </div>
          }
        />
        <StepCard
          number={2}
          title="Habla con naturalidad"
          desc="Una pastilla flotante te indica que estás grabando."
          preview={<RecordingPillMini />}
        />
        <StepCard
          number={3}
          title="El texto aparece solo"
          desc="Se transcribe en tu ordenador y se pega donde tenías el cursor."
          preview={<TypingDocMini />}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "right",
          fontSize: 12.5,
          color: "var(--ink-3)",
        }}
      >
        ¿Necesitas refrescarlo?{" "}
        <button
          type="button"
          onClick={replayTutorial}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: "var(--accent)",
            fontSize: "inherit",
            fontFamily: "inherit",
            fontWeight: 500,
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Volver a ver el tutorial paso a paso →
        </button>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  desc,
  preview,
}: {
  number: number;
  title: string;
  desc: string;
  preview: ReactNode;
}) {
  return (
    <Card padding={0}>
      <div
        style={{
          background: "var(--sidebar)",
          borderBottom: "1px solid var(--line)",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {preview}
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            marginBottom: 10,
          }}
        >
          {number}
        </span>
        <h3
          className="serif"
          style={{
            margin: "0 0 4px",
            fontSize: 18,
            letterSpacing: "-.005em",
            color: "var(--ink)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>
    </Card>
  );
}

function RecordingPillMini() {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--bg)",
        padding: "8px 16px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,.18)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "var(--danger)",
        }}
      />
      <span>Grabando</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          opacity: 0.6,
        }}
      >
        0:04
      </span>
    </div>
  );
}

function TypingDocMini() {
  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: "10px 12px",
        fontSize: 11,
        color: "var(--ink-2)",
        lineHeight: 1.6,
        width: "70%",
        maxWidth: 220,
      }}
    >
      Hola Marta, el informe está listo
      <span
        style={{
          display: "inline-block",
          width: 1.5,
          height: "0.9em",
          background: "var(--accent)",
          marginLeft: 2,
          verticalAlign: "text-bottom",
          animation: "blink-cursor 1s step-end infinite",
        }}
      />
      <style>{`@keyframes blink-cursor { 0%,50%{opacity:1} 51%,100%{opacity:0} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: privacidad
// ---------------------------------------------------------------------------

function Privacy() {
  const points: Array<{ title: string; desc: string }> = [
    {
      title: "Sin servidor",
      desc: "Local Whisper se descarga una vez y vive en tu carpeta de Aplicación. Toda la transcripción ocurre ahí.",
    },
    {
      title: "Sin telemetría",
      desc: "No medimos qué dictas, cuánto dictas ni cuándo. La app no envía analytics, ni siquiera anónimos.",
    },
    {
      title: "Sin cuenta",
      desc: "No hay registro, ni clave de licencia, ni activación. Instalas la app, la abres y ya estás dictando.",
    },
    {
      title: "Audio efímero",
      desc: "Nunca guardamos el audio crudo. En cuanto se transcribe, se descarta. Solo queda el texto en tu base local.",
    },
  ];
  return (
    <section>
      <SectionTitle
        eyebrow="Privacidad"
        title="Qué pasa con tu voz."
      />
      <Card padding={24}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
          }}
        >
          {points.map((p) => (
            <div
              key={p.title}
              style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <IconCheck size={12} />
              </span>
              <div>
                <h4
                  style={{
                    margin: "0 0 3px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {p.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                  }}
                >
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: FAQ (accordion)
// ---------------------------------------------------------------------------

const FAQ_ITEMS: Array<{ q: string; a: ReactNode }> = [
  {
    q: "¿De verdad no envía nada a internet?",
    a: "La única vez que la app contacta con un servidor es al descargar el modelo la primera vez y al comprobar si hay actualizaciones. No hay validación de licencia ni telemetría. La transcripción es 100% local, ejecutada en tu ordenador.",
  },
  {
    q: "¿Qué precisión tiene comparado con los servicios online?",
    a: "Local Whisper utiliza modelos de transcripción del estado del arte. La precisión es prácticamente idéntica a la de los servicios en la nube — la diferencia es que todo se ejecuta en tu equipo en lugar de en un servidor.",
  },
  {
    q: "¿Cuánto ocupa cada modelo en disco?",
    a: "Depende del que elijas: Ligero (181 MB), Equilibrado (548 MB) o Máximo (834 MB). La app en sí pesa menos de 30 MB. Puedes cambiar de modelo cuando quieras desde Ajustes → Modelo local.",
  },
  {
    q: "¿En qué sistemas funciona?",
    a: "macOS, Windows y Linux. Recomendamos equipos con al menos 8 GB de RAM. Para el modelo Máximo, lo ideal son 16 GB o más.",
  },
  {
    q: "¿Cómo añado palabras técnicas o nombres propios?",
    a: "Ve a Diccionario y añade el término. Local Whisper aprenderá a transcribir esas palabras correctamente en tus futuras grabaciones.",
  },
  {
    q: "¿Qué pasa si cambio de ordenador?",
    a: "Nada: descarga la app en el equipo nuevo y listo. No hay activaciones que liberar ni límite de equipos — Local Whisper es software libre y puedes instalarlo en todos los ordenadores que quieras.",
  },
  {
    q: "¿Dónde se guarda mi historial?",
    a: "En una base de datos SQLite local dentro de la carpeta de la aplicación, en tu ordenador. Puedes desactivar el guardado o borrarlo todo desde Ajustes → Privacidad.",
  },
  {
    q: "¿Recibo factura?",
    a: "Sí. Lemon Squeezy emite la factura automáticamente tras la compra. Si necesitas datos fiscales de empresa, los puedes añadir en el checkout.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section>
      <SectionTitle eyebrow="Preguntas frecuentes" title="Dudas habituales." />
      <Card padding={0}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              style={{
                borderBottom:
                  i < FAQ_ITEMS.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 16,
                    color: "var(--ink)",
                    letterSpacing: "-.005em",
                  }}
                >
                  {item.q}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: "var(--ink-3)",
                    transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                    transition: "transform .2s",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: "0 20px 18px",
                    fontSize: 13.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                    maxWidth: "62ch",
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: soporte
// ---------------------------------------------------------------------------

function Support() {
  const items: Array<{
    icon: ReactNode;
    title: string;
    desc: string;
    href: string;
  }> = [
    {
      icon: <IconBolt size={16} />,
      title: "Reportar un bug",
      desc: "Algo no funciona como debería.",
      href: TALLY_BUG,
    },
    {
      icon: <IconSparkle size={16} />,
      title: "Proponer una mejora",
      desc: "Tienes una idea para mejorar la app.",
      href: TALLY_FEATURE,
    },
    {
      icon: <IconNote size={16} />,
      title: "Contactar con nosotros",
      desc: "Cualquier otra duda o consulta.",
      href: TALLY_CONTACT,
    },
  ];

  return (
    <section>
      <SectionTitle eyebrow="Soporte" title="¿En qué te ayudamos?" />
      <Card padding={0}>
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => void openUrl(item.href)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom:
                i < items.length - 1 ? "1px solid var(--line)" : "none",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-sans)",
              color: "var(--ink)",
              transition: "background .12s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--sidebar-2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ink)",
                  marginBottom: 2,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.4,
                }}
              >
                {item.desc}
              </div>
            </div>
            <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>
              <IconChevR size={14} />
            </span>
          </button>
        ))}
      </Card>
      <p
        style={{
          margin: "12px 4px 0",
          fontSize: 12.5,
          color: "var(--ink-3)",
          lineHeight: 1.5,
        }}
      >
        También puedes escribirnos directamente a{" "}
        <button
          type="button"
          onClick={() => void openUrl(`mailto:${SUPPORT_EMAIL}`)}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: "var(--accent)",
            fontSize: "inherit",
            fontFamily: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          {SUPPORT_EMAIL}
        </button>
        .
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared section header
// ---------------------------------------------------------------------------

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--accent)",
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {eyebrow}
      </div>
      <h3
        className="serif"
        style={{
          margin: 0,
          fontSize: 24,
          color: "var(--ink)",
          letterSpacing: "-.01em",
        }}
      >
        {title}
      </h3>
    </div>
  );
}
