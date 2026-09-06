import puppeteer from 'puppeteer'
import { resolve } from 'node:path'

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1440,900',
    '--window-position=0,0',
  ],
})

const page = (await browser.pages())[0] ?? (await browser.newPage())
page.setDefaultTimeout(20000)
await page.setViewport({ width: 1440, height: 900 })

// Clear storage for a clean demo
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1200))

async function pause(ms = 900) {
  await new Promise((r) => setTimeout(r, ms))
}

// Week view
await page.click('.view-switch button:nth-child(2)')
await page.waitForSelector('.week-grid')
await pause(1100)

// Agenda
await page.click('.view-switch button:nth-child(3)')
await page.waitForSelector('.agenda-list')
await pause(1100)

// Month
await page.click('.view-switch button:nth-child(1)')
await page.waitForSelector('.month-grid')
await pause(900)

// Quick add
await page.click('.top-actions .primary-btn')
await page.waitForSelector('.modal')
await pause(700)
await page.type('input[placeholder="e.g. Module 4 quiz"]', 'Midterm Study Guide', { delay: 35 })
await page.type('input[placeholder="BCS 213"]', 'BCS 213', { delay: 35 })
const labels = await page.$$('.source-choice')
for (const label of labels) {
  const text = await label.evaluate((el) => el.textContent || '')
  if (text.includes('Zybooks')) {
    await label.click()
    break
  }
}
await pause(700)
await page.click('.modal-actions button.primary-btn')
await page.waitForFunction(() => document.body.innerText.includes('Midterm Study Guide'))
await pause(1100)

// Import ICS
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Import ICS'))?.click()
})
await page.waitForSelector('.import-modal')
await pause(800)
const samplePath = resolve('/workspace/public/sample-brightspace.ics')
const input = await page.$('.import-modal input[type="file"]')
await input.uploadFile(samplePath)
await page.waitForFunction(
  () =>
    document.body.innerText.includes('Brightspace Quiz') ||
    document.body.innerText.includes('Imported'),
)
await pause(1200)

// Open an upcoming item then close
await page.click('.upcoming-item')
await page.waitForSelector('.modal')
await pause(900)
await page.click('.modal-head .icon-btn')
await pause(1000)

// Final month view scroll to top
await page.evaluate(() => window.scrollTo(0, 0))
await pause(1500)

console.log('DEMO_COMPLETE')
await browser.close()
