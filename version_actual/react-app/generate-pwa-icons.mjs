/**
 * generate-pwa-icons.mjs
 * Creates icon-192.png + icon-512.png for the PWA.
 * Pure Node.js — no external dependencies (uses built-in zlib + fs).
 * Design: dark background #0f1115 + amber bar chart #e0a84a.
 *
 * Usage:  node generate-pwa-icons.mjs
 */

import zlib from 'zlib'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CRC-32 table (PNG chunk integrity) ──────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]
  return (c ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf  = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// ── Build raw RGBA pixel buffer ──────────────────────
function buildPixels(size) {
  // Colors
  const BG   = [15, 17, 21]      // #0f1115 (--ink-1)
  const AMB  = [224, 168, 74]    // #e0a84a (--amber)
  const AMB2 = [42, 31, 10]      // #2a1f0a (--amber-d, subtle)

  const pixels = Buffer.alloc(size * size * 3)
  const p      = size             // shorthand

  // Helper: fill rect in pixels buffer
  function fillRect(x0, y0, w, h, [r, g, b]) {
    for (let y = Math.max(0, y0); y < Math.min(p, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(p, x0 + w); x++) {
        const i = (y * p + x) * 3
        pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b
      }
    }
  }

  // Fill background
  fillRect(0, 0, p, p, BG)

  // Rounded-rect feel: amber strip top (thin accent)
  fillRect(0, 0, p, Math.round(p * 0.04), AMB2)

  // Bar chart — 3 bars, amber, bottom-aligned, 8% padding each side
  const pad    = Math.round(p * 0.12)
  const bw     = Math.round(p * 0.15)   // bar width
  const gap    = Math.round((p - pad * 2 - bw * 3) / 2)
  const base   = Math.round(p * 0.80)   // baseline y
  const bars   = [0.38, 0.62, 0.82]    // heights as fraction of (base - pad)

  bars.forEach((frac, i) => {
    const bh = Math.round((base - pad) * frac)
    const x  = pad + i * (bw + gap)
    const y  = base - bh
    fillRect(x, y, bw, bh, AMB)
  })

  // Small horizontal baseline under bars
  fillRect(pad - 2, base, p - pad * 2 + 4, Math.round(p * 0.025), AMB)

  return pixels
}

// ── Encode as PNG ────────────────────────────────────
function encodePNG(size, pixels) {
  const channels = 3  // RGB
  // Build scanlines with filter byte (0 = None) prepended to each row
  const raw = Buffer.alloc(size * (size * channels + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * channels + 1)] = 0   // filter byte
    pixels.copy(raw, y * (size * channels + 1) + 1, y * size * channels, (y + 1) * size * channels)
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type
  // compression, filter, interlace = 0

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate ─────────────────────────────────────────
const publicDir = path.join(__dirname, 'public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir)

for (const size of [192, 512]) {
  const dest = path.join(publicDir, `icon-${size}.png`)
  if (fs.existsSync(dest)) {
    console.log(`⏭  icon-${size}.png already exists — skip`)
    continue
  }
  const pixels = buildPixels(size)
  const png    = encodePNG(size, pixels)
  fs.writeFileSync(dest, png)
  console.log(`✅  Generated icon-${size}.png (${size}×${size}, ${png.length} bytes)`)
}
