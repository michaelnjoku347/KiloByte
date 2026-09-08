import puppeteer from 'puppeteer'

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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })

async function pause(ms = 900) {
  await new Promise((r) => setTimeout(r, ms))
}

await pause(1200)
await page.click('.cart-face')
await page.waitForSelector('canvas.crt')
await pause(1400)

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Studio'))?.click()
})
await page.waitForSelector('textarea')
await pause(700)
const textarea = await page.$('textarea')
await textarea.click({ clickCount: 3 })
await textarea.type('cozy forest platformer with owls', { delay: 25 })
await pause(400)
await page.click('.studio-page .primary-btn')
await page.waitForFunction(() => document.querySelector('.recipe-head'))
await pause(1200)
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Publish to arcade'))?.click()
})
await page.waitForSelector('canvas.crt')
await pause(1500)

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Why'))?.click()
})
await page.waitForSelector('.why-page')
await pause(1600)

console.log('DEMO_COMPLETE')
await browser.close()
