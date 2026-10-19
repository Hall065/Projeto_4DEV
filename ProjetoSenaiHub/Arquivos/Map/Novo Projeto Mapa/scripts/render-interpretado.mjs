// Aplica salas-config.json sobre a segmentação (seg-N.bin / foot-N.bin) e gera, na orientação de leitura do scan:
//   fill-N.png (salas pintadas por tipo + paredes), ids-N.png (código da região por pixel)
//   e labels-N.json (posição/área/nome de cada sala + tabela de regiões) + salas.csv
// Uso: node render-interpretado.mjs <pasta-work> <salas-config.json> <pasta-saida>
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [workDir, configPath, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const READ_ROT = { 1: 'ccw', 2: 'ccw', 3: 'ccw', 4: 'cw', 5: 'cw', 6: 'cw', 7: 'cw' }
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const seg = JSON.parse(fs.readFileSync(path.join(workDir, 'seg.json'), 'utf8'))

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
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]

const csv = ['bloco;pavimento;num;nome;tipo;area_m2']
for (const [page, pc] of Object.entries(config.paginas)) {
  const { w, h } = seg[page]
  const N = w * h
  const room = new Uint16Array(fs.readFileSync(path.join(workDir, `seg-${page}.bin`)).buffer.slice(0))
  const foot = fs.readFileSync(path.join(workDir, `foot-${page}.bin`))
  const rot = READ_ROT[page]
  const rw = h, rh = w, k = 1024 / Math.max(rw, rh)
  const toRot = rot === 'ccw' ? (x, y) => [y, w - 1 - x] : (x, y) => [h - 1 - y, x]
  const inRect = (i, r) => { const [X, Y] = toRot(i % w, (i / w) | 0); const dx = X * k, dy = Y * k; return dx >= r[0] && dx <= r[2] && dy >= r[1] && dy <= r[3] }

  const entries = [{ nome: '', tipo: 'circ' }]
  const CIRC = 0, WALL = -1, OUT = -2
  const byNum = new Map()
  for (const [key, [nome, tipo]] of Object.entries(pc.salas)) {
    const id = entries.push({ nome, tipo }) - 1
    for (const n of key.split(',')) byNum.set(Number(n), id)
  }
  const fin = new Int32Array(N)
  for (let i = 0; i < N; i++) {
    if (foot[i] === 2) fin[i] = WALL
    else if (room[i]) fin[i] = byNum.get(room[i]) ?? CIRC
    else fin[i] = foot[i] === 1 ? CIRC : OUT
  }
  for (const r of pc.aberturas ?? []) {
    const alvo = r.vira != null ? byNum.get(r.vira) ?? CIRC : CIRC
    const pega = alvo === CIRC ? (f) => f === WALL : (f) => f === WALL || f === CIRC
    for (let i = 0; i < N; i++) if (pega(fin[i]) && inRect(i, r.rect)) fin[i] = alvo
  }
  for (const s of pc.splits ?? []) {
    const id = entries.push({ nome: s.nome, tipo: s.tipo }) - 1
    for (let i = 0; i < N; i++) if (room[i] === s.de && inRect(i, s.rect)) fin[i] = id
  }
  const inPoly = (i, poly) => {
    const [X, Y] = toRot(i % w, (i / w) | 0), px = X * k, py = Y * k
    let inside = false
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a], [xb, yb] = poly[b]
      if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside
    }
    return inside
  }
  for (const m of pc.manuais ?? []) {
    const id = entries.push({ nome: m.nome, tipo: m.tipo }) - 1
    const hit = m.poly ? (i) => inPoly(i, m.poly) : (i) => inRect(i, m.rect)
    for (let i = 0; i < N; i++) if (!room[i] && foot[i] !== 2 && hit(i)) fin[i] = id
  }

  // distância até a borda da própria sala → ponto do rótulo
  const d = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const x = i % w, f = fin[i]
    const edge = f < 0 || x === 0 || x === w - 1 || i < w || i >= N - w || fin[i - 1] !== f || fin[i + 1] !== f || fin[i - w] !== f || fin[i + w] !== f
    d[i] = edge ? 0 : 1e9
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1); if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + 1.414); if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + 1.414) }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1); if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + 1.414); if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + 1.414) }

  const st = entries.map(() => ({ area: 0, best: -1, bd: -1 }))
  for (let i = 0; i < N; i++) { const f = fin[i]; if (f < 0) continue; const s = st[f]; s.area++; if (d[i] > s.bd) { s.bd = d[i]; s.best = i } }

  const salas = []
  entries.forEach((e, id) => {
    const s = st[id]
    if (!e.nome || s.best < 0) return
    const x0 = s.best % w, y0 = (s.best / w) | 0
    let l = x0, r = x0, u = y0, b = y0
    while (l > 0 && fin[y0 * w + l - 1] === id) l--
    while (r < w - 1 && fin[y0 * w + r + 1] === id) r++
    while (u > 0 && fin[(u - 1) * w + x0] === id) u--
    while (b < h - 1 && fin[(b + 1) * w + x0] === id) b++
    const [X, Y] = toRot(x0, y0)
    // eixo x da planta vira eixo y na imagem girada (e vice-versa)
    const cx = rot === 'ccw' ? X + ((b + u) / 2 - y0) : X - ((b + u) / 2 - y0)
    const cy = rot === 'ccw' ? Y - ((r + l) / 2 - x0) : Y + ((r + l) / 2 - x0)
    salas.push({ nome: e.nome, tipo: e.tipo, x: Math.round(cx), y: Math.round(cy), boxW: b - u + 1, boxH: r - l + 1, area: +(s.area / pc.pxPorMetro ** 2).toFixed(1) })
  })
  const band = 70
  salas.sort((a, c) => Math.floor(a.y / band) - Math.floor(c.y / band) || a.x - c.x)
  salas.forEach((s, i) => { s.num = i + 1 })

  // ids-N.png (canal R): 0 fora, 1 parede, 2 circulação, 10+k = regioes[k] do labels-N.json
  const ids = Buffer.alloc(rw * rh * 3, 0)
  for (let i = 0; i < N; i++) {
    const f = fin[i], code = f === OUT ? 0 : f === WALL ? 1 : f === CIRC ? 2 : 10 + f
    const [X, Y] = toRot(i % w, (i / w) | 0), j = (Y * rw + X) * 3
    ids[j] = ids[j + 1] = ids[j + 2] = code
  }
  writePng(path.join(outDir, `ids-${page}.png`), rw, rh, ids)
  const regioes = entries.map((e, k) => (k ? { codigo: 10 + k, nome: e.nome, tipo: e.tipo } : null)).filter(Boolean)

  const rgb = Buffer.alloc(rw * rh * 3, 255)
  const tipos = config.tipos
  const fills = Object.fromEntries(Object.entries(tipos).map(([t, v]) => [t, hex(v[1])]))
  for (let i = 0; i < N; i++) {
    const f = fin[i], x = i % w, y = (i / w) | 0
    let c
    if (f === WALL) c = [30, 38, 51]
    else if (f === OUT) continue
    else {
      c = fills[entries[f].tipo]
      const nb = [x > 0 ? fin[i - 1] : f, x < w - 1 ? fin[i + 1] : f, y > 0 ? fin[i - w] : f, y < h - 1 ? fin[i + w] : f]
      if (nb.some((g) => g >= 0 && g !== f)) c = [96, 108, 124]
    }
    const [X, Y] = toRot(x, y), j = (Y * rw + X) * 3
    rgb[j] = c[0]; rgb[j + 1] = c[1]; rgb[j + 2] = c[2]
  }
  writePng(path.join(outDir, `fill-${page}.png`), rw, rh, rgb)
  fs.writeFileSync(path.join(outDir, `labels-${page}.json`), JSON.stringify({ page, titulo: pc.titulo, arquivo: pc.arquivo, w: rw, h: rh, salas, regioes }, null, 1))
  const [bloco, ...pav] = pc.titulo.split(' — ')
  for (const s of salas) if (s.tipo !== 'circ' && s.tipo !== 'escada') csv.push([bloco, pav.join(' '), s.num, s.nome, tipos[s.tipo][0], String(s.area).replace('.', ',')].join(';'))
  console.log(`${page} ${pc.arquivo}: ${salas.length} salas rotuladas`)
}
fs.writeFileSync(path.join(outDir, 'salas.csv'), '\ufeff' + csv.join('\r\n'))
