// Erzeugt PNG-Icons (16/32/48/128) für die Extension – ohne externe Abhängigkeiten.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---------- PNG-Encoder ----------
const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- Zeichnen ----------
function pointInPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const BOLT = [
  [0.52, 0.06], [0.17, 0.56], [0.40, 0.56], [0.33, 0.94], [0.83, 0.44], [0.58, 0.44], [0.68, 0.06],
]

function inRoundedRect(x, y, size, radius) {
  const x0 = radius, x1 = size - radius
  const y0 = radius, y1 = size - radius
  if (x < x0 || x > x1 || y < y0 || y > y1) {
    // Ecken
    const cx = x < x0 ? x0 : x1
    const cy = y < y0 ? y0 : y1
    const dx = x - cx, dy = y - cy
    return dx * dx + dy * dy <= radius * radius
  }
  return true
}

function draw(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const rOuter = size * 0.22
  const rInner = size * 0.14
  const inset = size * 0.055
  const bg = [15, 23, 42]      // slate-900
  const inner = [30, 41, 59]   // slate-800
  const bolt = [251, 191, 36]  // amber-400
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const px = x + 0.5, py = y + 0.5
      if (!inRoundedRect(px, py, size, rOuter)) {
        rgba[i + 3] = 0
        continue
      }
      let color = bg
      if (inRoundedRect(px, py, size - inset * 2, rInner) && x >= inset && x < size - inset && y >= inset && y < size - inset) {
        color = inner
      }
      if (pointInPolygon(x / size, y / size, BOLT)) color = bolt
      rgba[i] = color[0]
      rgba[i + 1] = color[1]
      rgba[i + 2] = color[2]
      rgba[i + 3] = 255
    }
  }
  return encodePng(size, size, rgba)
}

for (const size of [16, 32, 48, 128]) {
  const file = join(outDir, 'icon' + size + '.png')
  writeFileSync(file, draw(size))
  console.log('wrote', file)
}
