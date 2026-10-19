// Encaixa cada planta interpretada (fill-N.png, orientação de leitura) sobre as paredes do GLB do site:
// corta o GLB na altura do pavimento, testa 8 orientações (giro 90° × espelho), escala ±6% e translação,
// minimizando a distância média das paredes da planta às paredes do modelo.
// Uso: node montagem-align.mjs <pasta-glb> <pasta-render> <salas-config.json> <saida.json>
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [glbDir, renderDir, configPath, outFile] = process.argv.slice(2)
const UNIT_TO_M = 0.1
const FLOOR_STEP = 25.6
const SLICE_OFFSET = 12
const PAGES = { 1: ['A', 0], 2: ['A', 2], 3: ['B', 0], 4: ['C', 0], 5: ['C', 2], 6: ['D', 0], 7: ['D', 2] }
const WALL_RGB = [30, 38, 51]
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

function readGlb(file) {
  const buf = fs.readFileSync(file)
  let offset = 12, json = null, bin = null
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8).replace(/\0/g, '')
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'JSON') json = JSON.parse(data.toString('utf8')); else bin = data
    offset += 8 + len
  }
  return { json, bin }
}
function trs(n) {
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale ?? [1, 1, 1]
  const r = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
  return (p) => [r[0] * p[0] * sx + r[1] * p[1] * sy + r[2] * p[2] * sz + tx, r[3] * p[0] * sx + r[4] * p[1] * sy + r[5] * p[2] * sz + ty, r[6] * p[0] * sx + r[7] * p[1] * sy + r[8] * p[2] * sz + tz]
}
function accessor(g, bin, idx) {
  const a = g.accessors[idx], bv = g.bufferViews[a.bufferView]
  const comps = { SCALAR: 1, VEC3: 3, VEC2: 2, VEC4: 4 }[a.type]
  const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType]
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = bv.byteStride ?? comps * size
  const dv = new DataView(bin.buffer, bin.byteOffset)
  const read = (o) => a.componentType === 5126 ? dv.getFloat32(o, true) : a.componentType === 5125 ? dv.getUint32(o, true) : a.componentType === 5123 ? dv.getUint16(o, true) : dv.getUint8(o)
  const out = []
  for (let i = 0; i < a.count; i++) {
    if (comps === 1) out.push(read(start + i * stride))
    else { const row = []; for (let c = 0; c < comps; c++) row.push(read(start + i * stride + c * size)); out.push(row) }
  }
  return out
}
function readPngRgb(file) {
  const b = fs.readFileSync(file)
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[b[25]]
  const idat = []
  for (let o = 8; o < b.length;) { const len = b.readUInt32BE(o); if (b.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len)); o += 12 + len }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(stride * h)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0
      let v = raw[src + x]
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      px[y * stride + x] = v & 255
    }
  }
  return { w, h, bpp, px }
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

const blocks = {}
for (const f of fs.readdirSync(glbDir).filter((x) => x.endsWith('.glb'))) {
  const { json: g, bin } = readGlb(path.join(glbDir, f))
  const node = g.nodes[0], tf = trs(node)
  const tris = []
  let minY = Infinity, maxY = -Infinity
  for (const p of g.meshes[node.mesh].primitives) {
    if (!(g.materials[p.material]?.name ?? '').startsWith('wall')) continue
    const pos = accessor(g, bin, p.attributes.POSITION).map(tf)
    const ind = p.indices !== undefined ? accessor(g, bin, p.indices) : pos.map((_, i) => i)
    for (let i = 0; i < ind.length; i += 3) {
      const t = [pos[ind[i]], pos[ind[i + 1]], pos[ind[i + 2]]]
      for (const v of t) { minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]) }
      tris.push(t)
    }
  }
  blocks[node.name.replace(/^Bloco\s*/i, '')] = { tris, baseY: minY, topY: maxY }
}

function slice(tris, y) {
  const segs = []
  for (const v of tris) {
    const pts = []
    for (let i = 0; i < 3; i++) {
      const p = v[i], q = v[(i + 1) % 3]
      if ((p[1] - y) * (q[1] - y) < 0) { const k = (y - p[1]) / (q[1] - p[1]); pts.push([(p[0] + (q[0] - p[0]) * k) * UNIT_TO_M, (p[2] + (q[2] - p[2]) * k) * UNIT_TO_M]) }
    }
    if (pts.length === 2) segs.push(pts)
  }
  return segs
}

function distanceField(segs, G, margin) {
  const xs = segs.flatMap((s) => [s[0][0], s[1][0]]), zs = segs.flatMap((s) => [s[0][1], s[1][1]])
  const x0 = Math.min(...xs) - margin, z0 = Math.min(...zs) - margin
  const W = Math.ceil((Math.max(...xs) + margin - x0) * G), H = Math.ceil((Math.max(...zs) + margin - z0) * G)
  const d = new Float32Array(W * H).fill(1e9)
  for (const [a, b] of segs) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * G * 2))
    for (let i = 0; i <= n; i++) {
      const X = Math.round((a[0] + (b[0] - a[0]) * i / n - x0) * G), Z = Math.round((a[1] + (b[1] - a[1]) * i / n - z0) * G)
      if (X >= 0 && Z >= 0 && X < W && Z < H) d[Z * W + X] = 0
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1); if (y > 0) d[i] = Math.min(d[i], d[i - W] + 1); if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - W - 1] + 1.414); if (x < W - 1 && y > 0) d[i] = Math.min(d[i], d[i - W + 1] + 1.414) }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; if (x < W - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < H - 1) d[i] = Math.min(d[i], d[i + W] + 1); if (x < W - 1 && y < H - 1) d[i] = Math.min(d[i], d[i + W + 1] + 1.414); if (x > 0 && y < H - 1) d[i] = Math.min(d[i], d[i + W - 1] + 1.414) }
  const CAP = 3
  const at = (x, z) => {
    const fx = (x - x0) * G, fz = (z - z0) * G
    const ix = Math.floor(fx), iz = Math.floor(fz)
    if (ix < 0 || iz < 0 || ix >= W - 1 || iz >= H - 1) return CAP
    const ax = fx - ix, az = fz - iz, i = iz * W + ix
    const v = (d[i] * (1 - ax) + d[i + 1] * ax) * (1 - az) + (d[i + W] * (1 - ax) + d[i + W + 1] * ax) * az
    return Math.min(CAP, v / G)
  }
  return { at, bbox: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] }
}

const ORIENTS = []
for (const mirror of [false, true]) for (const rot of [0, 90, 180, 270]) {
  const c = Math.round(Math.cos(rot * Math.PI / 180)), s = Math.round(Math.sin(rot * Math.PI / 180)), m = mirror ? -1 : 1
  ORIENTS.push({ mirror, rot, M: [c * m, -s, s * m, c] })
}

const result = { unidade: 'metros', eixos: 'x = X do GLB, z = Z do GLB (vista de cima, z para baixo)', paginas: {} }
for (const [page, [blockId, level]] of Object.entries(PAGES)) {
  const pc = config.paginas[page], ppm = pc.pxPorMetro
  const blk = blocks[blockId]
  const refLevel = pc.encaixe?.nivelReferencia ?? level
  const cutY = blk.baseY + refLevel * FLOOR_STEP + SLICE_OFFSET
  const segs = slice(blk.tris, cutY)
  const field = distanceField(segs, 5, 12)
  const img = readPngRgb(path.join(renderDir, `fill-${page}.png`))
  const cells = new Map()
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const j = (y * img.w + x) * img.bpp
    if (img.px[j] !== WALL_RGB[0] || img.px[j + 1] !== WALL_RGB[1] || img.px[j + 2] !== WALL_RGB[2]) continue
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y)
    const key = `${Math.floor(x / ppm * 5)},${Math.floor(y / ppm * 5)}`
    if (!cells.has(key)) cells.set(key, [x / ppm, y / ppm])
  }
  const pts = [...cells.values()]
  const score = (M, s, tx, tz) => { let sum = 0; for (const [u, v] of pts) sum += field.at(s * (M[0] * u + M[1] * v) + tx, s * (M[2] * u + M[3] * v) + tz); return sum / pts.length }
  const [bx0, bz0, bx1, bz1] = field.bbox
  let best = null
  for (const o of ORIENTS) {
    const tp = pts.map(([u, v]) => [o.M[0] * u + o.M[1] * v, o.M[2] * u + o.M[3] * v])
    const cx = (Math.min(...tp.map((p) => p[0])) + Math.max(...tp.map((p) => p[0]))) / 2
    const cz = (Math.min(...tp.map((p) => p[1])) + Math.max(...tp.map((p) => p[1]))) / 2
    let cand = { o, s: 1, tx: (bx0 + bx1) / 2 - cx, tz: (bz0 + bz1) / 2 - cz }
    cand.e = score(o.M, 1, cand.tx, cand.tz)
    const base = { ...cand }
    for (let dx = -10; dx <= 10; dx += 0.5) for (let dz = -10; dz <= 10; dz += 0.5) {
      const e = score(o.M, 1, base.tx + dx, base.tz + dz)
      if (e < cand.e) cand = { o, s: 1, tx: base.tx + dx, tz: base.tz + dz, e }
    }
    if (process.env.DEBUG) console.log(`  p${page} giro ${o.rot} esp ${o.mirror}: ${cand.e.toFixed(3)} t=(${cand.tx.toFixed(1)}, ${cand.tz.toFixed(1)})`)
    if (!best || cand.e < best.e) best = cand
  }
  for (const step of [0.2, 0.08, 0.03]) {
    let improved = true
    while (improved) {
      improved = false
      for (const [ds, dx, dz] of [[0.01, 0, 0], [-0.01, 0, 0], [0, step, 0], [0, -step, 0], [0, 0, step], [0, 0, -step]]) {
        const s = best.s + ds * (step / 0.2), tx = best.tx + dx, tz = best.tz + dz
        if (s < 0.94 || s > 1.06) continue
        const e = score(best.o.M, s, tx, tz)
        if (e < best.e - 1e-5) { best = { ...best, s, tx, tz, e }; improved = true }
      }
    }
  }
  {
    const G = 8, [ox, oz] = [bx0 - 15, bz0 - 15], W = Math.ceil((bx1 - bx0 + 30) * G), H = Math.ceil((bz1 - bz0 + 30) * G)
    const rgb = Buffer.alloc(W * H * 3, 255)
    const put = (x, z, c) => { const X = Math.round((x - ox) * G), Z = Math.round((z - oz) * G); if (X >= 0 && Z >= 0 && X < W && Z < H) { const j = (Z * W + X) * 3; rgb[j] = c[0]; rgb[j + 1] = c[1]; rgb[j + 2] = c[2] } }
    for (const [u, v] of pts) put(best.s * (best.o.M[0] * u + best.o.M[1] * v) + best.tx, best.s * (best.o.M[2] * u + best.o.M[3] * v) + best.tz, [60, 130, 230])
    for (const [a, b] of segs) { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * G * 2) + 1; for (let i = 0; i <= n; i++) put(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, [227, 6, 19]) }
    writePng(path.join(path.dirname(outFile), `overlay-${page}.png`), W, H, rgb)
  }
  let inl = 0
  for (const [u, v] of pts) if (field.at(best.s * (best.o.M[0] * u + best.o.M[1] * v) + best.tx, best.s * (best.o.M[2] * u + best.o.M[3] * v) + best.tz) < 0.35) inl++
  const toWorld = (X, Y) => { const u = X / ppm, v = Y / ppm; return [+(best.s * (best.o.M[0] * u + best.o.M[1] * v) + best.tx).toFixed(3), +(best.s * (best.o.M[2] * u + best.o.M[3] * v) + best.tz).toFixed(3)] }
  result.paginas[page] = {
    bloco: blockId, nivel: level, titulo: pc.titulo, arquivo: pc.arquivo,
    pisoAltura_m: +((blk.baseY + level * FLOOR_STEP) * UNIT_TO_M).toFixed(2),
    baseBloco_m: +(blk.baseY * UNIT_TO_M).toFixed(2), topoBloco_m: +(blk.topY * UNIT_TO_M).toFixed(2),
    img: { w: img.w, h: img.h, pxPorMetro: ppm, caixa: box },
    ajuste: { giro: best.o.rot, espelho: best.o.mirror, escala: +best.s.toFixed(3), erroMedio_m: +best.e.toFixed(3), paredesEncaixadas: +(inl / pts.length).toFixed(3), nivelReferencia: refLevel, corrigido: refLevel !== level, nota: refLevel !== level ? 'escala corrigida' : null },
    cantos: { ul: toWorld(0, 0), ur: toWorld(img.w, 0), ll: toWorld(0, img.h) },
    M: best.o.M, s: best.s, t: [best.tx, best.tz],
  }
  console.log(`${page} ${pc.arquivo}: giro ${best.o.rot}° espelho ${best.o.mirror} escala ${best.s.toFixed(3)} erro ${best.e.toFixed(3)} m encaixe ${(100 * inl / pts.length).toFixed(1)}% (${pts.length} pts, ${segs.length} segs)`)
}

// Blocos que o GLB do site traz girados: gira o bloco inteiro 180° (térreo e superior juntos, mantendo o
// encaixe entre eles) em torno do ponto que leva cada escada indicada sobre a escada correspondente do vizinho.
const worldOf = (pg, X, Y) => { const u = X / pg.img.pxPorMetro, v = Y / pg.img.pxPorMetro; return [pg.s * (pg.M[0] * u + pg.M[1] * v) + pg.t[0], pg.s * (pg.M[2] * u + pg.M[3] * v) + pg.t[1]] }
const stairOf = (page, num) => {
  const L = JSON.parse(fs.readFileSync(path.join(renderDir, `labels-${page}.json`), 'utf8'))
  const s = (L.salas ?? L).find((x) => x.num === num)
  if (!s || s.tipo !== 'escada') throw new Error(`página ${page}: sala ${num} não é escada`)
  return s
}
for (const [blockId, bc] of Object.entries(config.blocos ?? {})) {
  if (!bc.girar180) continue
  const pages = Object.keys(result.paginas).filter((p) => result.paginas[p].bloco === blockId)
  const pivots = bc.escadas.map(({ pagina, sala, alvo: [refPage, refSala] }) => {
    const s = stairOf(pagina, sala), r = stairOf(refPage, refSala)
    const old = worldOf(result.paginas[pagina], s.x, s.y), target = worldOf(result.paginas[refPage], r.x, r.y)
    return [(old[0] + target[0]) / 2, (old[1] + target[1]) / 2]
  })
  const piv = [pivots.reduce((a, p) => a + p[0], 0) / pivots.length, pivots.reduce((a, p) => a + p[1], 0) / pivots.length]
  for (const p of pages) {
    const pg = result.paginas[p]
    pg.M = pg.M.map((m) => -m)
    pg.t = [2 * piv[0] - pg.t[0], 2 * piv[1] - pg.t[1]]
    pg.ajuste.giro = (pg.ajuste.giro + 180) % 360
    pg.ajuste.corrigido = true
    pg.ajuste.nota = bc.nota ?? 'girado 180°'
    pg.ajuste.motivo = bc.motivo
    const r = (x) => +x.toFixed(3)
    pg.cantos = { ul: worldOf(pg, 0, 0).map(r), ur: worldOf(pg, pg.img.w, 0).map(r), ll: worldOf(pg, 0, pg.img.h).map(r) }
  }
  for (const { pagina, sala, alvo: [refPage, refSala] } of bc.escadas) {
    const s = stairOf(pagina, sala), r = stairOf(refPage, refSala)
    const a = worldOf(result.paginas[pagina], s.x, s.y), b = worldOf(result.paginas[refPage], r.x, r.y)
    const d = Math.hypot(a[0] - b[0], a[1] - b[1])
    result.paginas[pagina].ajuste.erroEscada_m = +d.toFixed(2)
    console.log(`Bloco ${blockId} girado 180° em (${piv.map((n) => n.toFixed(2))}): escada p${pagina}#${sala} → p${refPage}#${refSala} a ${d.toFixed(2)} m`)
  }
}

// Junções: corredores que continuam de uma planta para a outra (sem parede no meio). Mede a faixa livre do
// corredor em cada planta, desloca o bloco da 2ª página para os eixos coincidirem e gera juncao-N.png
// (circulação pintada por cima, branco = manter a planta) apagando só as paredes que atravessam a passagem.
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const CIRC_RGB = hexRgb(config.tipos.circ[1]), EXT_RGB = hexRgb(config.tipos.externo[1])
const ROOM_RGBS = Object.values(config.tipos).map((v) => hexRgb(v[1]))
const same = (c, ref) => c && c[0] === ref[0] && c[1] === ref[1] && c[2] === ref[2]
const fills = {}
const pixelAt = (page, wx, wz) => {
  const pg = result.paginas[page], img = (fills[page] ??= readPngRgb(path.join(renderDir, `fill-${page}.png`)))
  const a = (wx - pg.t[0]) / pg.s, b = (wz - pg.t[1]) / pg.s
  const X = Math.round((pg.M[0] * a + pg.M[2] * b) * pg.img.pxPorMetro), Y = Math.round((pg.M[1] * a + pg.M[3] * b) * pg.img.pxPorMetro)
  if (X < 0 || Y < 0 || X >= img.w || Y >= img.h) return null
  const j = (Y * img.w + X) * img.bpp
  return [img.px[j], img.px[j + 1], img.px[j + 2]]
}
const recomputeCorners = (pg) => {
  const r = (x) => +x.toFixed(3)
  pg.cantos = { ul: worldOf(pg, 0, 0).map(r), ur: worldOf(pg, pg.img.w, 0).map(r), ll: worldOf(pg, 0, pg.img.h).map(r) }
}
const juncoes = config.juncoes ?? []
const toXZ = (j, along, across) => (j.eixo === 'x' ? [along, across] : [across, along])
const bandOf = (j, page, alongProbe) => {
  const los = [], his = []
  for (const d of [-0.4, -0.2, 0, 0.2, 0.4]) {
    const at = (c) => pixelAt(page, ...toXZ(j, alongProbe + d, c))
    let start = null
    for (let k = 0; k <= 20 && start === null; k++) for (const c of [j.perto + k * 0.05, j.perto - k * 0.05]) if (same(at(c), CIRC_RGB)) { start = c; break }
    if (start === null) continue
    let lo = start, hi = start
    while (lo - start > -4 && same(at(lo - 0.05), CIRC_RGB)) lo -= 0.05
    while (hi - start < 4 && same(at(hi + 0.05), CIRC_RGB)) hi += 0.05
    los.push(lo); his.push(hi)
  }
  if (!los.length) throw new Error(`junção "${j.nome}": sem corredor na página ${page} perto de ${j.perto}`)
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1]
  return [med(los), med(his)]
}
const shifts = {}
for (const j of juncoes) {
  const ba = bandOf(j, j.paginas[0], j.sondas[0]), bb = bandOf(j, j.paginas[1], j.sondas[1])
  j._antes = (ba[0] + ba[1]) / 2 - (bb[0] + bb[1]) / 2
  ;(shifts[result.paginas[j.paginas[1]].bloco] ??= []).push(j._antes)
}
for (const [blockId, list] of Object.entries(shifts)) {
  const dv = list.reduce((a, b) => a + b, 0) / list.length
  if (Math.abs(dv) > 1.5) { console.log(`Bloco ${blockId}: desalinhamento de corredor ${dv.toFixed(2)} m grande demais, não aplicado`); continue }
  const idx = juncoes.find((j) => result.paginas[j.paginas[1]].bloco === blockId).eixo === 'x' ? 1 : 0
  for (const pg of Object.values(result.paginas)) if (pg.bloco === blockId) { pg.t[idx] += dv; recomputeCorners(pg) }
  console.log(`Bloco ${blockId} deslocado ${dv.toFixed(2)} m para alinhar os corredores das junções`)
}
const G = 40
result.juncoes = juncoes.map((j, n) => {
  const [pa, pb] = j.paginas
  const ba = bandOf(j, pa, j.sondas[0]), bb = bandOf(j, pb, j.sondas[1])
  const lo = Math.min(ba[0], bb[0]), hi = Math.max(ba[1], bb[1])
  const [a0, a1] = j.trecho
  const nA = Math.round((a1 - a0) * G), nC = Math.round((hi - lo) * G)
  const cls = new Uint8Array(nA * nC) // 0 manter, 1 pintar, 2 parede
  for (let c = 0; c < nC; c++) for (let a = 0; a < nA; a++) {
    const [wx, wz] = toXZ(j, a0 + (a + 0.5) / G, lo + (c + 0.5) / G)
    let px = pixelAt(pb, wx, wz)
    if (!px || same(px, [255, 255, 255])) px = pixelAt(pa, wx, wz)
    cls[c * nA + a] = !px || same(px, [255, 255, 255]) || same(px, CIRC_RGB) || same(px, EXT_RGB) ? 1 : ROOM_RGBS.some((r) => same(px, r)) ? 0 : 2
  }
  // parede paralela ao corredor (lateral, fundo da escada) fica; o que a cruza sai, a não ser que esteja presa a uma paralela
  const keep = new Uint8Array(nA * nC)
  for (let c = 0; c < nC; c++) for (let a = 0; a < nA;) {
    if (cls[c * nA + a] !== 2) { a++; continue }
    let e = a; while (e < nA && cls[c * nA + e] === 2) e++
    if (e - a >= 0.6 * G) for (let k = a; k < e; k++) keep[c * nA + k] = 1
    a = e
  }
  // demais traços: só ficam tocos curtos presos a uma parede paralela (laterais da escada);
  // o que cobre 60% ou mais da largura do corredor (parede de ponta, porta, arco) é aberto
  const seen = new Uint8Array(nA * nC)
  for (let s = 0; s < cls.length; s++) {
    if (cls[s] !== 2 || keep[s] || seen[s]) continue
    const comp = [s]; seen[s] = 1
    let minC = nC, maxC = -1, touches = false
    for (let q = 0; q < comp.length; q++) {
      const i = comp[q], a = i % nA, c = (i / nA) | 0
      minC = Math.min(minC, c); maxC = Math.max(maxC, c)
      for (let dc = -1; dc <= 1; dc++) for (let da = -1; da <= 1; da++) {
        const a2 = a + da, c2 = c + dc, i2 = c2 * nA + a2
        if ((!da && !dc) || a2 < 0 || c2 < 0 || a2 >= nA || c2 >= nC || cls[i2] !== 2) continue
        if (keep[i2]) { touches = true; continue }
        if (!seen[i2]) { seen[i2] = 1; comp.push(i2) }
      }
    }
    if (touches && maxC - minC + 1 < 0.6 * nC) for (const i of comp) keep[i] = 2
  }
  const [W, H] = j.eixo === 'x' ? [nA, nC] : [nC, nA]
  const rgb = Buffer.alloc(W * H * 3, 255)
  let erased = 0
  for (let c = 0; c < nC; c++) for (let a = 0; a < nA; a++) {
    const i = c * nA + a
    if (!(cls[i] === 1 || (cls[i] === 2 && !keep[i]))) continue
    if (cls[i] === 2) erased++
    const [x, y] = j.eixo === 'x' ? [a, c] : [c, a]
    rgb.set(CIRC_RGB, (y * W + x) * 3)
  }
  const file = `juncao-${n + 1}.png`
  writePng(path.join(path.dirname(outFile), file), W, H, rgb)
  const [x0, z0] = toXZ(j, a0, lo), [x1, z1] = toXZ(j, a1, hi)
  const r = (v) => +v.toFixed(2)
  console.log(`Junção "${j.nome}": faixa ${r(ba[0])}..${r(ba[1])} × ${r(bb[0])}..${r(bb[1])} (antes ${r(j._antes)} m de diferença), ${(erased / G / G).toFixed(2)} m² de parede aberta`)
  return {
    nome: j.nome, nivel: result.paginas[pa].nivel, paginas: j.paginas, blocos: [result.paginas[pa].bloco, result.paginas[pb].bloco],
    eixo: j.eixo, faixas_m: [ba.map(r), bb.map(r)], desalinhamentoAntes_m: r(j._antes), semParede: true,
    retangulo: [r(Math.min(x0, x1)), r(Math.min(z0, z1)), r(Math.max(x0, x1)), r(Math.max(z0, z1))], imagem: file,
  }
})
if (config.implantacao) result.implantacao = { origem: 'desenho do usuário sobre a montagem (sem planta)', ...config.implantacao }
fs.writeFileSync(outFile, JSON.stringify(result, null, 1))
