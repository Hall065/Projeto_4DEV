import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb'))

function readGlb(file) {
  const buf = fs.readFileSync(file)
  const magic = buf.toString('ascii', 0, 4)
  const version = buf.readUInt32LE(4)
  let offset = 12
  let json = null
  let binLength = 0
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8).replace(/\0/g, '')
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'JSON') json = JSON.parse(data.toString('utf8'))
    else binLength = len
    offset += 8 + len
  }
  return { magic, version, json, binLength, buf }
}

for (const f of files) {
  const { magic, version, json: g, binLength } = readGlb(path.join(dir, f))
  console.log('\n==================', f, '==================')
  console.log('magic', magic, 'v', version, '| BIN bytes', binLength)
  console.log('asset', JSON.stringify(g.asset))
  console.log('extensionsUsed', g.extensionsUsed ?? [], '| required', g.extensionsRequired ?? [])
  console.log(
    'counts: scenes', g.scenes?.length ?? 0,
    'nodes', g.nodes?.length ?? 0,
    'meshes', g.meshes?.length ?? 0,
    'materials', g.materials?.length ?? 0,
    'textures', g.textures?.length ?? 0,
    'images', g.images?.length ?? 0,
    'animations', g.animations?.length ?? 0,
    'cameras', g.cameras?.length ?? 0,
    'skins', g.skins?.length ?? 0,
  )

  let totalVerts = 0
  let totalTris = 0
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const attrSet = new Set()
  for (const m of g.meshes ?? []) {
    for (const p of m.primitives) {
      Object.keys(p.attributes).forEach((a) => attrSet.add(a))
      const pos = g.accessors[p.attributes.POSITION]
      totalVerts += pos.count
      if (pos.min) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], pos.min[i]); max[i] = Math.max(max[i], pos.max[i]) }
      const n = p.indices !== undefined ? g.accessors[p.indices].count : pos.count
      if ((p.mode ?? 4) === 4) totalTris += n / 3
    }
  }
  console.log('verts', totalVerts, '| tris', Math.round(totalTris), '| attributes', [...attrSet].join(','))
  console.log('local bbox (sem transform) min', min.map((v) => v.toFixed(2)), 'max', max.map((v) => v.toFixed(2)))
  console.log('size', max.map((v, i) => (v - min[i]).toFixed(2)))

  console.log('-- scene roots:', (g.scenes?.[g.scene ?? 0]?.nodes ?? []).map((i) => g.nodes[i].name))
  console.log('-- nodes (primeiros 40):')
  for (const [i, n] of (g.nodes ?? []).slice(0, 40).entries()) {
    const t = []
    if (n.translation) t.push('T' + JSON.stringify(n.translation.map((v) => +v.toFixed(2))))
    if (n.rotation) t.push('R' + JSON.stringify(n.rotation.map((v) => +v.toFixed(3))))
    if (n.scale) t.push('S' + JSON.stringify(n.scale.map((v) => +v.toFixed(3))))
    if (n.matrix) t.push('M')
    console.log(`  [${i}] ${n.name ?? '(sem nome)'} mesh=${n.mesh ?? '-'} children=${n.children?.length ?? 0} ${t.join(' ')}`)
  }
  if ((g.nodes?.length ?? 0) > 40) console.log(`  ... +${g.nodes.length - 40} nodes`)

  const nameCounts = {}
  for (const n of g.nodes ?? []) {
    const base = (n.name ?? '').replace(/[._]?\d+$/, '')
    nameCounts[base] = (nameCounts[base] ?? 0) + 1
  }
  console.log('-- nomes agrupados:', JSON.stringify(Object.entries(nameCounts).sort((a, b) => b[1] - a[1]).slice(0, 30)))

  console.log('-- materials:')
  for (const m of g.materials ?? []) {
    const pbr = m.pbrMetallicRoughness ?? {}
    console.log(
      `  ${m.name ?? '(sem nome)'} color=${JSON.stringify(pbr.baseColorFactor?.map((v) => +v.toFixed(3)))} ` +
        `metal=${pbr.metallicFactor ?? '-'} rough=${pbr.roughnessFactor ?? '-'} tex=${pbr.baseColorTexture ? 'sim' : 'nao'} ` +
        `alpha=${m.alphaMode ?? 'OPAQUE'} doubleSided=${m.doubleSided ?? false}`,
    )
  }
  for (const im of g.images ?? []) console.log('  image', im.name, im.mimeType, im.uri ?? `bufferView ${im.bufferView}`)
  if (g.extras) console.log('extras', JSON.stringify(g.extras).slice(0, 300))
}
