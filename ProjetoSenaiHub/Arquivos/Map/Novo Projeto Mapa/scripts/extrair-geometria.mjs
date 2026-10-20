// Vetoriza dados/render/ids-N.png (salas, paredes e circulação) em polígonos no mundo (metros) para o Blender.
// Aplica as junções sem parede do montagem.json e grava dados/salas-geo.json.
// Uso: node extrair-geometria.mjs <pasta dados> [saida.json] [--diag <pasta>]
//   --diag grava arcos-N.png: parede mantida em preto, traço removido em vermelho.
// Cada objeto traz "loops": contornos fechados [[x, z], ...]. Contorno externo e buraco têm sinais de área
// opostos; o Blender preenche por par/ímpar, então basta mandar todos os loops juntos.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const argv = process.argv.slice(2)
const di = argv.indexOf('--diag')
const DIAG = di >= 0 ? argv.splice(di, 2)[1] : null
const [dadosDir, outArg] = argv
const outFile = outArg ?? path.join(dadosDir, 'salas-geo.json')
const montagem = JSON.parse(fs.readFileSync(path.join(dadosDir, 'montagem.json'), 'utf8'))
const SIMPLIFICA_PX = 1.5
const AREA_MIN_M2 = 0.05
const PE_DIREITO_M = 2.56

function readPngR(file) {
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
  const r = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) r[i] = px[i * bpp]
  return { w, h, r }
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

// Contornos pelas bordas dos pixels (crack following). Sentido horário na tela; em vértice ambíguo vira à
// direita, o que mantém separados os pixels que só se tocam na diagonal.
function traceLoops(code, w, h, alvo) {
  const W1 = w + 1
  const out = new Map()
  const add = (x0, y0, x1, y1) => {
    const k = y0 * W1 + x0
    let l = out.get(k)
    if (!l) out.set(k, (l = []))
    l.push({ x1, y1, dx: x1 - x0, dy: y1 - y0, used: false })
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (code[y * w + x] !== alvo) continue
    if (y === 0 || code[(y - 1) * w + x] !== alvo) add(x, y, x + 1, y)
    if (x === w - 1 || code[y * w + x + 1] !== alvo) add(x + 1, y, x + 1, y + 1)
    if (y === h - 1 || code[(y + 1) * w + x] !== alvo) add(x + 1, y + 1, x, y + 1)
    if (x === 0 || code[y * w + x - 1] !== alvo) add(x, y + 1, x, y)
  }
  const loops = []
  for (const [k0, l0] of out) for (const e0 of l0) {
    if (e0.used) continue
    const pts = [[k0 % W1, Math.floor(k0 / W1)]]
    let e = e0
    for (;;) {
      e.used = true
      pts.push([e.x1, e.y1])
      const cand = (out.get(e.y1 * W1 + e.x1) ?? []).filter((c) => !c.used)
      if (!cand.length) break
      const turn = (c) => (c.dx === -e.dy && c.dy === e.dx ? 0 : c.dx === e.dx && c.dy === e.dy ? 1 : 2)
      cand.sort((a, b) => turn(a) - turn(b))
      e = cand[0]
    }
    pts.pop()
    loops.push(pts)
  }
  return loops
}

function dropCollinear(pts) {
  const n = pts.length, res = []
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[(i + n - 1) % n], [bx, by] = pts[i], [cx, cy] = pts[(i + 1) % n]
    if ((bx - ax) * (cy - by) - (by - ay) * (cx - bx) !== 0) res.push(pts[i])
  }
  return res
}

function dp(pts, eps) {
  if (pts.length < 3) return pts
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1
  let best = -1, bi = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L
    if (d > best) { best = d; bi = i }
  }
  if (best <= eps) return [pts[0], pts[pts.length - 1]]
  return [...dp(pts.slice(0, bi + 1), eps).slice(0, -1), ...dp(pts.slice(bi), eps)]
}

function simplifyLoop(pts, eps) {
  pts = dropCollinear(pts)
  if (pts.length < 4) return pts
  let far = 0, fd = -1
  for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i } }
  const a = dp(pts.slice(0, far + 1), eps), b = dp([...pts.slice(far), pts[0]], eps)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

// Arcos de porta (e folhas soltas) vêm desenhados como traços finos de parede. Traço fino (some numa abertura
// morfológica 3×3) só fica se fizer parte de uma reta de pelo menos RETA_MIN_M, em qualquer ângulo; o resto
// volta para a sala vizinha. Paredes grossas não são tocadas.
const RETA_MIN_M = 1.2
function removeArcos(r, w, h, ppm) {
  const N = w * h, isW = (i) => r[i] === 1
  const ero = new Uint8Array(N), grossa = new Uint8Array(N), dil = new Uint8Array(N)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    let ok = isW(i)
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) ok = isW(i + dy * w + dx)
    ero[i] = ok ? 1 : 0
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue
      const j = Y * w + X
      if (ero[j] && isW(i)) grossa[i] = 1
      if (isW(j)) dil[i] = 1
    }
  }
  const L = Math.round(RETA_MIN_M * ppm), precisa = Math.ceil(L * 0.9)
  const dirs = []
  for (let a = 0; a < 360; a += 4) dirs.push([Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)])
  const tirar = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!isW(i) || grossa[i]) continue
    let reta = false
    for (const [cx, cy] of dirs) {
      let hit = 0
      for (let t = 1; t <= L; t++) {
        const X = Math.round(x + cx * t), Y = Math.round(y + cy * t)
        if (X >= 0 && Y >= 0 && X < w && Y < h && dil[Y * w + X]) hit++
        else if (t - hit > L - precisa) break
      }
      if (hit >= precisa) { reta = true; break }
    }
    if (!reta) tirar.push(i)
  }
  for (const i of tirar) r[i] = 255
  let pend = tirar
  while (pend.length) {
    const prox = [], novo = []
    for (const i of pend) {
      const x = i % w, y = (i / w) | 0, cont = new Map()
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue
        const c = r[Y * w + X]
        if (c !== 1 && c !== 255) cont.set(c, (cont.get(c) ?? 0) + 1)
      }
      if (!cont.size) { prox.push(i); continue }
      novo.push([i, [...cont].sort((a, b) => b[1] - a[1])[0][0]])
    }
    if (!novo.length) { for (const i of prox) r[i] = 2; break }
    for (const [i, c] of novo) r[i] = c
    pend = prox
  }
  return tirar.length
}

const area = (pts) => { let s = 0; for (let i = 0, n = pts.length; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; s += x0 * y1 - x1 * y0 } return s / 2 }

const paginas = Object.entries(montagem.paginas).map(([n, pg]) => ({ n: Number(n), pg }))
const proximoPiso = (pg) => {
  const acima = paginas.filter((o) => o.pg.bloco === pg.bloco && o.pg.pisoAltura_m > pg.pisoAltura_m + 0.1).map((o) => o.pg.pisoAltura_m)
  return acima.length ? Math.min(...acima) : null
}

const result = { origem: 'extrair-geometria.mjs sobre dados/render/ids-N.png + montagem.json', unidade: 'metros', eixos: montagem.eixos, paginas: [] }
for (const { n, pg } of paginas) {
  const { w, h, r } = readPngR(path.join(dadosDir, 'render', `ids-${n}.png`))
  const labels = JSON.parse(fs.readFileSync(path.join(dadosDir, 'render', `labels-${n}.json`), 'utf8'))
  const ppm = pg.img.pxPorMetro
  const toWorld = (X, Y) => {
    const u = X / ppm, v = Y / ppm
    return [pg.s * (pg.M[0] * u + pg.M[1] * v) + pg.t[0], pg.s * (pg.M[2] * u + pg.M[3] * v) + pg.t[1]]
  }

  const original = DIAG ? Uint8Array.from(r) : null
  const arcos = removeArcos(r, w, h, ppm)
  if (DIAG) {
    const rgb = Buffer.alloc(w * h * 3, 255)
    for (let i = 0; i < w * h; i++) {
      const c = original[i] === 1 ? (r[i] === 1 ? [20, 20, 20] : [230, 30, 30]) : r[i] ? [235, 235, 235] : [255, 255, 255]
      rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
    }
    writePng(path.join(DIAG, `arcos-${n}.png`), w, h, rgb)
  }

  let abertos = 0
  for (const j of montagem.juncoes ?? []) {
    if (!j.semParede || !j.paginas.includes(n)) continue
    const [x0, z0, x1, z1] = j.retangulo
    for (let i = 0; i < w * h; i++) {
      if (r[i] !== 1) continue
      const [x, z] = toWorld((i % w) + 0.5, Math.floor(i / w) + 0.5)
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) { r[i] = 2; abertos++ }
    }
  }

  const vetor = (alvo) => {
    const loops = []
    for (const lp of traceLoops(r, w, h, alvo)) {
      const s = simplifyLoop(lp, SIMPLIFICA_PX)
      if (s.length < 3) continue
      const mundo = s.map(([X, Y]) => toWorld(X, Y).map((v) => +v.toFixed(3)))
      const a = area(mundo)
      if (Math.abs(a) < AREA_MIN_M2) continue
      loops.push({ area_m2: +a.toFixed(2), pts: mundo })
    }
    return loops
  }

  const presentes = new Set(r)
  const salas = []
  for (const reg of labels.regioes) {
    if (!presentes.has(reg.codigo)) continue
    const loops = vetor(reg.codigo)
    if (!loops.length) continue
    const total = loops.reduce((s, l) => s + Math.abs(l.area_m2) * Math.sign(l.area_m2), 0)
    salas.push({ codigo: reg.codigo, nome: reg.nome, tipo: reg.tipo, area_m2: +Math.abs(total).toFixed(1), loops })
  }
  const prox = proximoPiso(pg)
  const altura = +((prox ?? pg.topoBloco_m ?? pg.pisoAltura_m + PE_DIREITO_M) - pg.pisoAltura_m).toFixed(2)
  result.paginas.push({
    pagina: n, arquivo: pg.arquivo, titulo: pg.titulo, bloco: pg.bloco, nivel: pg.nivel,
    piso_m: pg.pisoAltura_m, base_m: pg.baseBloco_m, topo_m: pg.topoBloco_m, alturaParede_m: altura,
    salas, circulacao: vetor(2), paredes: vetor(1),
  })
  const nPts = (ls) => ls.reduce((s, l) => s + l.pts.length, 0)
  console.log(`${n} ${pg.arquivo}: ${salas.length} regiões, paredes ${nPts(result.paginas.at(-1).paredes)} pts, altura ${altura} m, ${arcos} px de arco removidos${abertos ? `, ${abertos} px de parede abertos nas junções` : ''}`)
}
result.implantacao = montagem.implantacao
fs.writeFileSync(outFile, JSON.stringify(result))
console.log(`→ ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`)
