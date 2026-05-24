// Single-stroke icon set, 18x18 viewBox, currentColor.
import type { CSSProperties, ReactNode } from "react";

type IconProps = {
  size?: number;
  stroke?: number;
  style?: CSSProperties;
};

function Icon({
  children,
  size = 18,
  stroke = 1.6,
  style,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => <Icon {...p}><path d="M2.5 8 9 3l6.5 5v6.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1z"/><path d="M7 15.5v-4h4v4"/></Icon>;
export const IconChart = (p: IconProps) => <Icon {...p}><path d="M3 14V8"/><path d="M7.5 14V5"/><path d="M12 14v-4"/><path d="M16.5 14V9"/><path d="M2 15.5h14"/></Icon>;
export const IconBook = (p: IconProps) => <Icon {...p}><path d="M3 4.5a2 2 0 0 1 2-2h9.5V14H5a2 2 0 0 0-2 2z"/><path d="M3 14V4.5"/><path d="M6.5 6.5h5"/><path d="M6.5 9h3.5"/></Icon>;
export const IconBolt = (p: IconProps) => <Icon {...p}><path d="M10 1.5 3.5 10h4L8 16.5 14.5 8h-4z"/></Icon>;
export const IconAa = (p: IconProps) => <Icon {...p}><path d="M2 14.5 5.5 4l3.5 10.5"/><path d="M3 11h5"/><path d="M11.5 14.5V8a2.5 2.5 0 0 1 4.5-1.5"/><path d="M11.5 11h4.5"/></Icon>;
export const IconWand = (p: IconProps) => <Icon {...p}><path d="m3 15 9-9"/><path d="M11 5l2 2"/><path d="M14.5 2v2M16 3.25h-3M2 9.5v2M3 10.5H1"/><path d="M15 12v2M16 13h-2"/></Icon>;
export const IconNote = (p: IconProps) => <Icon {...p}><path d="M4 2.5h7L15 6.5V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M10.5 2.5V6.5h4"/><path d="M6 10h6M6 12.5h4"/></Icon>;
export const IconMic = (p: IconProps) => <Icon {...p}><rect x="6.5" y="2" width="5" height="9" rx="2.5"/><path d="M3.5 8.5a5.5 5.5 0 0 0 11 0"/><path d="M9 14v2.5"/></Icon>;
export const IconCog = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4M14.3 14.3l-1.4-1.4M5.1 5.1 3.7 3.7"/></Icon>;
export const IconHelp = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="7"/><path d="M7 7a2 2 0 1 1 2.5 2c-.7.2-1.2.6-1.2 1.5"/><path d="M9 13v.1"/></Icon>;
export const IconBell = (p: IconProps) => <Icon {...p}><path d="M4 14h10l-1-2V8.5a4 4 0 0 0-8 0V12z"/><path d="M7.5 16a1.5 1.5 0 0 0 3 0"/></Icon>;
export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="8" cy="8" r="5"/><path d="m12 12 3 3"/></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M9 3v12M3 9h12"/></Icon>;
export const IconChevR = (p: IconProps) => <Icon {...p}><path d="m7 4 5 5-5 5"/></Icon>;
export const IconChevD = (p: IconProps) => <Icon {...p}><path d="m4 7 5 5 5-5"/></Icon>;
export const IconCopy = (p: IconProps) => <Icon {...p}><rect x="6" y="6" width="9" height="9" rx="1.5"/><path d="M11 6V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="m3.5 9.5 3.5 3.5 8-8"/></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="m4 4 10 10M14 4 4 14"/></Icon>;
export const IconLock = (p: IconProps) => <Icon {...p}><rect x="3" y="8" width="12" height="8" rx="1.5"/><path d="M5.5 8V5.5a3.5 3.5 0 0 1 7 0V8"/></Icon>;
export const IconArrowUp = (p: IconProps) => <Icon {...p}><path d="M9 14V4M4 9l5-5 5 5"/></Icon>;
export const IconArrowDn = (p: IconProps) => <Icon {...p}><path d="M9 4v10M4 9l5 5 5-5"/></Icon>;
export const IconClock = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="7"/><path d="M9 5v4l2.5 2"/></Icon>;
export const IconUser = (p: IconProps) => <Icon {...p}><circle cx="9" cy="6.5" r="3"/><path d="M3 16c1-3 3.5-4 6-4s5 1 6 4"/></Icon>;
export const IconSidebar = (p: IconProps) => <Icon {...p}><rect x="2.5" y="3" width="13" height="12" rx="1.5"/><path d="M7 3v12"/></Icon>;
export const IconHeadset = (p: IconProps) => <Icon {...p}><path d="M3 11V9a6 6 0 0 1 12 0v2"/><rect x="2.5" y="11" width="3.5" height="4.5" rx="1"/><rect x="12" y="11" width="3.5" height="4.5" rx="1"/></Icon>;
export const IconShield = (p: IconProps) => <Icon {...p}><path d="M9 2 3.5 4v4.5c0 3.5 2.5 6.5 5.5 8 3-1.5 5.5-4.5 5.5-8V4z"/></Icon>;
export const IconGlobe = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="7"/><path d="M2 9h14M9 2c2 2 3 4.5 3 7s-1 5-3 7M9 2C7 4 6 6.5 6 9s1 5 3 7"/></Icon>;
export const IconKey = (p: IconProps) => <Icon {...p}><circle cx="5.5" cy="9" r="3"/><path d="M8.5 9 16 9M13 9v3M16 9v2"/></Icon>;
export const IconSparkle = (p: IconProps) => <Icon {...p}><path d="M9 2v3M9 13v3M2 9h3M13 9h3M4.5 4.5l2 2M11.5 11.5l2 2M4.5 13.5l2-2M11.5 6.5l2-2"/></Icon>;
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M9 3v9M5 8l4 4 4-4"/><path d="M3 15h12"/></Icon>;
