const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Tiny pure-Node PNG encoder (RGBA, 8-bit, no dependencies).
// ---------------------------------------------------------------------------

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      CRC_TABLE[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette (rutinapp brand: black & citrus).
// ---------------------------------------------------------------------------

const LIME = [163, 230, 53]; // #A3E635
const SAND = [201, 245, 94]; // #C9F55E (slightly lighter lime for the sand)
const WHITE = [255, 255, 255];

// ---------------------------------------------------------------------------
// Hourglass ("reloj de arena") silhouette. Normalized coords (0..1).
// Returns 'none' | 'glass' | 'sand'.
// ---------------------------------------------------------------------------

const CX = 0.5;
const NECK_Y = 0.5;
const TOP_Y = 0.325;
const BOT_Y = 0.675;
const HALF_OPEN = 0.2; // glass half-width at the openings
const RIM_HALF = 0.25; // rim half-width (wider than the glass)
const RIM_THICK = 0.035;
const SAND_TOP = 0.6; // how full the lower bulb is
const STREAM_HALF = 0.005;
const STREAM_START = 0.506;
const NECK_HALF_MIN = 0.008;

function hourglassAt(x, y) {
  const dx = Math.abs(x - CX);

  const rimTopMidY = TOP_Y - RIM_THICK / 2;
  const rimBotMidY = BOT_Y + RIM_THICK / 2;
  const rimRad = RIM_THICK / 2;
  const inTopRim =
    (y >= TOP_Y - RIM_THICK && y <= TOP_Y && dx <= RIM_HALF) ||
    Math.hypot(x - (CX - RIM_HALF), y - rimTopMidY) <= rimRad ||
    Math.hypot(x - (CX + RIM_HALF), y - rimTopMidY) <= rimRad;
  const inBotRim =
    (y >= BOT_Y && y <= BOT_Y + RIM_THICK && dx <= RIM_HALF) ||
    Math.hypot(x - (CX - RIM_HALF), y - rimBotMidY) <= rimRad ||
    Math.hypot(x - (CX + RIM_HALF), y - rimBotMidY) <= rimRad;
  if (inTopRim || inBotRim) return 'glass';

  const topHalf = Math.max(NECK_HALF_MIN, (HALF_OPEN * (NECK_Y - y)) / (NECK_Y - TOP_Y));
  const botHalf = Math.max(NECK_HALF_MIN, (HALF_OPEN * (y - NECK_Y)) / (BOT_Y - NECK_Y));

  if (y >= TOP_Y && y < NECK_Y && dx <= topHalf) return 'glass';
  if (y > NECK_Y && y <= BOT_Y && dx <= botHalf) {
    return y >= SAND_TOP ? 'sand' : 'glass';
  }
  if (dx <= STREAM_HALF && y >= STREAM_START && y <= SAND_TOP) return 'sand';
  return 'none';
}

// ---------------------------------------------------------------------------
// Per-pixel color. Returns [r, g, b, a] straight alpha, 0..255.
// ---------------------------------------------------------------------------

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function bgColor(y) {
  const r = lerp(30, 6, y);
  const g = lerp(30, 7, y);
  const b = lerp(42, 9, y);
  return [r, g, b];
}

function sample(x, y, mode) {
  const shape = hourglassAt(x, y);
  const hasShape = shape !== 'none';
  const isSand = shape === 'sand';

  if (mode === 'monochrome' || mode === 'notification') {
    return hasShape ? [...WHITE, 255] : [0, 0, 0, 0];
  }

  if (mode === 'app') {
    let [r, g, b] = bgColor(y);
    const dist = Math.hypot(x - CX, y - CX);
    const glow = Math.max(0, 1 - dist / 0.56);
    r += 0.38 * glow * glow * LIME[0];
    g += 0.38 * glow * glow * LIME[1];
    b += 0.38 * glow * glow * LIME[2];
    if (isSand) [r, g, b] = SAND;
    else if (hasShape) [r, g, b] = LIME;
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b), 255];
  }

  if (mode === 'foreground' || mode === 'splash') {
    if (isSand) return [...SAND, 255];
    if (hasShape) return [...LIME, 255];
    return [0, 0, 0, 0];
  }

  if (mode === 'background') {
    return [...bgColor(y), 255];
  }

  throw new Error('unknown mode: ' + mode);
}

// ---------------------------------------------------------------------------
// Render with 4x4 supersampling for smooth edges.
// ---------------------------------------------------------------------------

function render(size, mode) {
  const rgba = Buffer.alloc(size * size * 4);
  const N = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const x = (px + (sx + 0.5) / N) / size;
          const y = (py + (sy + 0.5) / N) / size;
          const c = sample(x, y, mode);
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const idx = (py * size + px) * 4;
      const total = N * N;
      rgba[idx] = Math.round(r / total);
      rgba[idx + 1] = Math.round(g / total);
      rgba[idx + 2] = Math.round(b / total);
      rgba[idx + 3] = Math.round(a / total);
    }
  }
  return encodePng(size, size, rgba);
}

// ---------------------------------------------------------------------------
// Write all assets.
// ---------------------------------------------------------------------------

const outDir = path.resolve(__dirname, '..', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ['icon.png', 1024, 'app'],
  ['android-icon-foreground.png', 1024, 'foreground'],
  ['android-icon-background.png', 1024, 'background'],
  ['android-icon-monochrome.png', 1024, 'monochrome'],
  ['notification-icon.png', 96, 'notification'],
  ['splash-icon.png', 512, 'splash'],
  ['favicon.png', 64, 'splash'],
];

for (const [name, size, mode] of targets) {
  const filePath = path.join(outDir, name);
  fs.writeFileSync(filePath, render(size, mode));
  console.log(`- ${name} (${size}x${size}, ${mode})`);
}
console.log('Done.');
