import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve('scripts/.tmp')
await mkdir(outDir, { recursive: true })
const shot = path.join(outDir, 'solucoes-cards.png')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://127.0.0.1:5173/#solucoes', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const section = page.locator('#solucoes')
await section.scrollIntoViewIfNeeded()
await page.waitForTimeout(500)

const metrics = await page.evaluate(() => {
  const root = document.querySelector('#solucoes')
  if (!root) return { error: 'no #solucoes' }

  const articles = [...root.querySelectorAll('article')].filter((a) => a.querySelector('h2'))
  return articles.map((a) => {
    const media = a.querySelector('[class*="aspect-"]')
    const img = media?.querySelector('img')
    const mr = media?.getBoundingClientRect()
    const ir = img?.getBoundingClientRect()
    return {
      title: a.querySelector('h2')?.textContent?.trim(),
      mediaW: mr ? Math.round(mr.width) : null,
      mediaH: mr ? Math.round(mr.height) : null,
      ratio: mr ? +(mr.width / mr.height).toFixed(3) : null,
      imgFillsFrame:
        ir && mr
          ? Math.abs(ir.width - mr.width) < 2 && Math.abs(ir.height - mr.height) < 2
          : false,
      objectFit: img ? getComputedStyle(img).objectFit : null,
      position: img ? getComputedStyle(img).position : null,
    }
  })
})

console.log(JSON.stringify(metrics, null, 2))

const grid = page.locator('#solucoes').locator('article').filter({ has: page.locator('h2') }).first()
await page
  .locator('#solucoes')
  .locator('.mt-16.grid, .mt-16')
  .last()
  .screenshot({ path: shot })
  .catch(async () => {
    await section.screenshot({ path: shot })
  })

console.log('screenshot:', shot)
await browser.close()
