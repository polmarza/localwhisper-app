import type { ReactNode } from "react";
import { IconSidebar } from "./Icons";

export function TrafficLights({
  onSidebar,
  sidebarOn,
}: {
  onSidebar: () => void;
  sidebarOn: boolean;
}) {
  const dot = (bg: string, ring: string) => (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: bg,
        border: `0.5px solid ${ring}`,
        flexShrink: 0,
      }}
    />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {dot("#ff5f57", "rgba(0,0,0,.15)")}
        {dot("#febc2e", "rgba(0,0,0,.15)")}
        {dot("#28c840", "rgba(0,0,0,.15)")}
      </div>
      <button
        onClick={onSidebar}
        title="Mostrar/ocultar barra lateral"
        style={{
          width: 22,
          height: 22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          background: "transparent",
          color: sidebarOn ? "var(--ink-2)" : "var(--ink-3)",
          borderRadius: 5,
        }}
      >
        <IconSidebar size={16} stroke={1.6} />
      </button>
    </div>
  );
}

export function MacWindowFrame({
  children,
  onSidebar,
  sidebarOn,
}: {
  children: ReactNode;
  onSidebar: () => void;
  sidebarOn: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Title bar — draggable, hosts traffic lights overlay. macOS draws the
          traffic lights at trafficLightPosition (set in tauri.conf.json); we
          reserve space on the left, then render the sidebar-toggle button. */}
      <div
        data-tauri-drag-region
        style={{
          height: 44,
          flexShrink: 0,
          background: "var(--sidebar)",
          borderBottom: "1px solid var(--line-2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px 0 100px",
        }}
      >
        <button
          onClick={onSidebar}
          title="Mostrar/ocultar barra lateral"
          style={{
            width: 22,
            height: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            background: "transparent",
            color: sidebarOn ? "var(--ink-2)" : "var(--ink-3)",
            borderRadius: 5,
          }}
        >
          <IconSidebar size={16} stroke={1.6} />
        </button>
        <div style={{ flex: 1 }} />
      </div>
      {children}
    </div>
  );
}
