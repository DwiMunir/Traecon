// Generator icon Treacon: perpaduan "@" (arc + ekor, gaya Threads) dan huruf "T".
// Tanpa dependency — PNG writer + SDF renderer manual. Jalankan: node icons/generate.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

// --- PNG writer (RGBA) ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function pngRGBA(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6 // 8-bit RGBA
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0
    pixels.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- SDF shapes (koordinat y-up: dy = cy - fy) ---
const TAU = Math.PI * 2
const rrect = (px, py, cx, cy, hw, hh, r) => {
  const dx = Math.abs(px - cx) - (hw - r)
  const dy = Math.abs(py - cy) - (hh - r)
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r
}
// segmen garis dengan ujung bulat
const capsule = (px, py, x1, y1, x2, y2, w) => {
  const vx = x2 - x1
  const vy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - x1 - t * vx, py - y1 - t * vy) - w
}
// busur lingkaran dari sudut a0 sepanjang sweep (CCW, rad), ujung bulat
const arc = (fx, fy, cx, cy, R, w, a0, sweep) => {
  const dx = fx - cx
  const dy = cy - fy
  let rel = (Math.atan2(dy, dx) - a0) % TAU
  if (rel < 0) rel += TAU
  if (rel <= sweep) return Math.abs(Math.hypot(dx, dy) - R) - w
  const cap = (ang) => Math.hypot(fx - (cx + R * Math.cos(ang)), fy - (cy - R * Math.sin(ang)))
  return Math.min(cap(a0), cap(a0 + sweep)) - w
}
const coverage = (sdf) => Math.min(1, Math.max(0, 0.5 - sdf))
const deg = (d) => (d * Math.PI) / 180

const BG = [0x0f, 0x0f, 0x0f]
const FG = [0xfa, 0xf9, 0xf7]

function render(S) {
  const px = Buffer.alloc(S * S * 4)
  const SS = 3 // supersampling 3x3
  const c = S / 2
  const R = 0.3 * S
  const w = Math.max(0.045 * S, 0.62) // tebal goresan @ dan T
  // busur @: mulai -30° sweep 330° CCW → celah di kanan-bawah (~315°), tempat ekor keluar
  const a0 = deg(-30)
  const sweep = deg(330)
  // ekor: dari ujung busur (sudut -30°) mengayun keluar ke arah -55°
  const tail = {
    x1: c + R * Math.cos(a0),
    y1: c - R * Math.sin(a0),
    x2: c + (R + 0.13 * S) * Math.cos(deg(-52)),
    y2: c - (R + 0.13 * S) * Math.sin(deg(-52)),
  }
  // huruf T di dalam lingkaran
  const bar = { y: 0.4 * S, hw: 0.125 * S }
  const stem = { top: 0.4 * S, bottom: 0.63 * S }

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS
          const cBg = coverage(rrect(fx, fy, c, c, c, c, 0.22 * S))
          const cGlyph = Math.max(
            coverage(arc(fx, fy, c, c, R, w, a0, sweep)),
            coverage(capsule(fx, fy, tail.x1, tail.y1, tail.x2, tail.y2, w)),
            coverage(capsule(fx, fy, c - bar.hw, bar.y, c + bar.hw, bar.y, w)),
            coverage(capsule(fx, fy, c, stem.top, c, stem.bottom, w)),
          )
          const cr = BG[0] * (1 - cGlyph) + FG[0] * cGlyph
          const cg = BG[1] * (1 - cGlyph) + FG[1] * cGlyph
          const cb = BG[2] * (1 - cGlyph) + FG[2] * cGlyph
          r += cr * cBg
          g += cg * cBg
          b += cb * cBg
          a += cBg
        }
      }
      const n = SS * SS
      const i = (y * S + x) * 4
      const alpha = a / n
      px[i] = alpha ? Math.round(r / n / alpha) : 0
      px[i + 1] = alpha ? Math.round(g / n / alpha) : 0
      px[i + 2] = alpha ? Math.round(b / n / alpha) : 0
      px[i + 3] = Math.round(alpha * 255)
    }
  }
  return pngRGBA(S, px)
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(OUT, `icon${size}.png`), render(size))
  console.log(`icon${size}.png`)
}
