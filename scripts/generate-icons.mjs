// Generates all Tauri icon assets from icon-concept.svg.
// Embeds the Instrument Serif italic font so it renders correctly via librsvg.
// Run: node scripts/generate-icons.mjs

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "src-tauri", "icons");
const SVG_PATH = path.join(ICONS_DIR, "icon-concept.svg");

// Embed the font as base64 so librsvg can render the W correctly
// without needing the font installed system-wide.
const fontPath = path.join(
  ROOT,
  "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2"
);
let svgSrc = fs.readFileSync(SVG_PATH, "utf8");
if (fs.existsSync(fontPath)) {
  const b64 = fs.readFileSync(fontPath).toString("base64");
  const style = `<style>
    @font-face {
      font-family: 'Instrument Serif';
      font-style: italic;
      font-weight: 400;
      src: url('data:font/woff2;base64,${b64}') format('woff2');
    }
  </style>`;
  // Inject inside existing <defs> block
  svgSrc = svgSrc.replace("<defs>", `<defs>${style}`);
  console.log("✓ Font embedded");
} else {
  console.warn("⚠ Instrument Serif not found — will use system fallback font");
}

const svgBuf = Buffer.from(svgSrc);

// ------------------------------------------------------------------
// 1. Tauri's required icon files
// ------------------------------------------------------------------
const tauriFiles = [
  { file: "32x32.png", size: 32 },
  { file: "128x128.png", size: 128 },
  { file: "128x128@2x.png", size: 256 },
  { file: "icon.png", size: 512 },
];

for (const { file, size } of tauriFiles) {
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(path.join(ICONS_DIR, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

// ------------------------------------------------------------------
// 2. iconset folder → .icns via macOS iconutil
// ------------------------------------------------------------------
const iconsetDir = path.join(ICONS_DIR, "icon.iconset");
fs.mkdirSync(iconsetDir, { recursive: true });

const iconsetSizes = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

for (const { name, size } of iconsetSizes) {
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsetDir, name));
  console.log(`  ${name} (${size}px)`);
}

execSync(
  `iconutil -c icns "${iconsetDir}" -o "${path.join(ICONS_DIR, "icon.icns")}"`,
  { stdio: "inherit" }
);
console.log("✓ icon.icns");

// Clean up iconset folder (only needed as intermediate step)
fs.rmSync(iconsetDir, { recursive: true });

// ------------------------------------------------------------------
// 3. Minimal .ico (Windows) — 16, 32, 48, 256 px frames
//    We write a tiny Node-only ICO builder (no extra deps).
// ------------------------------------------------------------------
const icoSizes = [256, 48, 32, 16];
const pngBuffers = await Promise.all(
  icoSizes.map((s) => sharp(svgBuf).resize(s, s).png().toBuffer())
);

// ICO file format: header + directory + image data
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const dirEntry = 16;
  let offset = 6 + dirEntry * images.length;
  const dir = Buffer.alloc(dirEntry * images.length);
  const chunks = [header, dir];

  images.forEach((buf, i) => {
    const size = buf.length;
    const sz = icoSizes[i];
    const d = i * dirEntry;
    dir.writeUInt8(sz >= 256 ? 0 : sz, d);     // width (0 = 256)
    dir.writeUInt8(sz >= 256 ? 0 : sz, d + 1); // height
    dir.writeUInt8(0, d + 2);  // color count
    dir.writeUInt8(0, d + 3);  // reserved
    dir.writeUInt16LE(1, d + 4); // planes
    dir.writeUInt16LE(32, d + 6); // bit count
    dir.writeUInt32LE(size, d + 8);
    dir.writeUInt32LE(offset, d + 12);
    chunks.push(buf);
    offset += size;
  });

  return Buffer.concat(chunks);
}

fs.writeFileSync(
  path.join(ICONS_DIR, "icon.ico"),
  buildIco(pngBuffers)
);
console.log("✓ icon.ico");

console.log("\nAll icons generated in src-tauri/icons/");
