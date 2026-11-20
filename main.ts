// The World in One Day — front-page poster for 20 November 2026.
// Node 22 stdlib only: no network, no dependencies, fully deterministic.
// Draws a 1024x1024 newspaper front page (masthead + date + 6 news panels)
// with a hand-rolled PNG encoder (CRC32 + zlib) and a hand-rolled 5x7
// bitmap font. Writes ONLY to MAKEFUN_OUTPUT_DIR (default "out/").
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 229];
const PANEL_BG: RGB = [255, 253, 246];
const INK: RGB = [17, 17, 17];
const GREY: RGB = [102, 102, 102];
const RED: RGB = [185, 28, 28];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, written as strings.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["00000", "01100", "00000", "00000", "00000", "01100", "00000"],
  ";": ["00000", "01100", "00000", "00000", "01100", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "\\": ["10000", "01000", "01000", "00100", "00010", "00010", "00001"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "^": ["00100", "01010", "10001", "00000", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "`": ["01000", "00100", "00010", "00000", "00000", "00000", "00000"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "{": ["00010", "00100", "00100", "01100", "00100", "00100", "00010"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  "}": ["01000", "00100", "00100", "00110", "00100", "00100", "01000"],
  "~": ["00000", "00000", "01001", "10110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

const FALLBACK_GLYPH = FONT["?"];

// ---------------------------------------------------------------------------
// Canvas: a plain RGB pixel buffer.
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function strokeRect(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const half = Math.floor(t / 2);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    fillRect(x - half, y - half, t, t, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const half = Math.floor(rx * Math.sqrt(t));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) setPixel(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Text rendering on the 5x7 font.
// ---------------------------------------------------------------------------
function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * charWidth(scale) - scale;
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FALLBACK_GLYPH;
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits[col] === "1") fillRect(x + col * scale, y + row * scale, scale, scale, c);
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB, bold = false): void {
  for (let i = 0; i < text.length; i++) {
    const cx = x + i * charWidth(scale);
    drawChar(text[i], cx, y, scale, c);
    if (bold) drawChar(text[i], cx + 1, y, scale, c);
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: RGB, bold = false): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c, bold);
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder: CRC32 + zlib, color type 2 (RGB), 8-bit, filter 0 per row.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowStart = y * (1 + W * 3);
    raw[rowStart] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), rowStart + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The six stories of 20 November 2026 (verified from live sources).
// ---------------------------------------------------------------------------
interface Panel {
  tag: string;
  tagColor: RGB;
  headline: string;
  body: string;
  source: string;
  scene: number;
}

const PANELS: Panel[] = [
  {
    tag: "DIPLOMACY",
    tagColor: [29, 78, 216],
    headline: "TRUMP, XI & PUTIN SIGN 'PEACE DECLARATION'",
    body: "First trilateral summit in Shenzhen, 19 Nov. Four points: UN reform, more refined oil, nuclear war 'cannot be won'. No Ukraine or Iran.",
    source: "Reuters / USA Today / The Times - 20 Nov 2026",
    scene: 1,
  },
  {
    tag: "MIDDLE EAST",
    tagColor: [180, 83, 9],
    headline: "MISSILE HITS RIYADH TOWER",
    body: "Houthi strike hits the Public Investment Fund tower in Riyadh. Airport and Financial Center also claimed. Brent $92.22 on supply fears.",
    source: "Reuters - 19-20 Nov 2026",
    scene: 2,
  },
  {
    tag: "WAR IN UKRAINE",
    tagColor: [127, 29, 29],
    headline: "KYIV HIT BY BALLISTIC MISSILES",
    body: "Russia strikes Kyiv with ballistic missiles overnight. Debris sets a three-storey building ablaze in Obolon; blasts heard before dawn.",
    source: "Reuters - 20 Nov 2026",
    scene: 3,
  },
  {
    tag: "ECONOMY",
    tagColor: [6, 95, 70],
    headline: "KOREA TOPS $1 TRILLION IN EXPORTS",
    body: "First time ever; fourth nation after the US, Germany (2006) and China (2007). AI chips lead: exports $396.8bn, Jan-Oct.",
    source: "Yonhap / Korea JoongAng Daily - 19 Nov 2026",
    scene: 4,
  },
  {
    tag: "SPORT",
    tagColor: [109, 40, 217],
    headline: "TRUMP PARDONS PETE ROSE",
    body: "Posthumous 'Complete and Total Pardon' for tax crimes. Hit king, 4,256 hits; banned 1989; died 2024, aged 83. Hall of Fame earliest 2028.",
    source: "Reuters / AP - 19 Nov 2026",
    scene: 5,
  },
  {
    tag: "WILDLIFE",
    tagColor: [14, 116, 144],
    headline: "FIONA THE HIPPO DIES AT 9",
    body: "The beloved Cincinnati Zoo star dies after swallowing a knitted hat thrown by a visitor, caught in a ceiling fan. Vets could not save her.",
    source: "AP / USA Today - 19 Nov 2026",
    scene: 6,
  },
];

// ---------------------------------------------------------------------------
// Illustrations: one small hand-drawn scene per story.
// ix, iy = top-left of the illustration box; iw, ih = its size.
// ---------------------------------------------------------------------------
function drawScene(n: number, ix: number, iy: number, iw: number, ih: number): void {
  if (n === 1) {
    // Three flags over Shenzhen: US, China, Russia + a dove.
    const sky: RGB = [207, 232, 245];
    const grass: RGB = [120, 180, 90];
    fillRect(ix, iy, iw, ih, sky);
    fillRect(ix, iy + ih - 14, iw, 14, grass);
    const poleY = iy + 12;
    const poleH = ih - 26;
    const flagW = 74;
    const flagH = 34;
    const flagXs = [ix + 28, ix + 191, ix + 354];
    for (const fx of flagXs) {
      fillRect(fx + 2, poleY, 3, poleH, [90, 70, 40]);
      fillCircle(fx + 3, poleY - 2, 3, [212, 175, 55]);
    }
    // US flag: stripes + canton.
    for (let s = 0; s < 7; s++) {
      fillRect(flagXs[0] + 5, poleY + s * 5, flagW, 5, s % 2 === 0 ? [178, 34, 52] : WHITE);
    }
    fillRect(flagXs[0] + 5, poleY, 30, 18, [60, 59, 110]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) fillCircle(flagXs[0] + 9 + c * 7, poleY + 4 + r * 6, 1, WHITE);
    // China flag: red field, one big + four small yellow stars.
    fillRect(flagXs[1] + 5, poleY, flagW, flagH, [222, 41, 16]);
    fillCircle(flagXs[1] + 18, poleY + 11, 5, [255, 222, 0]);
    fillCircle(flagXs[1] + 40, poleY + 7, 2, [255, 222, 0]);
    fillCircle(flagXs[1] + 50, poleY + 13, 2, [255, 222, 0]);
    fillCircle(flagXs[1] + 50, poleY + 22, 2, [255, 222, 0]);
    fillCircle(flagXs[1] + 40, poleY + 27, 2, [255, 222, 0]);
    // Russia flag: white / blue / red horizontal bands.
    fillRect(flagXs[2] + 5, poleY, flagW, 12, WHITE);
    fillRect(flagXs[2] + 5, poleY + 12, flagW, 11, [0, 57, 166]);
    fillRect(flagXs[2] + 5, poleY + 23, flagW, 11, [213, 0, 50]);
    // Dove above the middle flag.
    fillEllipse(ix + 228, iy + 8, 12, 7, WHITE);
    fillCircle(ix + 239, iy + 2, 5, WHITE);
    fillTriangle(ix + 243, iy + 1, ix + 249, iy + 3, ix + 243, iy + 4, [245, 158, 11]);
    fillEllipse(ix + 226, iy + 2, 8, 4, [220, 220, 220]);
    // Olive branch on the grass.
    drawLine(ix + 300, iy + ih - 4, ix + 340, iy + ih - 12, 2, [34, 120, 60]);
    fillEllipse(ix + 312, iy + ih - 9, 6, 3, [34, 120, 60]);
    fillEllipse(ix + 326, iy + ih - 11, 6, 3, [34, 120, 60]);
    fillEllipse(ix + 338, iy + ih - 13, 6, 3, [34, 120, 60]);
  } else if (n === 2) {
    // Riyadh at dusk: skyline, the PIF tower, flame and smoke.
    const dusk: RGB = [240, 178, 122];
    const dark: RGB = [43, 45, 66];
    fillRect(ix, iy, iw, ih, dusk);
    fillCircle(ix + iw - 52, iy + 16, 14, [255, 214, 130]);
    const base = iy + ih;
    const b1: Array<[number, number, number]> = [
      [0, 34, 46],
      [52, 48, 40],
      [98, 30, 34],
      [330, 40, 40],
      [376, 52, 36],
      [418, 30, 38],
    ];
    for (const [bx, bh, bw] of b1) fillRect(ix + bx, base - bh, bw, bh, dark);
    // PIF tower: tall, centre, with lit windows. (Fits inside the 82px box.)
    const tx = ix + 168;
    fillRect(tx, base - 48, 92, 48, [30, 32, 54]);
    fillTriangle(tx - 4, base - 48, tx + 46, base - 62, tx + 96, base - 48, [30, 32, 54]);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        fillRect(tx + 10 + c * 16, base - 42 + r * 8, 7, 5, [255, 214, 130]);
    // Flame on the tower top + smoke.
    fillTriangle(tx + 34, base - 62, tx + 46, base - 74, tx + 58, base - 62, [245, 130, 32]);
    fillTriangle(tx + 40, base - 62, tx + 46, base - 70, tx + 52, base - 62, [255, 214, 90]);
    fillCircle(tx + 46, base - 75, 4, [120, 120, 120]);
    fillCircle(tx + 36, base - 77, 3, [150, 150, 150]);
    fillCircle(tx + 56, base - 77, 3, [150, 150, 150]);
    // Oil barrel with price tag, bottom right.
    fillRect(ix + 372, base - 22, 34, 22, [60, 90, 60]);
    fillRect(ix + 372, base - 22, 34, 4, [40, 60, 40]);
    drawText("$92", ix + 376, base - 18, 1, WHITE, true);
  } else if (n === 3) {
    // Kyiv at night: missiles streak in, a building burns.
    const night: RGB = [22, 35, 63];
    fillRect(ix, iy, iw, ih, night);
    const stars: Array<[number, number]> = [
      [20, 10], [70, 22], [120, 8], [180, 18], [250, 10], [310, 24],
      [360, 8], [420, 16], [40, 38], [150, 34], [290, 36], [400, 34],
    ];
    for (const [sx, sy] of stars) fillRect(ix + sx, iy + sy, 2, 2, WHITE);
    fillCircle(ix + iw - 46, iy + 14, 11, [235, 230, 200]);
    fillCircle(ix + iw - 50, iy + 11, 9, night);
    const base = iy + ih;
    // Missile streaks.
    drawLine(ix + 60, iy + 6, ix + 150, iy + 58, 2, [255, 240, 180]);
    fillCircle(ix + 60, iy + 6, 5, [255, 170, 40]);
    fillCircle(ix + 66, iy + 10, 3, [255, 220, 120]);
    drawLine(ix + 250, iy + 2, ix + 330, iy + 50, 2, [255, 240, 180]);
    fillCircle(ix + 250, iy + 2, 5, [255, 170, 40]);
    // Buildings.
    fillRect(ix + 120, base - 34, 90, 34, [10, 14, 28]);
    fillRect(ix + 230, base - 48, 70, 48, [10, 14, 28]);
    fillRect(ix + 320, base - 28, 80, 28, [10, 14, 28]);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++)
        fillRect(ix + 130 + c * 20, base - 28 + r * 12, 6, 5, [255, 214, 130]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        fillRect(ix + 238 + c * 20, base - 42 + r * 12, 6, 5, [255, 214, 130]);
    // Fire at the foot of the middle building.
    fillTriangle(ix + 240, base, ix + 258, base - 26, ix + 276, base, [245, 130, 32]);
    fillTriangle(ix + 248, base, ix + 258, base - 16, ix + 268, base, [255, 214, 90]);
    fillTriangle(ix + 138, base, ix + 150, base - 18, ix + 162, base, [245, 130, 32]);
  } else if (n === 4) {
    // Korea: rising export bars, an AI chip, and the $1T milestone.
    const bg: RGB = [234, 244, 234];
    fillRect(ix, iy, iw, ih, bg);
    drawText("$1T", ix + 16, iy + 8, 4, [6, 95, 70], true);
    const base = iy + ih - 8;
    const bars: Array<[number, number, RGB]> = [
      [16, 18, [43, 108, 176]],
      [52, 28, [43, 108, 176]],
      [88, 40, [43, 140, 160]],
      [124, 52, [43, 140, 160]],
      [160, 66, [6, 95, 70]],
    ];
    for (const [bx, bh, bc] of bars) fillRect(ix + bx, base - bh, 28, bh, bc);
    // Rising arrow over the bars.
    drawLine(ix + 14, base - 10, ix + 196, base - 64, 3, [185, 28, 28]);
    fillTriangle(ix + 196, base - 64, ix + 182, base - 60, ix + 192, base - 50, [185, 28, 28]);
    // AI chip, right side.
    const cx = ix + 250;
    const cy = iy + 10;
    fillRect(cx - 6, cy + 10, 8, 6, [212, 175, 55]);
    fillRect(cx - 6, cy + 26, 8, 6, [212, 175, 55]);
    fillRect(cx - 6, cy + 42, 8, 6, [212, 175, 55]);
    fillRect(cx + 118, cy + 10, 8, 6, [212, 175, 55]);
    fillRect(cx + 118, cy + 26, 8, 6, [212, 175, 55]);
    fillRect(cx + 118, cy + 42, 8, 6, [212, 175, 55]);
    fillRect(cx, cy, 120, 58, [30, 41, 59]);
    fillRect(cx + 34, cy + 16, 52, 26, [212, 175, 55]);
    drawText("AI", cx + 48, cy + 21, 2, [30, 41, 59], true);
    drawText("CHIPS $396.8bn", cx + 8, cy + 62, 1, [30, 41, 59], true);
  } else if (n === 5) {
    // Pete Rose: ballpark, a baseball, and the pardon scroll.
    const field: RGB = [121, 194, 95];
    fillRect(ix, iy, iw, ih, field);
    // Diamond lines.
    drawLine(ix + 90, iy + 66, ix + 150, iy + 18, 2, WHITE);
    drawLine(ix + 150, iy + 18, ix + 210, iy + 66, 2, WHITE);
    fillRect(ix + 84, iy + 62, 12, 8, WHITE);
    fillRect(ix + 144, iy + 14, 12, 8, WHITE);
    fillRect(ix + 204, iy + 62, 12, 8, WHITE);
    // Baseball with red stitches.
    fillCircle(ix + 150, iy + 46, 20, WHITE);
    drawLine(ix + 136, iy + 32, ix + 144, iy + 38, 2, [185, 28, 28]);
    drawLine(ix + 138, iy + 42, ix + 146, iy + 48, 2, [185, 28, 28]);
    drawLine(ix + 142, iy + 54, ix + 150, iy + 60, 2, [185, 28, 28]);
    drawLine(ix + 164, iy + 32, ix + 156, iy + 38, 2, [185, 28, 28]);
    drawLine(ix + 162, iy + 42, ix + 154, iy + 48, 2, [185, 28, 28]);
    drawLine(ix + 158, iy + 54, ix + 150, iy + 60, 2, [185, 28, 28]);
    // Pardon scroll with seal.
    fillRect(ix + 268, iy + 10, 150, 58, [250, 244, 224]);
    strokeRect(ix + 268, iy + 10, 150, 58, 2, [120, 90, 40]);
    drawText("PARDON", ix + 292, iy + 18, 2, [120, 90, 40], true);
    drawText("4,256 HITS", ix + 292, iy + 38, 2, [17, 17, 17], true);
    fillCircle(ix + 280, iy + 52, 8, [185, 28, 28]);
    fillCircle(ix + 280, iy + 52, 5, [212, 175, 55]);
    // Grass tufts.
    for (const gx of [30, 240, 430]) {
      drawLine(ix + gx, iy + ih - 4, ix + gx + 4, iy + ih - 14, 2, [60, 140, 60]);
      drawLine(ix + gx + 8, iy + ih - 4, ix + gx + 6, iy + ih - 12, 2, [60, 140, 60]);
    }
  } else {
    // Fiona: a hippo in the water, her knitted hat drifting above.
    const sky: RGB = [191, 227, 240];
    const water: RGB = [90, 169, 201];
    fillRect(ix, iy, iw, ih, sky);
    fillRect(ix, iy + 44, iw, ih - 44, water);
    // Knitted hat drifting down, with motion lines.
    const hx = ix + 60;
    const hy = iy + 6;
    fillRect(hx, hy + 10, 56, 8, [185, 28, 28]);
    fillRect(hx, hy + 18, 56, 8, [255, 214, 90]);
    fillRect(hx, hy + 26, 56, 8, [43, 108, 176]);
    fillTriangle(hx + 8, hy + 10, hx + 28, hy - 4, hx + 48, hy + 10, [185, 28, 28]);
    fillCircle(hx + 28, hy - 6, 4, [255, 214, 90]);
    drawLine(hx + 70, hy + 8, hx + 88, hy + 8, 2, WHITE);
    drawLine(hx + 70, hy + 20, hx + 84, hy + 20, 2, WHITE);
    drawLine(hx + 70, hy + 32, hx + 80, hy + 32, 2, WHITE);
    // Water ripples.
    for (const wy of [52, 64, 76]) {
      for (let wx = 8; wx < iw - 8; wx += 36) drawLine(ix + wx, iy + wy, ix + wx + 22, iy + wy, 2, [220, 240, 248]);
    }
    // Hippo: body half-submerged, head up, ears, eye, smile.
    const hippo: RGB = [141, 153, 166];
    const hippoDark: RGB = [110, 122, 135];
    fillEllipse(ix + 250, iy + 52, 110, 30, hippo);
    fillCircle(ix + 348, iy + 34, 30, hippo);
    fillCircle(ix + 330, iy + 8, 9, hippo);
    fillCircle(ix + 330, iy + 8, 4, hippoDark);
    fillCircle(ix + 362, iy + 8, 9, hippo);
    fillCircle(ix + 362, iy + 8, 4, hippoDark);
    fillCircle(ix + 352, iy + 28, 3, BLACK);
    fillCircle(ix + 372, iy + 40, 2, hippoDark);
    fillCircle(ix + 380, iy + 40, 2, hippoDark);
    drawLine(ix + 356, iy + 46, ix + 372, iy + 48, 2, hippoDark);
    // "9" for her age, in the water corner.
    drawText("AGE 9", ix + 16, iy + ih - 18, 2, WHITE, true);
  }
}

// ---------------------------------------------------------------------------
// Poster layout: masthead, date line, 2x3 panel grid, footer.
// ---------------------------------------------------------------------------
function drawPanel(p: Panel, px0: number, py0: number): void {
  const pw = 480;
  const ph = 266;
  fillRect(px0, py0, pw, ph, PANEL_BG);
  strokeRect(px0, py0, pw, ph, 2, INK);
  // Tag.
  const tagW = textWidth(p.tag, 2) + 14;
  fillRect(px0 + 12, py0 + 10, tagW, 18, p.tagColor);
  drawText(p.tag, px0 + 19, py0 + 13, 2, WHITE, true);
  // Headline (bold, up to 2 lines).
  const headLines = wrapText(p.headline, pw - 24, 3);
  for (let i = 0; i < headLines.length; i++) {
    drawText(headLines[i], px0 + 12, py0 + 36 + i * 25, 3, INK, true);
  }
  // Illustration.
  const ix = px0 + 12;
  const iy = py0 + 92;
  strokeRect(ix, iy, pw - 24, 84, 1, INK);
  drawScene(p.scene, ix + 1, iy + 1, pw - 26, 82);
  // Body (up to 4 lines).
  const bodyLines = wrapText(p.body, pw - 24, 2);
  for (let i = 0; i < Math.min(bodyLines.length, 4); i++) {
    drawText(bodyLines[i], px0 + 12, py0 + 186 + i * 16, 2, INK);
  }
  // Source line.
  drawText(p.source, px0 + 12, py0 + 254, 1, GREY);
}

function drawPoster(): void {
  fillRect(0, 0, W, H, PAPER);
  strokeRect(8, 8, W - 16, H - 16, 2, INK);
  // Masthead.
  drawTextCentered("THE WORLD IN ONE DAY", W / 2, 40, 6, INK, true);
  fillRect(24, 96, W - 48, 4, INK);
  fillRect(24, 104, W - 48, 1, INK);
  drawTextCentered("FRIDAY 20 NOVEMBER 2026", W / 2, 112, 3, RED, true);
  drawTextCentered("SIX STORIES FROM AROUND THE WORLD - IN ONE PAGE", W / 2, 140, 2, INK);
  fillRect(24, 162, W - 48, 2, INK);
  // Panel grid: 2 columns x 3 rows.
  const xs = [24, 520];
  const ys = [176, 454, 732];
  for (let i = 0; i < PANELS.length; i++) {
    drawPanel(PANELS[i], xs[i % 2], ys[Math.floor(i / 2)]);
  }
  // Footer.
  drawTextCentered(
    "ALL STORIES VERIFIED FROM LIVE SOURCES - 20 NOVEMBER 2026",
    W / 2,
    1006,
    1,
    GREY,
  );
}

// ---------------------------------------------------------------------------
// Entry point. Writes ONLY to MAKEFUN_OUTPUT_DIR (default "out/").
// ---------------------------------------------------------------------------
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  drawPoster();
  const png = encodePNG();
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`Wrote ${outPath} (${png.length} bytes, sha256 ${sha})`);
}

main();
