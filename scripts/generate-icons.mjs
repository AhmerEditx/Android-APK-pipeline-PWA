import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

const LIME = [163, 230, 53]
const ZINC = [9, 9, 11]

let crcTable
function crc32(buf) {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function insideRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

function insideRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const nx = Math.max(x0 + r - x, x - (x1 - r), 0)
  const ny = Math.max(y0 + r - y, y - (y1 - r), 0)
  return nx * nx + ny * ny <= r * r
}

function drawLetter(size, top, bottom, setPixel) {
  const stemHalf = size * 0.08
  const barHalf = size * 0.2
  const barThick = size * 0.12
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inStem = insideRect(x, y, size / 2 - stemHalf, top + barThick, size / 2 + stemHalf, bottom - barThick)
      const inTop = insideRect(x, y, size / 2 - barHalf, top, size / 2 + barHalf, top + barThick)
      const inBottom = insideRect(x, y, size / 2 - barHalf, bottom - barThick, size / 2 + barHalf, bottom)
      if (inStem || inTop || inBottom) setPixel(x, y, ZINC)
    }
  }
}

function makeIcon(size, { mode = 'normal' } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const pad = size * 0.08
  const radius = size * 0.19
  const setPixel = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4
    rgba[i] = r
    rgba[i + 1] = g
    rgba[i + 2] = b
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fullBleed = mode === 'maskable' || mode === 'opaque'
      const inTile = fullBleed || insideRoundedRect(x, y, pad, pad, size - pad, size - pad, radius)
      if (!inTile) continue
      setPixel(x, y, LIME)
    }
  }

  if (mode === 'normal') {
    drawLetter(size, 0.15, 0.85, setPixel)
  } else {
    drawLetter(size, 0.17, 0.83, setPixel)
  }

  return encodePNG(size, rgba)
}

mkdirSync(OUT_DIR, { recursive: true })
const targets = [
  ['icon-192.png', 192, 'normal'],
  ['icon-512.png', 512, 'normal'],
  ['icon-maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon.png', 180, 'opaque'],
]
for (const [name, size, mode] of targets) {
  writeFileSync(join(OUT_DIR, name), makeIcon(size, { mode }))
  console.log(`wrote public/icons/${name}`)
}