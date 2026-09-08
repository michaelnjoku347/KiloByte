import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()
page.setDefaultTimeout(20000)
await page.setViewport({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (e) => errors.push(String(e.message || e)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  localStorage.clear()
})
await page.reload({ waitUntil: 'networkidle0' })

const brand = await page.$eval('.wordmark span', (el) => el.textContent)
if (brand !== 'Kilobyte') throw new Error('expected Kilobyte wordmark')

await page.waitForSelector('.cart-card')
const count = await page.$$eval('.cart-card', (els) => els.length)
if (count < 12) throw new Error(`expected a full house library, got ${count}`)
console.log('library', count)

const puzzle = await page.evaluate(() => {
  const chips = [...document.querySelectorAll('.genre-cloud .chip')]
  const btn = chips.find((c) => c.textContent?.includes('Puzzle'))
  btn?.click()
  return Boolean(btn)
})
if (!puzzle) throw new Error('puzzle filter missing')
await page.waitForFunction(() => document.body.innerText.includes('Ash Fold'))
console.log('genre filter ok')

await page.click('.cart-face')
await page.waitForSelector('.dash-hero')
await page.waitForFunction(() => document.body.innerText.includes('Dashboard'))
console.log('dashboard ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Play')?.click()
})
await page.waitForSelector('canvas, iframe.game-frame')
console.log('play ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Create'))?.click()
})
await page.waitForSelector('.dropzone')
console.log('create upload ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Connect GitHub'))?.click()
})
await page.waitForFunction(() => document.body.innerText.includes('Inspect repo'))
console.log('create github ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Hosting'))?.click()
})
await page.waitForSelector('.why-page')
await page.waitForFunction(() => document.body.innerText.includes('You do not host the games'))
console.log('hosting page ok')

if (errors.length) {
  console.log('page errors:', errors)
  process.exitCode = 1
} else {
  console.log('ALL_PASS')
}

await browser.close()
