import { invoke } from "@tauri-apps/api/core";

export type Hardware = {
  total_ram_gb: number;
  arch: string;
  is_apple_silicon: boolean;
  cpu_brand: string;
};

export function detectHardware(): Promise<Hardware> {
  return invoke<Hardware>("detect_hardware");
}

export function summarizeHardware(hw: Hardware): string {
  const ram = `${hw.total_ram_gb.toFixed(hw.total_ram_gb >= 10 ? 0 : 1)} GB`;
  const chip = friendlyChipName(hw);
  return chip ? `${ram} · ${chip}` : ram;
}

function friendlyChipName(hw: Hardware): string | null {
  if (!hw.cpu_brand) return null;
  return hw.cpu_brand
    .replace(/\(R\)|\(TM\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPlatformName(): "Mac" | "Windows" | "Linux" {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return "Mac";
}
