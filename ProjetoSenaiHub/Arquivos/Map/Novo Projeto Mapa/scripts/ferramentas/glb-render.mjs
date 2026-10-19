import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const dir = process.argv[2]
const outDir = process.argv[3]
fs.mkdirSync(outDir, { recursive: true })

function readGlb(file) {
  const buf = fs.readFileSync(file)
  let offset = 12
  let json = null
  let bin = null
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8).replace(/\0/g, '')
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'JSON') json = JSON.parse(data.toString('utf8'))
    else bin = data
    offset += 8 + len
  }
  return { json, bin }
}

function trsMatrix(n) {
  const [tx, ty, tz] = n.translation ?? [0, 0, 0]
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale ?? [1, 1, 1]
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ]
  return (p) => [
    r[0] * p[0] * sx + r[1] * p[1] * sy + r[2] * p[2] * sz + tx,
    r[3] * p[0] * sx + r[4] * p[1] * sy + r[5] * p[2] * sz + ty,
    r[6] * p[0] * sx + r[7] * p[1] * sy + r[8] * p[2] * sz + tz,
  ]
}

function accessorData(g, bin, idx) {
  const a = g.accessors[idx]
  const bv = g.bufferViews[a.bufferView]
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
  const Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType]
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0)
  const stride = bv.byteStride ?? comps * Ctor.BYTES_PER_ELEMENT
  const out = []
  const dv = new DataView(bin.buffer, bin.byteOffset)
  for (let i = 0; i < a.count; i++) {
    const row = []
    for (let c = 0; c < comps; c++) {
      const o = start + i * stride + c * Ctor.BYTES_PER_ELEMENT
      row.push(
        a.componentType === 5126 ? dv.getFloat32(o, true)
          : a.componentType === 5125 ? dv.getUint32(o, true)
            : a.componentType === 5123 ? dv.getUint16(o, true) : dv.getUint8(o),
      )
    }
    out.push(comps === 1 ? row[0] : row)
  }
  return out
}

// ---------- load ----------
const blocks = []
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.glb')).sort()) {
  const { json: g, bin } = readGlb(path.join(dir, f))
  const node = g.nodes[0]
  const tf = trsMatrix(node)
  const tris = []
  const matStats = {}
  for (const p of g.meshes[node.mesh].primitives) {
    const mat = g.materials[p.material]?.name ?? '?'
    const pos = accessorData(g, bin, p.attributes.POSITION).map(tf)
    const ind = p.indices !== undefined ? accessorData(g, bin, p.indices) : pos.map((_, i) => i)
    matStats[mat] = (matStats[mat] ?? 0) + ind.length / 3
    for (let i = 0; i < ind.length; i += 3) tris.push({ a: pos[ind[i]], b: pos[ind[i + 1]], c: pos[ind[i + 2]], mat })
  }
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const t of tris) for (const v of [t.a, t.b, t.c]) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], v[i]); max[i] = Math.max(max[i], v[i]) }
  blocks.push({ name: node.name, tris, min, max, matStats })
}

// ---------- report ----------
for (const b of blocks) {
  console.log(`\n### ${b.name}  (${b.tris.length} tris)`)
  console.log(' world min', b.min.map((v) => v.toFixed(1)).join(', '), '| max', b.max.map((v) => v.toFixed(1)).join(', '))
  console.log(' size X(largura)', (b.max[0] - b.min[0]).toFixed(1), ' Y(altura)', (b.max[1] - b.min[1]).toFixed(1), ' Z(profund.)', (b.max[2] - b.min[2]).toFixed(1))
  console.log(' tris por material', JSON.stringify(Object.fromEntries(Object.entries(b.matStats).map(([k, v]) => [k, Math.round(v)]))))

  // horizontal faces -> floor/ceiling levels (area-weighted)
  const levels = {}
  for (const t of b.tris) {
    const ys = [t.a[1], t.b[1], t.c[1]]
    if (Math.max(...ys) - Math.min(...ys) > 0.05) continue
    const ux = t.b[0] - t.a[0], uz = t.b[2] - t.a[2], vx = t.c[0] - t.a[0], vz = t.c[2] - t.a[2]
    const area = Math.abs(ux * vz - uz * vx) / 2
    const key = (Math.round(ys[0] * 2) / 2).toFixed(1)
    levels[key] = (levels[key] ?? 0) + area
  }
  const top = Object.entries(levels).sort((a, b2) => b2[1] - a[1]).slice(0, 12).sort((a, b2) => +a[0] - +b2[0])
  console.log(' níveis horizontais (altura: área):', top.map(([k, v]) => `${k}:${Math.round(v)}`).join('  '))
  b.levels = top.map(([k]) => +k)

  // per-material height range
  const mr = {}
  for (const t of b.tris) {
    const r = (mr[t.mat] ??= [Infinity, -Infinity])
    for (const v of [t.a, t.b, t.c]) { r[0] = Math.min(r[0], v[1]); r[1] = Math.max(r[1], v[1]) }
  }
  console.log(' faixa de altura por material', JSON.stringify(Object.fromEntries(Object.entries(mr).map(([k, [lo, hi]]) => [k, `${lo.toFixed(1)}..${hi.toFixed(1)}`]))))
}

// ---------- PNG ----------
function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function writePng(file, w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}

class Canvas {
  constructor(minX, minZ, maxX, maxZ, size) {
    const pad = 0.04 * Math.max(maxX - minX, maxZ - minZ)
    this.minX = minX - pad; this.minZ = minZ - pad
    const sx = maxX - minX + 2 * pad, sz = maxZ - minZ + 2 * pad
    this.s = size / Math.max(sx, sz)
    this.w = Math.ceil(sx * this.s); this.h = Math.ceil(sz * this.s)
    this.rgb = Buffer.alloc(this.w * this.h * 3, 255)
    this.zbuf = new Float32Array(this.w * this.h).fill(-Infinity)
  }
  px(x, z) { return [(x - this.minX) * this.s, (z - this.minZ) * this.s] }
  set(x, y, col) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 3; this.rgb[i] = col[0]; this.rgb[i + 1] = col[1]; this.rgb[i + 2] = col[2] }
  line(p, q, col) {
    let [x0, y0] = this.px(p[0], p[2]); const [x1, y1] = this.px(q[0], q[2])
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1
    for (let i = 0; i <= n; i++) { const t = i / n; this.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), col) }
  }
  tri(t, colFn) {
    const P = [t.a, t.b, t.c].map((v) => [...this.px(v[0], v[2]), v[1]])
    const minx = Math.max(0, Math.floor(Math.min(...P.map((p) => p[0])))), maxx = Math.min(this.w - 1, Math.ceil(Math.max(...P.map((p) => p[0]))))
    const miny = Math.max(0, Math.floor(Math.min(...P.map((p) => p[1])))), maxy = Math.min(this.h - 1, Math.ceil(Math.max(...P.map((p) => p[1]))))
    const d = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1])
    if (Math.abs(d) < 1e-9) return
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const l1 = ((P[1][1] - P[2][1]) * (x - P[2][0]) + (P[2][0] - P[1][0]) * (y - P[2][1])) / d
      const l2 = ((P[2][1] - P[0][1]) * (x - P[2][0]) + (P[0][0] - P[2][0]) * (y - P[2][1])) / d
      const l3 = 1 - l1 - l2
      if (l1 < -0.01 || l2 < -0.01 || l3 < -0.01) continue
      const h = l1 * P[0][2] + l2 * P[1][2] + l3 * P[2][2]
      const i = y * this.w + x
      if (h <= this.zbuf[i]) continue
      this.zbuf[i] = h
      this.set(x, y, colFn(h))
    }
  }
  save(f) { writePng(f, this.w, this.h, this.rgb); console.log('PNG', f, `${this.w}x${this.h}`) }
}

const palette = { 'Bloco A': [227, 6, 19], 'Bloco B': [37, 99, 235], 'Bloco C': [22, 163, 74], 'Bloco D': [234, 140, 0] }

// campus top view (height-shaded by block)
{
  const gmin = [0, 1, 2].map((i) => Math.min(...blocks.map((b) => b.min[i])))
  const gmax = [0, 1, 2].map((i) => Math.max(...blocks.map((b) => b.max[i])))
  const cv = new Canvas(gmin[0], gmin[2], gmax[0], gmax[2], 1400)
  for (const b of blocks) {
    const base = palette[b.name] ?? [80, 80, 80]
    for (const t of b.tris) cv.tri(t, (h) => {
      const k = 0.35 + 0.65 * ((h - gmin[1]) / (gmax[1] - gmin[1] || 1))
      return base.map((c) => Math.round(255 - (255 - c) * k))
    })
  }
  cv.save(path.join(outDir, 'campus-topo.png'))
}

// per-block floor-plan slices
function sliceAt(b, y) {
  const segs = []
  for (const t of b.tris) {
    const vs = [t.a, t.b, t.c]
    const pts = []
    for (let i = 0; i < 3; i++) {
      const p = vs[i], q = vs[(i + 1) % 3]
      if ((p[1] - y) * (q[1] - y) < 0) { const k = (y - p[1]) / (q[1] - p[1]); pts.push([p[0] + (q[0] - p[0]) * k, y, p[2] + (q[2] - p[2]) * k]) }
    }
    if (pts.length === 2) segs.push({ p: pts[0], q: pts[1], mat: t.mat })
  }
  return segs
}
const matColor = (m) => m.startsWith('wall') ? [20, 20, 30] : m.startsWith('flblonde') ? [170, 100, 20] : m.startsWith('yellowbrt') ? [220, 170, 0] : m.startsWith('white') ? [120, 140, 200] : [200, 60, 60]

for (const b of blocks) {
  const floorLevels = [...new Set(b.levels)].filter((l) => l < b.max[1] - 5).sort((x, y) => x - y)
  const picks = []
  for (const l of floorLevels) if (!picks.length || l - picks[picks.length - 1] > 15) picks.push(l)
  for (const [i, l] of picks.entries()) {
    const y = l + 12
    if (y >= b.max[1]) continue
    const segs = sliceAt(b, y)
    if (!segs.length) continue
    const cv = new Canvas(b.min[0], b.min[2], b.max[0], b.max[2], 1200)
    for (const s of segs) cv.line(s.p, s.q, matColor(s.mat))
    const slug = b.name.replace(/\s+/g, '')
    cv.save(path.join(outDir, `${slug}-planta-nivel${i}-y${y.toFixed(0)}.png`))
  }
}
