import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const brandDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/brand')

/**
 * Crop the SAFE symbol from expanded and square it on a transparent canvas.
 * mark-light (purple, transparent) is curated separately — do not overwrite.
 */
async function regenerateSafeMarks() {
  const expandedPath = path.join(brandDir, 'safe-logo-expanded.png')
  const meta = await sharp(expandedPath).metadata()
  const cropW = Math.round(meta.width * 0.38)
  const symbol = await sharp(expandedPath)
    .extract({ left: 0, top: 0, width: cropW, height: meta.height })
    .png()
    .toBuffer()

  const size = Math.max(cropW, meta.height)
  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: symbol, gravity: 'center' }])
    .png()
    .toBuffer()

  for (const name of ['safe-logo-icon.png', 'safe-logo-mark-dark.png']) {
    await sharp(icon).toFile(path.join(brandDir, name))
  }
}

function syncHubMarks() {
  const icon = path.join(brandDir, 'hub-logo-icon.png')
  for (const name of ['hub-logo-mark-dark.png', 'hub-logo-mark-light.png']) {
    fs.copyFileSync(icon, path.join(brandDir, name))
  }
}

await regenerateSafeMarks()
syncHubMarks()
console.log('Brand assets synchronized (SAFE icon/mark-dark transparent).')
