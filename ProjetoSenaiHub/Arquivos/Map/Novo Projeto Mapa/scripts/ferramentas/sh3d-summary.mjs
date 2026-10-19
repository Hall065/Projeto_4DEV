import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)='([^']*)'|(\w+)="([^"]*)"/g)].map((m) => [m[1] ?? m[3], m[2] ?? m[4]]))

for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.xml'))) {
  const xml = fs.readFileSync(path.join(dir, f), 'utf8')
  console.log(`\n===== ${f}`)
  const home = xml.match(/<home\b[^>]*>/)
  if (home) {
    const a = attrs(home[0])
    console.log('home:', JSON.stringify({ wallHeight: a.wallHeight, name: a.name, version: a.version }))
  }
  const levels = [...xml.matchAll(/<level\b[^>]*\/?>/g)].map((m) => attrs(m[0]))
  console.log('levels:', levels.map((l) => `${l.id} "${l.name}" elev=${l.elevation} floorTh=${l.floorThickness} h=${l.height} viewable=${l.viewable ?? 'true'}`).join(' | ') || '(none)')
  const bg = [...xml.matchAll(/<backgroundImage\b[^>]*\/?>/g)].map((m) => attrs(m[0]))
  if (bg.length) console.log('backgroundImages:', bg.map((b) => `${b.image} scale=${b.scaleDistance}`).join(' | '))

  const byLevel = {}
  const bump = (lvl, k) => { byLevel[lvl ??= '-'] ??= { walls: 0, rooms: 0, named: 0, doors: 0, furniture: 0, labels: 0 }; byLevel[lvl][k]++ }
  for (const m of xml.matchAll(/<wall\b[^>]*>/g)) bump(attrs(m[0]).level, 'walls')
  for (const m of xml.matchAll(/<doorOrWindow\b[^>]*>/g)) bump(attrs(m[0]).level, 'doors')
  for (const m of xml.matchAll(/<pieceOfFurniture\b[^>]*>/g)) bump(attrs(m[0]).level, 'furniture')
  const rooms = []
  for (const m of xml.matchAll(/<room\b[^>]*>/g)) {
    const a = attrs(m[0])
    bump(a.level, 'rooms')
    if (a.name) { bump(a.level, 'named'); rooms.push(`${a.level ?? '-'}: ${a.name}`) }
  }
  const labels = []
  for (const m of xml.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)) {
    const a = attrs(m[0])
    bump(a.level, 'labels')
    const t = m[1].match(/<text>([\s\S]*?)<\/text>/)
    labels.push(`${a.level ?? '-'}: ${t ? t[1] : '?'}`)
  }
  console.log('por nivel:', JSON.stringify(byLevel))
  if (rooms.length) console.log('salas nomeadas:', rooms.join(' ; '))
  if (labels.length) console.log('labels:', labels.join(' ; '))
  const furnNames = {}
  for (const m of xml.matchAll(/<(?:pieceOfFurniture|doorOrWindow)\b[^>]*>/g)) { const n = attrs(m[0]).name; furnNames[n] = (furnNames[n] ?? 0) + 1 }
  console.log('objetos:', Object.entries(furnNames).map(([k, v]) => `${k}x${v}`).join(', '))
}
