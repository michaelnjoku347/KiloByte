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

await pause(1000)
await page.evaluate(() => {
  const chips = [...document.querySelectorAll('.category-strip .chip')]
  chips.find((c) => c.textContent?.includes('Simulator'))?.click()
})
await pause(900)
await page.click('.exp-hit')
await page.waitForSelector('.experience')
await pause(1100)
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Play')?.click()
})
await pause(1600)
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Create'))?.click()
})
await page.waitForSelector('.dropzone')
await pause(800)
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.includes('Connect GitHub'))?.click()
})
await pause(1400)
console.log('DEMO_COMPLETE')
await browser.close()
