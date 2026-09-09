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

await page.waitForSelector('.howto')
await page.waitForSelector('.lead')
await page.waitForSelector('.plate')
const count = await page.$$eval('.plate', (els) => els.length)
if (count < 8) throw new Error(`expected a catalog shelf, got ${count} plates`)
console.log('floor plates', count)

const simulator = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.kind-link')]
  const btn = links.find((c) => c.textContent?.includes('Simulator'))
  btn?.click()
  return Boolean(btn)
})
if (!simulator) throw new Error('simulator kind missing')
await page.waitForFunction(() => location.hash.includes('/charts/Simulator'))
await page.waitForSelector('.index-table')
await page.waitForFunction(() => document.body.innerText.includes('Dock Ledger'))
console.log('catalog kind ok')

await page.click('.index-title')
await page.waitForSelector('.dossier')
await page.waitForFunction(() => document.body.innerText.includes('What this is'))
console.log('game card ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Play this')?.click()
})
await page.waitForSelector('canvas, iframe.game-frame')
console.log('play ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Make')?.click()
})
await page.waitForSelector('.dropzone')
console.log('make upload ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Connect GitHub'))?.click()
})
await page.waitForFunction(() => document.body.innerText.includes('Inspect repo'))
console.log('make github ok')

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Hosting'))?.click()
})
await page.waitForSelector('.why-page')
await page.waitForFunction(() => document.body.innerText.includes('You do not host the games'))
console.log('hosting page ok')

await page.click('.seal')
await page.waitForSelector('.you-page')
await page.waitForFunction(() => document.body.innerText.includes('Make a card'))
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('.theme-switch button')]
  buttons.find((b) => b.textContent?.trim() === 'Dark')?.click()
})
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
console.log('dark mode ok')
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('.theme-switch button')]
  buttons.find((b) => b.textContent?.trim() === 'Light')?.click()
})
await page.waitForFunction(() => document.documentElement.dataset.theme !== 'dark')
await page.type('input[placeholder="Mina"]', 'Mina Oak')
await page.type('input[placeholder="mina"]', 'mina')
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Make this card')?.click()
})
await page.waitForFunction(() => document.body.innerText.includes('@mina'))
await page.waitForFunction(() => document.querySelector('.seal.on'))
console.log('profile card ok')

if (errors.length) {
  console.log('page errors:', errors)
  process.exitCode = 1
} else {
  console.log('ALL_PASS')
}

await browser.close()
