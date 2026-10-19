// Segmenta as plantas limpas (Arquivos/Map/PNG) em salas: fecha vãos de porta por dilatação,
// semeia regiões e expande pela área livre (Voronoi geodésico).
// Uso: node png-rooms.mjs <pasta-png> <pasta-saida> [raio-porta-px]
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [dir, outDir, radiusArg] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const R = Number(radiusArg ?? 5)
const DARK = 150
const MIN_SEED = 40
const MIN_ROOM = 120
const READ_ROT = { 1: 'ccw', 2: 'ccw', 3: 'ccw', 4: 'cw', 5: 'cw', 6: 'cw', 7: 'cw' }

function readPng(file) {
  const b = fs.readFileSync(file)
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), colorType = b[25]
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  const idat = []
  for (let o = 8; o < b.length;) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8)
    if (type === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len))
    o += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * bpp, px = Buffer.alloc(stride * h)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0
      const up = y > 0 ? px[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0
      let v = raw[src + x]
      if (f === 1) v += a
      else if (f === 2) v += up
      else if (f === 3) v += (a + up) >> 1
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      px[y * stride + x] = v & 255
    }
  }
  const lum = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = bpp >= 3 ? (px[i * bpp] * 0.3 + px[i * bpp + 1] * 0.59 + px[i * bpp + 2] * 0.11) | 0 : px[i * bpp]
  return { w, h, lum }
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c }
  return (crc ^ 0xffffffff) >>> 0
}
function writePng(file, w, h, rgb) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]) }
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}
const FONT = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
}
function hsl(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) }
  return [f(0), f(8), f(4)]
}

function chamfer(N, w, h, isSource) {
  const d = new Float32Array(N)
  for (let i = 0; i < N; i++) d[i] = isSource(i) ? 0 : 1e9
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1); if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + 1.414); if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + 1.414) }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1); if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + 1.414); if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + 1.414) }
  return d
}

const out = {}
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort()) {
  const { w, h, lum } = readPng(path.join(dir, f))
  const N = w * h
  const dark = new Uint8Array(N)
  for (let i = 0; i < N; i++) dark[i] = lum[i] < DARK ? 1 : 0

  // remove a moldura da folha: linhas/colunas quase inteiras escuras perto da borda
  const edge = Math.round(Math.min(w, h) * 0.09)
  for (let y = 0; y < h; y++) {
    if (y > edge && y < h - edge) continue
    let c = 0; for (let x = 0; x < w; x++) c += dark[y * w + x]
    if (c > w * 0.8) for (let yy = Math.max(0, y - 3); yy <= Math.min(h - 1, y + 3); yy++) for (let x = 0; x < w; x++) dark[yy * w + x] = 0
  }
  for (let x = 0; x < w; x++) {
    if (x > edge && x < w - edge) continue
    let c = 0; for (let y = 0; y < h; y++) c += dark[y * w + x]
    if (c > h * 0.8) for (let xx = Math.max(0, x - 3); xx <= Math.min(w - 1, x + 3); xx++) for (let y = 0; y < h; y++) dark[y * w + xx] = 0
  }
  for (let i = 0; i < N; i++) { const x = i % w, y = (i / w) | 0; if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) dark[i] = 0 }
  // pontos isolados que sobraram da moldura
  {
    const seen = new Uint8Array(N), q = new Int32Array(N)
    for (let s = 0; s < N; s++) {
      if (!dark[s] || seen[s]) continue
      let qh = 0, qt = 0; q[qt++] = s; seen[s] = 1
      let x0 = w, x1 = 0, y0 = h, y1 = 0
      while (qh < qt) {
        const i = q[qh++], x = i % w, y = (i / w) | 0
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          const j = yy * w + xx
          if (dark[j] && !seen[j]) { seen[j] = 1; q[qt++] = j }
        }
      }
      const nearEdge = x0 < edge || y0 < edge || x1 > w - edge || y1 > h - edge
      let ring = 0
      for (let k = 0; k < qt; k++) { const x = q[k] % w, y = (q[k] / w) | 0; if (x - x0 < 14 || x1 - x < 14 || y - y0 < 14 || y1 - y < 14) ring++ }
      const isFrameLine = nearEdge && ((x1 - x0 < 15 && y1 - y0 > h * 0.5) || (y1 - y0 < 15 && x1 - x0 > w * 0.5))
      const isFrame = isFrameLine || (x1 - x0 > w * 0.6 && y1 - y0 > h * 0.6 && ring > qt * 0.9)
      if (isFrame || (nearEdge && qt < 400 && Math.max(x1 - x0, y1 - y0) < 60)) for (let k = 0; k < qt; k++) dark[q[k]] = 0
    }
  }

  const blocked = new Uint8Array(N)
  const offs = []
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) offs.push([dx, dy])
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dark[y * w + x]) continue
    for (const [dx, dy] of offs) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) blocked[yy * w + xx] = 1 }
  }

  const label = new Int32Array(N)
  const queue = new Int32Array(N)
  const sizes = [0]
  let next = 1
  for (let s = 0; s < N; s++) {
    if (blocked[s] || label[s]) continue
    const id = next++
    let qh = 0, qt = 0; queue[qt++] = s; label[s] = id
    while (qh < qt) {
      const i = queue[qh++], x = i % w
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !blocked[j] && !label[j]) { label[j] = id; queue[qt++] = j }
    }
    sizes.push(qt)
  }
  for (let i = 0; i < N; i++) if (label[i] && sizes[label[i]] < MIN_SEED) label[i] = 0

  const exterior = new Set()
  const lim = Math.round(Math.min(w, h) * 0.065)
  for (const [sx, sy, ddx, ddy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, h - 1, 1, -1], [w - 1, h - 1, -1, -1]]) {
    let crossed = false, inDark = false
    for (let k = 0; k < lim; k++) {
      const i = (sy + ddy * k) * w + sx + ddx * k
      if (dark[i]) { inDark = true; continue }
      if (inDark) { crossed = true; inDark = false }
      if (label[i] && (k === 0 || crossed)) { exterior.add(label[i]); if (crossed) break }
    }
  }
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (label[y * w + x]) exterior.add(label[y * w + x])
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (label[y * w + x]) exterior.add(label[y * w + x])

  let qh = 0, qt = 0
  for (let i = 0; i < N; i++) if (label[i]) queue[qt++] = i
  while (qh < qt) {
    const i = queue[qh++], x = i % w
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !dark[j] && !label[j]) { label[j] = label[i]; queue[qt++] = j }
  }

  {
    const bb = new Map()
    for (let i = 0; i < N; i++) {
      const id = label[i]; if (!id || exterior.has(id)) continue
      const x = i % w, y = (i / w) | 0
      let b = bb.get(id); if (!b) bb.set(id, b = [x, y, x, y])
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y
    }
    for (const [id, b] of bb) if (b[2] - b[0] > w * 0.85 && b[3] - b[1] > h * 0.85) exterior.add(id)
  }

  // contorno do prédio: fechamento morfológico (raio RC) + preenchimento de buracos
  const dDark = chamfer(N, w, h, (i) => dark[i] === 1)
  const RC = 30
  const dOut = chamfer(N, w, h, (i) => dDark[i] > RC)
  const footprint = new Uint8Array(N)
  {
    const outside = new Uint8Array(N), q = new Int32Array(N)
    let qh = 0, qt = 0
    const closed = (i) => dOut[i] > RC
    for (let i = 0; i < N; i++) { const x = i % w, y = (i / w) | 0; if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !closed(i)) { outside[i] = 1; q[qt++] = i } }
    while (qh < qt) { const i = q[qh++], x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !outside[j] && !closed(j)) { outside[j] = 1; q[qt++] = j } }
    for (let i = 0; i < N; i++) footprint[i] = outside[i] ? 0 : 1
  }

  // salas que vazaram por parede tracejada/aberta: refaz só na área externa com raio maior
  {
    const R2 = 9
    const isExt = (i) => !dark[i] && exterior.has(label[i])
    const lab2 = new Int32Array(N), q = new Int32Array(N)
    const interior = new Set(), seeds2 = []
    let id2 = 0
    for (let s = 0; s < N; s++) {
      if (lab2[s] || !isExt(s) || dDark[s] <= R2) continue
      id2++
      let qh = 0, qt = 0, allIn = true; q[qt++] = s; lab2[s] = id2
      while (qh < qt) { const i = q[qh++], x = i % w; if (!footprint[i]) allIn = false; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !lab2[j] && isExt(j) && dDark[j] > R2) { lab2[j] = id2; q[qt++] = j } }
      if (allIn && qt >= MIN_SEED * 2) interior.add(id2)
      seeds2.push(id2)
    }
    if (interior.size) {
      let qh = 0, qt = 0
      for (let i = 0; i < N; i++) if (lab2[i]) q[qt++] = i
      while (qh < qt) { const i = q[qh++], x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !lab2[j] && isExt(j)) { lab2[j] = lab2[i]; q[qt++] = j } }
      const newId = new Map()
      for (const k of interior) newId.set(k, next++)
      for (let i = 0; i < N; i++) if (interior.has(lab2[i])) label[i] = newId.get(lab2[i])
    }
  }

  const stats = new Map()
  for (let i = 0; i < N; i++) {
    const id = label[i]; if (!id || exterior.has(id)) continue
    const x = i % w, y = (i / w) | 0
    let s = stats.get(id); if (!s) stats.set(id, s = { id, area: 0, x0: x, y0: y, x1: x, y1: y })
    s.area++; if (x < s.x0) s.x0 = x; if (x > s.x1) s.x1 = x; if (y < s.y0) s.y0 = y; if (y > s.y1) s.y1 = y
  }
  const keep = new Map([...stats].filter(([, s]) => s.area >= MIN_ROOM))

  const dist = new Float32Array(N)
  for (let i = 0; i < N; i++) dist[i] = keep.has(label[i]) ? 1e9 : 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!dist[i]) continue; if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1); if (y > 0) dist[i] = Math.min(dist[i], dist[i - w] + 1); if (x > 0 && y > 0) dist[i] = Math.min(dist[i], dist[i - w - 1] + 1.414); if (x < w - 1 && y > 0) dist[i] = Math.min(dist[i], dist[i - w + 1] + 1.414) }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!dist[i]) continue; if (x < w - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1); if (y < h - 1) dist[i] = Math.min(dist[i], dist[i + w] + 1); if (x < w - 1 && y < h - 1) dist[i] = Math.min(dist[i], dist[i + w + 1] + 1.414); if (x > 0 && y < h - 1) dist[i] = Math.min(dist[i], dist[i + w - 1] + 1.414) }
  for (let i = 0; i < N; i++) { const s = keep.get(label[i]); if (s && (s.d === undefined || dist[i] > s.d)) { s.d = dist[i]; s.lx = i % w; s.ly = (i / w) | 0 } }

  const rooms = [...keep.values()]
  const band = 45
  rooms.sort((a, c) => Math.floor(a.ly / band) - Math.floor(c.ly / band) || a.lx - c.lx)
  rooms.forEach((r, i) => { r.num = i + 1 })
  const numOf = new Map(rooms.map((r) => [r.id, r.num]))

  const rgb = Buffer.alloc(N * 3, 255)
  const roomMap = new Uint16Array(N)
  for (let i = 0; i < N; i++) {
    const num = numOf.get(label[i]) ?? 0
    roomMap[i] = num
    let c = [255, 255, 255]
    if (dark[i]) c = [20, 24, 32]
    else if (num) c = hsl((num * 47) % 360, 0.6, 0.85)
    else if (footprint[i]) c = [228, 230, 234]
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
  }
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 3; rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2] }
  for (const r of rooms) {
    const s = r.d > 18 ? 3 : 2, t = String(r.num), tw = t.length * 6 * s - s, th = 7 * s
    const x0 = Math.round(r.lx - tw / 2), y0 = Math.round(r.ly - th / 2)
    for (let yy = -s; yy < th + s; yy++) for (let xx = -s; xx < tw + s; xx++) put(x0 + xx, y0 + yy, [255, 255, 255])
    let cx = x0
    for (const ch of t) { const g = FONT[ch]; for (let rr = 0; rr < 7; rr++) for (let bb = 0; bb < 5; bb++) if (g[rr] & (16 >> bb)) for (let a = 0; a < s; a++) for (let b2 = 0; b2 < s; b2++) put(cx + bb * s + b2, y0 + rr * s + a, [200, 0, 20]); cx += 6 * s }
  }
  const name = path.basename(f, '.png')
  writePng(path.join(outDir, `seg-${name}.png`), w, h, rgb)

  // cópia girada na orientação de leitura do scan (texto na horizontal), números na vertical certa
  const rot = READ_ROT[name]
  if (rot) {
    const rw = h, rh = w, rrgb = Buffer.alloc(rw * rh * 3, 255)
    const map = rot === 'ccw' ? (x, y) => [y, w - 1 - x] : (x, y) => [h - 1 - y, x]
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, num = roomMap[i]
      const c = dark[i] ? [20, 24, 32] : num ? hsl((num * 47) % 360, 0.6, 0.85) : footprint[i] ? [228, 230, 234] : [255, 255, 255]
      const [X, Y] = map(x, y), j = (Y * rw + X) * 3
      rrgb[j] = c[0]; rrgb[j + 1] = c[1]; rrgb[j + 2] = c[2]
    }
    const rput = (x, y, c) => { if (x < 0 || y < 0 || x >= rw || y >= rh) return; const j = (y * rw + x) * 3; rrgb[j] = c[0]; rrgb[j + 1] = c[1]; rrgb[j + 2] = c[2] }
    for (const r of rooms) {
      const [X, Y] = map(r.lx, r.ly)
      const s = 3, t = String(r.num), tw = t.length * 6 * s - s, th = 7 * s
      const x0 = Math.round(X - tw / 2), y0 = Math.round(Y - th / 2)
      for (let yy = -s; yy < th + s; yy++) for (let xx = -s; xx < tw + s; xx++) rput(x0 + xx, y0 + yy, [255, 255, 255])
      let cx = x0
      for (const ch of t) { const g = FONT[ch]; for (let rr = 0; rr < 7; rr++) for (let bb = 0; bb < 5; bb++) if (g[rr] & (16 >> bb)) for (let a = 0; a < s; a++) for (let b2 = 0; b2 < s; b2++) rput(cx + bb * s + b2, y0 + rr * s + a, [200, 0, 20]); cx += 6 * s }
    }
    writePng(path.join(outDir, `seg-${name}-leitura.png`), rw, rh, rrgb)
  }
  fs.writeFileSync(path.join(outDir, `seg-${name}.bin`), Buffer.from(roomMap.buffer))
  const fp = Buffer.alloc(N)
  for (let i = 0; i < N; i++) fp[i] = dark[i] ? 2 : footprint[i] ? 1 : 0
  fs.writeFileSync(path.join(outDir, `foot-${name}.bin`), fp)
  out[name] = { w, h, rooms: rooms.map(({ num, area, lx, ly, x0, y0, x1, y1 }) => ({ num, area, lx, ly, bbox: [x0, y0, x1, y1] })) }
  console.log(`${f}: ${rooms.length} regioes (R=${R})`)
}
fs.writeFileSync(path.join(outDir, 'seg.json'), JSON.stringify(out))
