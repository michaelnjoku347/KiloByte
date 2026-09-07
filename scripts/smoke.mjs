import puppeteer from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()
page.setDefaultTimeout(15000)
await page.setViewport({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (e) => errors.push(String(e.message || e)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })

const brand = await page.$eval('.brand', (el) => el.textContent)
console.log('brand:', brand)

await page.click('.view-switch button:nth-child(2)')
await page.waitForSelector('.week-grid')
console.log('week view ok')
await page.screenshot({ path: '/tmp/syllabus-week.png', fullPage: true })

await page.click('.view-switch button:nth-child(3)')
await page.waitForSelector('.agenda-list')
console.log('agenda view ok')
await page.screenshot({ path: '/tmp/syllabus-agenda.png', fullPage: true })

await page.click('.view-switch button:nth-child(1)')
await page.waitForSelector('.month-grid')
console.log('month view ok')

// Quick add — target the topbar primary button specifically
await page.click('.top-actions .primary-btn')
await page.waitForSelector('.modal')
console.log('quick add modal ok')

await page.click('input[placeholder="e.g. Module 4 quiz"]', { clickCount: 3 })
await page.type('input[placeholder="e.g. Module 4 quiz"]', 'Midterm Study Guide')
await page.click('input[placeholder="BCS 213"]', { clickCount: 3 })
await page.type('input[placeholder="BCS 213"]', 'BCS 213')

const labels = await page.$$('.source-choice')
for (const label of labels) {
  const text = await label.evaluate((el) => el.textContent || '')
  if (text.includes('Zybooks')) {
    await label.click()
    break
  }
}

await page.screenshot({ path: '/tmp/syllabus-quick-add.png' })
await page.click('.modal-actions button.primary-btn')
await page.waitForFunction(() =>
  document.body.innerText.includes('Midterm Study Guide'),
)
console.log('created assignment ok')

// Import ICS via file input in Import drawer
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  const importBtn = buttons.find((b) => b.textContent?.includes('Import ICS'))
  importBtn?.click()
})
await page.waitForSelector('.import-modal')

const samplePath = resolve('/workspace/public/sample-brightspace.ics')
const input = await page.$('.import-modal input[type="file"]')
await input.uploadFile(samplePath)
await page.waitForFunction(() =>
  document.body.innerText.includes('Brightspace Quiz') ||
    document.body.innerText.includes('Imported'),
)
console.log('ics import ok')

await page.screenshot({ path: '/tmp/syllabus-after-import.png', fullPage: true })

// Toggle source filter
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.source-row')]
  const cengage = rows.find((r) => r.textContent?.includes('Cengage'))
  cengage?.click()
})
await new Promise((r) => setTimeout(r, 300))
console.log('source toggle ok')

await page.screenshot({ path: '/tmp/syllabus-final.png', fullPage: true })

if (errors.length) {
  console.log('page errors:', errors)
  process.exitCode = 1
} else {
  console.log('ALL_PASS')
}

await browser.close()
