import { useState } from "react";
import {
  IconAa,
  IconBook,
  IconChart,
  IconCog,
  IconHelp,
  IconHome,
  IconWand,
} from "./Icons";
import { NavItem, Waveform } from "./Ui";
import type { Screen } from "../App";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
} from "../state/preferences";

export function Sidebar({
  active,
  onNavigate,
  width = DEFAULT_SIDEBAR_WIDTH,
  onWidthChange,
  insightsLocked = false,
  onLockedInsights,
}: {
  active: Screen;
  onNavigate: (s: Screen) => void;
  width?: number;
  onWidthChange?: (w: number) => void;
  insightsLocked?: boolean;
  onLockedInsights?: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  // Drag handle on the right edge. We capture mouse moves on the document
  // (not the handle itself) so the user can swing past the sidebar without
  // losing the drag — the same pattern any decent resizable panel uses.
  const onDragStart = (e: React.MouseEvent) => {
    if (!onWidthChange) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(MAX_SIDEBAR_WIDTH, startWidth + (ev.clientX - startX)),
      );
      onWidthChange(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDragging(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <aside
      style={{
        position: "relative",
        width,
        flexShrink: 0,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--line-2)",
        display: "flex",
        flexDirection: "column",
        padding: "4px 0 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 18px 18px",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Waveform active count={5} height={18} color="var(--ink)" />
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-.02em",
              color: "var(--ink)",
            }}
          >
            Local Whisper
          </span>
        </div>
      </div>

      <nav
        style={{
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <NavItem
          icon={<IconHome size={16} />}
          label="Inicio"
          active={active === "home"}
          onClick={() => onNavigate("home")}
        />
        <NavItem
          icon={<IconChart size={16} />}
          label="Estadísticas"
          active={active === "insights"}
          badge={insightsLocked ? "🔒" : undefined}
          onClick={() =>
            insightsLocked ? onLockedInsights?.() : onNavigate("insights")
          }
        />
        <NavItem
          icon={<IconBook size={16} />}
          label="Diccionario"
          active={active === "dictionary"}
          onClick={() => onNavigate("dictionary")}
        />
        <NavItem icon={<IconAa size={16} />} label="Estilo" disabled />
        <NavItem
          icon={<IconWand size={16} />}
          label="Transformaciones"
          disabled
        />
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <NavItem
          icon={<IconCog size={16} />}
          label="Ajustes"
          active={active === "settings"}
          onClick={() => onNavigate("settings")}
        />
        <NavItem
          icon={<IconHelp size={16} />}
          label="Ayuda"
          active={active === "help"}
          onClick={() => onNavigate("help")}
        />
      </div>

      {onWidthChange && (
        <div
          onMouseDown={onDragStart}
          title="Arrastra para cambiar el ancho"
          style={{
            position: "absolute",
            top: 0,
            right: -3,
            width: 6,
            height: "100%",
            cursor: "col-resize",
            zIndex: 10,
            background: dragging ? "var(--accent)" : "transparent",
            transition: dragging ? "none" : "background .15s",
          }}
          onMouseEnter={(e) => {
            if (!dragging) e.currentTarget.style.background = "var(--accent-soft)";
          }}
          onMouseLeave={(e) => {
            if (!dragging) e.currentTarget.style.background = "transparent";
          }}
        />
      )}
    </aside>
  );
}
