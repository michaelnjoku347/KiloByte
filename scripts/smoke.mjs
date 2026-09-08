import puppeteer from 'puppeteer'

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
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })

const brand = await page.$eval('.wordmark span', (el) => el.textContent)
console.log('brand:', brand)
if (brand !== 'Kilobyte') throw new Error('expected Kilobyte wordmark')

await page.waitForSelector('.cart-card')
const houseCount = await page.$$eval('.cart-card', (els) => els.length)
console.log('house carts:', houseCount)
if (houseCount < 6) throw new Error('expected house arcade')

await page.click('.cart-face')
await page.waitForSelector('canvas.crt')
console.log('play cabinet ok')
await page.screenshot({ path: '/tmp/kilobyte-play.png' })

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Studio'))?.click()
})
await page.waitForSelector('.studio-page')
const textarea = await page.$('textarea')
await textarea.click({ clickCount: 3 })
await textarea.type('a neon snake in a candy factory named "Smoke Coil"')
await page.click('.studio-page .primary-btn')
await page.waitForFunction(() => document.body.innerText.includes('Smoke Coil'))
console.log('studio mint ok')
await page.screenshot({ path: '/tmp/kilobyte-studio.png' })

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Publish to arcade'))?.click()
})
await page.waitForSelector('canvas.crt')
console.log('published play ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Arcade'))?.click()
})
await page.waitForFunction(() => document.body.innerText.includes('Smoke Coil'))
console.log('arcade lists published cart')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Why'))?.click()
})
await page.waitForSelector('.why-page')
await page.waitForFunction(() => document.body.innerText.includes('Store the recipe'))
console.log('why page ok')
await page.screenshot({ path: '/tmp/kilobyte-why.png', fullPage: true })

if (errors.length) {
  console.log('page errors:', errors)
  process.exitCode = 1
} else {
  console.log('ALL_PASS')
}

await browser.close()
