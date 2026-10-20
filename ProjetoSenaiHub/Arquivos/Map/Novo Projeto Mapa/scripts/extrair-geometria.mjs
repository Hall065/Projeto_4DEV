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

// Degraus de escada vêm desenhados como linhas finas paralelas bem próximas (~0,3 m). Linha fina com pelo menos
// DEGRAU_MIN_LINHAS travessias de parede num raio de DEGRAU_RAIO_M (num eixo), e no máximo
// DEGRAU_LARGURA_MAX_M de comprimento, vira DEGRAU; grupos menores que DEGRAU_GRUPO_MIN_M são descartados.
// Pixel com degrau dos dois lados (num eixo, até ESCADA_VAO_M, sem cruzar parede grossa) vira ESCADA, ou DEGRAU se
// for linha fina (linha de percurso, borda de patamar); linhas finas ligadas a esses DEGRAUs até ESCADA_SOBRA_M fora
// do grupo também viram DEGRAU. Paredes grossas não são tocadas, exceto pontos menores que ESCADA_PONTO_M (marcas da
// linha de percurso).
const DEGRAU = 3, ESCADA = 4
const DEGRAU_RAIO_M = 0.9, DEGRAU_MIN_LINHAS = 3, DEGRAU_LARGURA_MAX_M = 3.6, DEGRAU_GRUPO_MIN_M = 0.6, ESCADA_VAO_M = 0.45, ESCADA_SOBRA_M = 0.6, ESCADA_PONTO_M = 0.3
function marcaEscadas(r, w, h, ppm) {
  const N = w * h, isW = (i) => r[i] === 1
  const grossa = new Uint8Array(N)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let ok = true
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) ok = isW((y + dy) * w + x + dx)
    if (ok) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) grossa[(y + dy) * w + x + dx] = 1
  }
  const R = Math.round(DEGRAU_RAIO_M * ppm)
  const travessias = (x, y, dx, dy) => {
    let n = 0, dentro = true
    for (let t = 1; t <= R; t++) {
      const X = x + dx * t, Y = y + dy * t
      if (X < 0 || Y < 0 || X >= w || Y >= h) break
      const i = Y * w + X
      if (r[i] === 0) break
      const parede = isW(i)
      if (parede && grossa[i]) break
      if (parede && !dentro) n++
      dentro = parede
    }
    return n
  }
  const Lmax = Math.round(DEGRAU_LARGURA_MAX_M * ppm)
  const corrida = (x, y, dx, dy) => {
    let n = 1
    for (const s of [1, -1]) for (let t = 1; t <= Lmax; t++) {
      const X = x + dx * t * s, Y = y + dy * t * s
      if (X < 0 || Y < 0 || X >= w || Y >= h || !isW(Y * w + X) || grossa[Y * w + X]) break
      n++
    }
    return n
  }
  const marca = new Uint8Array(N)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!isW(i) || grossa[i]) continue
    const eixoX = travessias(x, y, 1, 0) + travessias(x, y, -1, 0)
    const eixoY = travessias(x, y, 0, 1) + travessias(x, y, 0, -1)
    if ((eixoX >= DEGRAU_MIN_LINHAS && corrida(x, y, 0, 1) <= Lmax) || (eixoY >= DEGRAU_MIN_LINHAS && corrida(x, y, 1, 0) <= Lmax)) marca[i] = 1
  }
  const Lmin = DEGRAU_GRUPO_MIN_M * ppm, G = Math.round(ESCADA_VAO_M * ppm)
  const visto = new Uint8Array(N), grupo = new Uint8Array(N), caixas = [], grupos = []
  let degraus = 0
  for (let s = 0; s < N; s++) {
    if (!marca[s] || visto[s]) continue
    const comp = [s]
    visto[s] = 1
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w, y = (i / w) | 0
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (let dy = -G; dy <= G; dy++) for (let dx = -G; dx <= G; dx++) {
        const X = x + dx, Y = y + dy
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue
        const j = Y * w + X
        if (marca[j] && !visto[j]) { visto[j] = 1; comp.push(j) }
      }
    }
    if (Math.min(x1 - x0, y1 - y0) < Lmin) continue
    for (const i of comp) { r[i] = DEGRAU; grupo[i] = 1 }
    degraus += comp.length
    caixas.push([x0, y0, x1, y1])
    grupos.push(comp)
  }
  const V = Math.round(ESCADA_VAO_M * ppm)
  const achaDegrau = (x, y, dx, dy) => {
    for (let t = 1; t <= V; t++) {
      const X = x + dx * t, Y = y + dy * t
      if (X < 0 || Y < 0 || X >= w || Y >= h) return false
      const j = Y * w + X
      if (grupo[j]) return true
      if (grossa[j]) return false
    }
    return false
  }
  const entre = (x, y) => (achaDegrau(x, y, 1, 0) && achaDegrau(x, y, -1, 0)) || (achaDegrau(x, y, 0, 1) && achaDegrau(x, y, 0, -1))
  const P = Math.round(ESCADA_PONTO_M * ppm)
  const ponto = (i) => {
    const x = i % w, y = (i / w) | 0
    let x0 = x, x1 = x, y0 = y, y1 = y
    while (x0 > 0 && grossa[y * w + x0 - 1] && x - x0 < P) x0--
    while (x1 < w - 1 && grossa[y * w + x1 + 1] && x1 - x < P) x1++
    while (y0 > 0 && grossa[(y0 - 1) * w + x] && y - y0 < P) y0--
    while (y1 < h - 1 && grossa[(y1 + 1) * w + x] && y1 - y < P) y1++
    return x1 - x0 < P && y1 - y0 < P
  }
  const fina = (i) => isW(i) && (!grossa[i] || ponto(i))
  const fila = []
  for (const [x0, y0, x1, y1] of caixas) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x
    if (r[i] === DEGRAU || (grossa[i] && !ponto(i)) || !entre(x, y)) continue
    if (fina(i)) { r[i] = DEGRAU; fila.push(i); degraus++ } else r[i] = ESCADA
  }
  const E = Math.round(ESCADA_SOBRA_M * ppm)
  for (let k = 0; k < fila.length; k++) {
    const x = fila[k] % w, y = (fila[k] / w) | 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy
      if (X < 0 || Y < 0 || X >= w || Y >= h || !caixas.some(([a, b, c, d]) => X >= a - E && X <= c + E && Y >= b - E && Y <= d + E)) continue
      const j = Y * w + X
      if (fina(j)) { r[j] = DEGRAU; fila.push(j); degraus++ }
    }
  }
  return { degraus, grupos, grossa }
}

// Lances de cada escada (pixels dos degraus de grupos a até ESCADA_JUNTA_M): ângulo dos degraus pelo histograma mais
// concentrado da projeção na normal; colunas (lances lado a lado) separadas por vão sem degrau ao longo do degrau;
// em cada coluna, uma linha de degrau por pico do histograma ao longo da subida.
const ESCADA_JUNTA_M = 1.0, LANCE_VAO_M = 0.12, LANCE_LARGURA_MIN_M = 0.4, LINHAS_MIN = 5, LIVRE_MAX_M = 3
function analisaEscadas(grupos, r, grossa, w, h, ppm) {
  const J = ESCADA_JUNTA_M * ppm
  const caixa = (g) => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
    for (const i of g) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    return [x0, y0, x1, y1]
  }
  const cx = grupos.map(caixa), pai = grupos.map((_, i) => i)
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])))
  for (let i = 0; i < grupos.length; i++) for (let j = i + 1; j < grupos.length; j++) {
    const [a, b] = [cx[i], cx[j]]
    if (a[0] - J <= b[2] && b[0] - J <= a[2] && a[1] - J <= b[3] && b[1] - J <= a[3]) pai[raiz(i)] = raiz(j)
  }
  const juntos = new Map()
  grupos.forEach((g, i) => { const k = raiz(i); juntos.set(k, (juntos.get(k) ?? []).concat(g)) })

  const out = []
  for (const pix of juntos.values()) {
    const P = pix.map((i) => [i % w, (i / w) | 0])
    let melhor = -1, theta = 0
    for (let a = 0; a < 180; a += 0.5) {
      const t = (a * Math.PI) / 180, s = Math.sin(t), c = Math.cos(t), hist = new Map()
      for (const [x, y] of P) { const k = Math.round(-x * s + y * c); hist.set(k, (hist.get(k) ?? 0) + 1) }
      let sc = 0
      for (const n of hist.values()) sc += n * n
      if (sc > melhor) { melhor = sc; theta = t }
    }
    const t = [Math.cos(theta), Math.sin(theta)], n = [-Math.sin(theta), Math.cos(theta)]
    const UV = P.map(([x, y]) => [x * t[0] + y * t[1], x * n[0] + y * n[1]])
    const umin = Math.floor(Math.min(...UV.map((p) => p[0])))
    const hu = new Array(Math.ceil(Math.max(...UV.map((p) => p[0]))) - umin + 2).fill(0)
    for (const [u] of UV) hu[Math.floor(u) - umin]++
    const corte = Math.max(...hu) * 0.1, vao = Math.max(2, Math.round(LANCE_VAO_M * ppm))
    const colunas = []
    for (let k = 0; k < hu.length;) {
      if (hu[k] <= corte) { k++; continue }
      let fim = k, buraco = 0
      for (let q = k; q < hu.length; q++) {
        if (hu[q] > corte) { fim = q; buraco = 0 } else if (++buraco >= vao) break
      }
      colunas.push([k + umin, fim + umin + 1])
      k = fim + 1
    }
    const lances = []
    for (const [u0, u1] of colunas) {
      if (u1 - u0 < LANCE_LARGURA_MIN_M * ppm) continue
      const vs = UV.filter(([u]) => u >= u0 && u < u1).map(([, v]) => v)
      const vmin = Math.floor(Math.min(...vs)), hv = new Array(Math.ceil(Math.max(...vs)) - vmin + 2).fill(0)
      for (const v of vs) hv[Math.floor(v) - vmin]++
      const lim = (u1 - u0) * 0.4, linhas = []
      for (let k = 0; k < hv.length;) {
        if (hv[k] < lim) { k++; continue }
        let s = 0, m = 0
        for (; k < hv.length && hv[k] >= lim * 0.5; k++) { s += hv[k]; m += hv[k] * (k + vmin + 0.5) }
        linhas.push(m / s)
      }
      if (linhas.length >= 2) lances.push({ u0, u1, linhas })
    }
    if (lances.reduce((s, l) => s + l.linhas.length, 0) < LINHAS_MIN) continue
    const livre = (l, lado) => {
      const v0 = lado < 0 ? l.linhas[0] : l.linhas.at(-1), ds = []
      for (const f of [0.25, 0.5, 0.75]) {
        const u = l.u0 + (l.u1 - l.u0) * f
        let d = 0
        for (; d < LIVRE_MAX_M * ppm; d++) {
          const v = v0 + lado * (d + 1), X = Math.round(u * t[0] + v * n[0]), Y = Math.round(u * t[1] + v * n[1])
          if (X < 0 || Y < 0 || X >= w || Y >= h) break
          const i = Y * w + X
          if (r[i] === 0 || grossa[i]) break
        }
        ds.push(d)
      }
      return ds.sort((a, b) => a - b)[1]
    }
    for (const l of lances) l.livre = [livre(l, -1), livre(l, 1)]
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length
    out.push({ t, n, lances, pixels: pix.length, cx, cy })
  }
  return out
}

const area = (pts) => { let s = 0; for (let i = 0, n = pts.length; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; s += x0 * y1 - x1 * y0 } return s / 2 }

const paginas = Object.entries(montagem.paginas).map(([n, pg]) => ({ n: Number(n), pg }))
const proximoPiso = (pg) => {
  const acima = paginas.filter((o) => o.pg.bloco === pg.bloco && o.pg.pisoAltura_m > pg.pisoAltura_m + 0.1).map((o) => o.pg.pisoAltura_m)
  return acima.length ? Math.min(...acima) : null
}

// Escada 3D: degraus como blocos maciços do piso de baixo até a altura de cada degrau, subindo por igual de `de` até
// `ate`. Escada em U: 1º lance até o patamar (meia altura), 2º lance de volta até o andar de cima. O 1º lance é o que
// aparece na planta de baixo; sem ela, gira para o mesmo lado da escada de referência (torre do A, seta do usuário).
// Ajustes por escada em salas-config.json → escadas3d (perto [x, z], de, ate, tipo, sobe, primeiro, patamar, ignorar).
// Desenho com poucos degraus para a altura (espelho > ESPELHO_MAX_M): os degraus são redistribuídos no mesmo trecho
// desenhado com espelho ESPELHO_ALVO_M, sem sair da planta.
// até ENTORNO_M da escada 3D o desenho 2D da escada vira piso comum; parede solta ali e sala com menos de SOLTO_MAX_M2
// também
const ENTORNO_M = 1.2, SOLTO_MAX_M2 = 1.5, LAJE_ESCADA_M = 0.2, AREA_RECUO_M = 0.1, AREA_ENTRADA_M = 0.5, GIRO_REF = 1, ESPELHO_MAX_M = 0.21, ESPELHO_ALVO_M = 0.18, ESPELHO_PADRAO_M = 0.17, LAJE_M = 0.12, PATAMAR_PADRAO_M = 1.2
const cfgEscadas = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(dadosDir, '..', 'config', 'salas-config.json'), 'utf8')).escadas3d ?? [] } catch { return [] }
})()
const lancesPorPagina = []
function montaEscadas() {
  const eixo = (s) => ({ '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] })[s]
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
  const mundo = (e, U, V) => [e.origem[0] + U * e.eU[0] + V * e.eV[0], e.origem[1] + U * e.eU[1] + V * e.eV[1]].map((q) => +q.toFixed(3))
  const local = (e, p) => { const d = [p[0] - e.origem[0], p[1] - e.origem[1]]; return [dot(d, e.eU), dot(d, e.eV)] }
  const ret = (e, u0, u1, v0, v1) => [mundo(e, u0, v0), mundo(e, u1, v0), mundo(e, u1, v1), mundo(e, u0, v1)]
  const cantos = (e) => e.lances.flatMap((l) => [mundo(e, l.u0, l.linhas[0]), mundo(e, l.u1, l.linhas.at(-1))])
  const caixa = (e) => { const p = cantos(e); return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))] }
  const cx = lancesPorPagina.map(caixa), pai = cx.map((_, i) => i)
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])))
  for (let i = 0; i < cx.length; i++) for (let j = i + 1; j < cx.length; j++) {
    const [a, b] = [cx[i], cx[j]], J = ESCADA_JUNTA_M
    if (a[0] - J <= b[2] && b[0] - J <= a[2] && a[1] - J <= b[3] && b[1] - J <= a[3]) pai[raiz(i)] = raiz(j)
  }
  const grupos = new Map()
  lancesPorPagina.forEach((e, i) => { const k = raiz(i); grupos.set(k, (grupos.get(k) ?? []).concat([e])) })

  const escadas = []
  for (const membros of grupos.values()) {
    const fonte = membros.reduce((a, b) => (b.pixels > a.pixels ? b : a))
    const cb = caixa(fonte), centro = [(cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2]
    const cfg = cfgEscadas.find((c) => Math.hypot(c.perto[0] - centro[0], c.perto[1] - centro[1]) < 2.5) ?? {}
    const id = `${fonte.bloco}@${centro[0].toFixed(1)},${centro[1].toFixed(1)}`
    if (cfg.ignorar) { console.log(`escada ${id}: ignorada (${cfg.motivo ?? 'config'})`); continue }
    let cols = fonte.lances.map((l) => ({ ...l })).sort((a, b) => a.u0 - b.u0)
    const tipo = cfg.tipo ?? (cols.length >= 2 ? 'U' : 'reta')
    if (tipo === 'U' && cols.length === 1) { const l = cols[0], m = (l.u0 + l.u1) / 2; cols = [{ ...l, u1: m }, { ...l, u0: m }] }
    if (tipo === 'U' && cols.length > 2) cols = [...cols].sort((a, b) => b.linhas.length - a.linhas.length).slice(0, 2).sort((a, b) => a.u0 - b.u0)
    if (tipo === 'reta' && cols.length > 1) {
      const maior = cols.reduce((a, b) => (b.linhas.length > a.linhas.length ? b : a))
      cols = [{ ...maior, u0: Math.min(...cols.map((l) => l.u0)), u1: Math.max(...cols.map((l) => l.u1)) }]
    }
    const L = tipo === 'U' ? 2 * Math.max(...cols.map((l) => l.linhas.length)) : cols[0].linhas.length
    const pisos = [...new Set(membros.map((m) => m.piso_m))].sort((a, b) => a - b)
    let de = pisos[0], ate = pisos.length > 1 ? pisos.at(-1) : null
    if (ate == null) {
      const p = de, pg = paginas.find((o) => o.n === fonte.pagina).pg
      const doBloco = paginas.filter((o) => o.pg.bloco === fonte.bloco).map((o) => o.pg.pisoAltura_m)
      const acima = doBloco.filter((q) => q > p + 0.1), abaixo = doBloco.filter((q) => q < p - 0.1)
      const opcoes = [acima.length && [p, Math.min(...acima)], abaixo.length && [Math.max(...abaixo), p], pg.topoBloco_m && [p, pg.topoBloco_m]]
      const ok = opcoes.find((o) => o && (o[1] - o[0]) / L >= 0.14 && (o[1] - o[0]) / L <= ESPELHO_MAX_M)
      ;[de, ate] = ok ?? [p, +(p + ESPELHO_PADRAO_M * L).toFixed(2)]
    }
    de = cfg.de ?? de
    ate = cfg.ate ?? ate
    const confirmar = cfg.confirmar ?? !cfg.perto
    const H = ate - de
    const baixo = membros.filter((m) => m !== fonte && Math.abs(m.piso_m - de) < 0.05)
    const pontosBaixo = baixo.flatMap((m) => m.lances.flatMap((l) => l.linhas.map((v) => local(fonte, mundo(m, (l.u0 + l.u1) / 2, v)))))
    const semPisoEmbaixo = !membros.some((m) => Math.abs(m.piso_m - de) < 0.05)
    const blocos = [], vazio = []
    const z0 = +(de - LAJE_M).toFixed(3)
    let total = 0
    const nivel = (k) => +(de + (k * H) / total).toFixed(3)
    const lance = (col, linhas, k0) => {
      for (let k = 0; k + 1 < linhas.length; k++) {
        const [a, b] = [linhas[k], linhas[k + 1]]
        // o lance que sai do chão é maciço; os de cima são laje em degraus, senão viram muro no meio da escada
        const base = k0 ? Math.max(z0, nivel(k0 + k) - LAJE_ESCADA_M) : z0
        blocos.push({ poly: ret(fonte, col.u0, col.u1, Math.min(a, b), Math.max(a, b)), z0: base, z1: nivel(k0 + k + 1) })
      }
      vazio.push(ret(fonte, col.u0, col.u1, Math.min(...linhas), Math.max(...linhas)))
    }
    const inicio = (col, v, lado) => {
      if (!semPisoEmbaixo) return
      const d = Math.min(Math.max(col.livre[lado < 0 ? 0 : 1], 0.6), 1.5)
      blocos.push({ poly: ret(fonte, col.u0, col.u1, Math.min(v, v + lado * d), Math.max(v, v + lado * d)), z0, z1: +(de - 0.005).toFixed(3) })
    }
    const passo = (ls) => ls.slice(1).map((v, i) => Math.abs(v - ls[i])).sort((x, y) => x - y)[(ls.length - 1) >> 1]
    const reamostra = (ls, n) => Array.from({ length: n }, (_, i) => ls[0] + ((ls.at(-1) - ls[0]) * i) / (n - 1))
    let resumo, entrada = 0
    if (tipo === 'reta') {
      const col = { ...cols[0] }
      // a planta de baixo mostra o começo da escada e a de cima o resto: degraus de baixo fora do trecho de cima
      // entram na mesma escada, e o vão entre os dois desenhos ganha degraus no mesmo passo
      const vmin = Math.min(...col.linhas), vmax = Math.max(...col.linhas), p = passo(col.linhas)
      const extra = pontosBaixo.filter(([u, v]) => u >= col.u0 - 0.5 && u <= col.u1 + 0.5 && (v < vmin - p / 2 || v > vmax + p / 2)).map(([, v]) => v)
      if (extra.length) {
        const ls = [...col.linhas, ...extra].sort((a, b) => a - b), cheio = [ls[0]]
        for (let i = 1; i < ls.length; i++) {
          const n = Math.round((ls[i] - ls[i - 1]) / p)
          for (let k = 1; k < n; k++) cheio.push(ls[i - 1] + ((ls[i] - ls[i - 1]) * k) / n)
          cheio.push(ls[i])
        }
        col.linhas = cheio
      }
      let sobe = cfg.sobe ? Math.sign(dot(eixo(cfg.sobe), fonte.eV)) : 0
      if (!sobe && pontosBaixo.length) {
        const bv = pontosBaixo.map((p) => p[1]), [v0, v1] = [col.linhas[0], col.linhas.at(-1)]
        sobe = Math.min(...bv) - v0 < v1 - Math.max(...bv) ? 1 : -1
      }
      sobe ||= 1
      let linhas = sobe > 0 ? col.linhas : [...col.linhas].reverse()
      if (H / linhas.length > ESPELHO_MAX_M) linhas = reamostra(linhas, Math.ceil(H / ESPELHO_ALVO_M))
      total = linhas.length
      lance(col, linhas, 0)
      inicio(col, linhas[0], -sobe)
      resumo = `reta, ${total} degraus`
    } else {
      const [A, B] = cols
      const lado = cfg.patamar ? Math.sign(dot(eixo(cfg.patamar), fonte.eV))
        : Math.min(A.livre[1], B.livre[1]) > Math.min(A.livre[0], B.livre[0]) ? 1 : -1
      entrada = -lado
      const meio = (l) => (l.u0 + l.u1) / 2
      let primeiro
      if (cfg.primeiro) primeiro = dot(eixo(cfg.primeiro), fonte.eU) * (meio(B) - meio(A)) > 0 ? B : A
      else {
        const cobre = (l) => pontosBaixo.filter(([u]) => u >= l.u0 && u <= l.u1).length
        if (pontosBaixo.length && cobre(A) !== cobre(B)) primeiro = cobre(A) > cobre(B) ? A : B
        else {
          const d = fonte.eV.map((q) => q * lado), s = Math.sign(meio(B) - meio(A)), o = fonte.eU.map((q) => q * s)
          primeiro = (d[0] * o[1] - d[1] * o[0]) * GIRO_REF > 0 ? A : B
        }
      }
      const segundo = primeiro === A ? B : A
      let a = lado > 0 ? [...primeiro.linhas] : [...primeiro.linhas].reverse()
      let b = lado > 0 ? [...segundo.linhas].reverse() : [...segundo.linhas]
      const n = Math.max(a.length, b.length)
      if (a.length < 0.75 * n) for (const p = passo(a); a.length < n;) a.unshift(a[0] - lado * p)
      if (b.length < 0.75 * n) for (const p = passo(b); b.length < n;) b.push(b.at(-1) - lado * p)
      if (H / (a.length + b.length) > ESPELHO_MAX_M) {
        const N = Math.ceil(H / ESPELHO_ALVO_M), na = Math.round((N * a.length) / (a.length + b.length))
        ;[a, b] = [reamostra(a, na), reamostra(b, N - na)]
      }
      total = a.length + b.length
      lance(primeiro, a, 0)
      const largura = Math.max(primeiro.u1 - primeiro.u0, segundo.u1 - segundo.u0)
      const paredes = [primeiro, segundo].map((l) => {
        const fim = lado > 0 ? l.linhas.at(-1) : l.linhas[0], d = l.livre[lado > 0 ? 1 : 0]
        return fim + lado * (d >= 0.8 ? Math.min(d, Math.max(largura * 1.1, PATAMAR_PADRAO_M)) : PATAMAR_PADRAO_M)
      })
      const muro = lado > 0 ? Math.min(...paredes) : Math.max(...paredes)
      const alturaPatamar = nivel(a.length)
      const fimA = a.at(-1), fimB = b[0], vaoU0 = Math.min(primeiro.u1, segundo.u1) , vaoU1 = Math.max(primeiro.u0, segundo.u0)
      const patamar = [[primeiro.u0, primeiro.u1, fimA], [segundo.u0, segundo.u1, fimB]]
      if (vaoU1 > vaoU0) patamar.push([vaoU0, vaoU1, lado > 0 ? Math.max(fimA, fimB) : Math.min(fimA, fimB)])
      for (const [u0, u1, v] of patamar) {
        const p = ret(fonte, u0, u1, Math.min(v, muro), Math.max(v, muro))
        blocos.push({ poly: p, z0: Math.max(z0, alturaPatamar - LAJE_ESCADA_M), z1: alturaPatamar })
        vazio.push(p)
      }
      lance(segundo, b, a.length)
      inicio(primeiro, a[0], -lado)
      resumo = `U, ${a.length} + ${b.length} degraus, patamar a ${alturaPatamar} m`
    }
    const espelho = +(H / total).toFixed(3)
    const blocosMembros = new Set(membros.map((m) => m.bloco))
    const cortar = paginas.filter((o) => blocosMembros.has(o.pg.bloco) && o.pg.pisoAltura_m > de + 0.05 && o.pg.pisoAltura_m < ate + 0.05).map((o) => o.n)
    let ref = fonte
    if (cfg.deslocar) {
      const [dx, dz] = cfg.deslocar, mv = (poly) => poly.map(([x, z]) => [+(x + dx).toFixed(3), +(z + dz).toFixed(3)])
      for (const b of blocos) b.poly = mv(b.poly)
      vazio.splice(0, vazio.length, ...vazio.map(mv))
      ref = { ...fonte, origem: [fonte.origem[0] + dx, fonte.origem[1] + dz] }
    }
    const loc = blocos.flatMap((b) => b.poly.map((p) => local(ref, p)))
    const caixaLocal = (m, v0 = 0, v1 = 0) => ret(ref, Math.min(...loc.map((p) => p[0])) - m, Math.max(...loc.map((p) => p[0])) + m,
      Math.min(...loc.map((p) => p[1])) - m - v0, Math.max(...loc.map((p) => p[1])) + m + v1)
    // mureta entre lances e linha do meio da escada saem: nada de parede dentro da área da escada; em U a ponta da
    // mureta passa do 1º degrau do lado da entrada (oposto ao patamar)
    const area = caixaLocal(-AREA_RECUO_M, entrada < 0 ? AREA_ENTRADA_M : 0, entrada > 0 ? AREA_ENTRADA_M : 0)
    // vão nos andares de cima: retângulo da escada inteira (lances, patamar e o espaço entre os lances)
    const poco = blocos.filter((b) => b.z1 > de + 0.01).flatMap((b) => b.poly.map((p) => local(ref, p)))
    vazio.splice(0, vazio.length, ret(ref, Math.min(...poco.map((p) => p[0])), Math.max(...poco.map((p) => p[0])),
      Math.min(...poco.map((p) => p[1])), Math.max(...poco.map((p) => p[1]))))
    let paredesAbaixo = null
    if (semPisoEmbaixo) paredesAbaixo = { pagina: fonte.pagina, poly: caixaLocal(0.45), z0, z1: +(fonte.piso_m - LAJE_M).toFixed(3) }
    console.log(`escada ${id}: ${resumo}, ${de} → ${ate} m, espelho ${espelho} m, desenho da pág. ${fonte.pagina}${membros.length > 1 ? ` (+ pág. ${membros.filter((m) => m !== fonte).map((m) => m.pagina).join(', ')})` : ''}${confirmar ? ' [a confirmar]' : ''}`)
    const paginasBlocos = paginas.filter((o) => blocosMembros.has(o.pg.bloco)).map((o) => o.n)
    const entorno = caixaLocal(ENTORNO_M)
    escadas.push({ id, bloco: fonte.bloco, pagina: fonte.pagina, tipo, de_m: de, ate_m: ate, espelho_m: espelho, degraus: total, blocos, vazio, cortar, area, entorno, paginasBlocos, paredesAbaixo, confirmar })
  }
  return escadas
}

const result = { origem: 'extrair-geometria.mjs sobre dados/render/ids-N.png + montagem.json', unidade: 'metros', eixos: montagem.eixos, paginas: [] }
const lidas = []
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
  const { degraus, grupos, grossa } = marcaEscadas(r, w, h, ppm)
  const k = pg.s / ppm, c = toWorld(0, 0)
  const vetorMundo = ([dx, dy]) => { const a = toWorld(dx, dy); const v = [a[0] - c[0], a[1] - c[1]], m = Math.hypot(...v); return v.map((q) => q / m) }
  for (const e of analisaEscadas(grupos, r, grossa, w, h, ppm)) {
    if (process.env.DEBUG_ESCADAS) {
      const W = (u, v) => toWorld(u * e.t[0] + v * e.n[0], u * e.t[1] + v * e.n[1]).map((q) => q.toFixed(2)).join(',')
      console.log(`  p${n} escada: mundo (${toWorld(e.cx, e.cy).map((q) => q.toFixed(2))}), eU (${vetorMundo(e.t).map((q) => q.toFixed(2))}) eV (${vetorMundo(e.n).map((q) => q.toFixed(2))})`)
      for (const l of e.lances) console.log(`     lance ${l.linhas.length} linhas, largura ${((l.u1 - l.u0) * k).toFixed(2)} m, de (${W((l.u0 + l.u1) / 2, l.linhas[0])}) a (${W((l.u0 + l.u1) / 2, l.linhas.at(-1))}), passo ${(((l.linhas.at(-1) - l.linhas[0]) / (l.linhas.length - 1)) * k).toFixed(2)} m, livre ${l.livre.map((d) => (d * k).toFixed(2))}`)
    }
    lancesPorPagina.push({
      pagina: n, bloco: pg.bloco, piso_m: pg.pisoAltura_m, pixels: e.pixels,
      origem: c, eU: vetorMundo(e.t), eV: vetorMundo(e.n),
      lances: e.lances.map((l) => ({ u0: l.u0 * k, u1: l.u1 * k, linhas: l.linhas.map((v) => v * k), livre: l.livre.map((d) => d * k) })),
    })
  }
  if (DIAG) {
    const rgb = Buffer.alloc(w * h * 3, 255)
    for (let i = 0; i < w * h; i++) {
      const c = r[i] === DEGRAU ? [30, 90, 230] : r[i] === ESCADA ? [170, 200, 250]
        : original[i] === 1 ? (r[i] === 1 ? [20, 20, 20] : [230, 30, 30]) : r[i] ? [235, 235, 235] : [255, 255, 255]
      rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
    }
    writePng(path.join(DIAG, `arcos-${n}.png`), w, h, rgb)
  }
  lidas.push({ n, pg, w, h, r, labels, ppm, toWorld, arcos, degraus })
}

const dentro = (poly, x, z) => {
  let ok = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ok = !ok
  }
  return ok
}
result.escadas = montaEscadas()
for (const { n, pg, w, h, r, labels, ppm, toWorld, arcos, degraus } of lidas) {
  const paraPixel = ([x, z]) => {
    const a = (x - pg.t[0]) / pg.s, b = (z - pg.t[1]) / pg.s
    return [(pg.M[0] * a + pg.M[2] * b) * ppm, (pg.M[1] * a + pg.M[3] * b) * ppm]
  }
  let semMureta = 0, desenho2d = 0, pedacos = 0
  const varre = (poly, fn) => {
    const px = poly.map(paraPixel)
    const X0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[0])))), X1 = Math.min(w - 1, Math.ceil(Math.max(...px.map((p) => p[0]))))
    const Y0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[1])))), Y1 = Math.min(h - 1, Math.ceil(Math.max(...px.map((p) => p[1]))))
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) if (dentro(poly, ...toWorld(X + 0.5, Y + 0.5))) fn(Y * w + X)
  }
  // em volta da escada 3D, o desenho 2D (degraus e a sala "Escada" que encosta nela, inteira) e os pedaços soltos de
  // parede ou de sala viram piso comum; nos andares que a escada atravessa, o vão é cortado depois no Blender
  const salaEscada = new Set(labels.regioes.filter((g) => g.tipo === 'escada').map((g) => g.codigo))
  const mascara = new Uint8Array(w * h), visto = new Uint8Array(w * h), fila = new Int32Array(w * h)
  for (const e of result.escadas) {
    if (!e.paginasBlocos.includes(n)) continue
    varre(e.area, (i) => { if (r[i] === 1) { r[i] = ESCADA; semMureta++ } })
    const dentroEntorno = []
    varre(e.entorno, (i) => {
      mascara[i] = 1; dentroEntorno.push(i)
      if (salaEscada.has(r[i])) {
        const v = r[i]
        let n1 = 0
        fila[n1++] = i; r[i] = 2
        for (let n0 = 0; n0 < n1; n0++) {
          const j0 = fila[n0], x = j0 % w
          for (const j of [x > 0 ? j0 - 1 : -1, x < w - 1 ? j0 + 1 : -1, j0 - w, j0 + w]) if (j >= 0 && j < w * h && r[j] === v) { r[j] = 2; fila[n1++] = j }
        }
        desenho2d += n1
      } else if (r[i] === ESCADA || r[i] === DEGRAU) { r[i] = 2; desenho2d++ }
    })
    for (const i0 of dentroEntorno) {
      const v = r[i0]
      if (visto[i0] || (v !== 1 && v < 10)) continue
      let n0 = 0, n1 = 0, solto = true
      fila[n1++] = i0; visto[i0] = 1
      while (n0 < n1) {
        const i = fila[n0++], x = i % w
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
          if (j < 0 || j >= w * h || r[j] !== v || visto[j]) continue
          if (!mascara[j]) { solto = false; continue }
          visto[j] = 1; fila[n1++] = j
        }
      }
      if (solto && (v === 1 || n1 < SOLTO_MAX_M2 * ppm * ppm)) for (let k = 0; k < n1; k++) { r[fila[k]] = 2; pedacos++ }
    }
    for (const i of dentroEntorno) { mascara[i] = 0; visto[i] = 0 }
  }
  if (DIAG) for (const [k, e] of result.escadas.entries()) {
    if (!e.paginasBlocos.includes(n)) continue
    const px = e.entorno.map(paraPixel), Z = 3, M = 2 * ppm
    const X0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[0])) - M)), X1 = Math.min(w - 1, Math.ceil(Math.max(...px.map((p) => p[0])) + M))
    const Y0 = Math.max(0, Math.floor(Math.min(...px.map((p) => p[1])) - M)), Y1 = Math.min(h - 1, Math.ceil(Math.max(...px.map((p) => p[1])) + M))
    const cw = (X1 - X0 + 1) * Z, ch = (Y1 - Y0 + 1) * Z, rgb = Buffer.alloc(cw * ch * 3, 255)
    const cor = (c) => c === 0 ? [255, 255, 255] : c === 1 ? [20, 20, 20] : c === 2 ? [215, 215, 215] : c === ESCADA ? [170, 200, 250] : c === DEGRAU ? [30, 90, 230] : [240, 200 - (c * 37) % 80, 120 + (c * 53) % 100]
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const c = cor(r[(Y0 + Math.floor(y / Z)) * w + X0 + Math.floor(x / Z)]); rgb.set(c, (y * cw + x) * 3) }
    for (const b of [...e.blocos, ...(e.cortar.includes(n) ? e.vazio.map((poly) => ({ poly, vazio: true })) : [])]) {
      const q = b.poly.map(paraPixel).map(([x, y]) => [(x - X0) * Z, (y - Y0) * Z])
      for (let j = 0; j < q.length; j++) {
        const [a, c] = [q[j], q[(j + 1) % q.length]], L = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]))
        for (let t = 0; t <= L; t++) { const x = Math.round(a[0] + ((c[0] - a[0]) * t) / L), y = Math.round(a[1] + ((c[1] - a[1]) * t) / L); if (x >= 0 && y >= 0 && x < cw && y < ch) rgb.set(b.vazio ? [20, 170, 60] : [230, 30, 30], (y * cw + x) * 3) }
      }
    }
    writePng(path.join(DIAG, `escada-${k + 1}-p${n}.png`), cw, ch, rgb)
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

  const vetor = (alvo, buf = r) => {
    const loops = []
    for (const lp of traceLoops(buf, w, h, alvo)) {
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
    salas, circulacao: vetor(2), paredes: vetor(1), escadas: vetor(ESCADA, r.map((c) => (c === DEGRAU ? ESCADA : c))), degraus: vetor(DEGRAU),
  })
  const nPts = (ls) => ls.reduce((s, l) => s + l.pts.length, 0)
  console.log(`${n} ${pg.arquivo}: ${salas.length} regiões, paredes ${nPts(result.paginas.at(-1).paredes)} pts, altura ${altura} m, ${arcos} px de arco removidos, ${degraus} px de degrau${semMureta ? `, ${semMureta} px de parede tirados de dentro das escadas` : ''}${desenho2d ? `, ${desenho2d} px de desenho 2D de escada trocados pela 3D` : ''}${pedacos ? `, ${pedacos} px de pedaços soltos em volta das escadas` : ''}${abertos ? `, ${abertos} px de parede abertos nas junções` : ''}`)
}
result.implantacao = montagem.implantacao
fs.writeFileSync(outFile, JSON.stringify(result))
console.log(`→ ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`)
