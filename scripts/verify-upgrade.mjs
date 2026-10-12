import puppeteer from 'puppeteer'
import fs from 'node:fs'

const dir = '/opt/cursor/artifacts/screenshots'
fs.mkdirSync(dir, { recursive: true })

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
page.setDefaultTimeout(20000)
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.plate-art')
const ages = await page.$$eval('.age-pill', (els) => els.map((el) => el.textContent))
const lead = await page.$eval('.stage-specs', (el) => el.textContent || '')
if (!lead.includes('16+')) throw new Error(`expected the lead age tag, saw ${lead}`)
if (!ages.includes('Everyone') || !ages.includes('13+')) throw new Error(`age tags missing: ${ages.join(',')}`)
await page.screenshot({ path: `${dir}/storefront.png` })

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Play this')?.click()
})
await page.waitForSelector('.match-hud')
await page.waitForFunction(() => /\d+ fps/.test(document.querySelector('.stage-fps')?.textContent || ''))
const before = await page.$eval('.match-hud', (el) => el.textContent || '')
await page.keyboard.down(' ')
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.up(' ')
const after = await page.$eval('.match-hud', (el) => el.textContent || '')
if (before === after) throw new Error(`ammo did not change: ${before}`)
await page.screenshot({ path: `${dir}/cinder-field-match.png` })
console.log('hud before', before.replace(/\s+/g, ' '))
console.log('hud after', after.replace(/\s+/g, ' '))

const online = await page.$eval('.lobby-panel', (el) => el.innerText)
if (!/does not invent a second player/i.test(online)) throw new Error('online panel is not honest')
await page.screenshot({ path: `${dir}/lobby-offline.png` })

await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.textContent?.trim() === 'Make')?.click()
})
await page.waitForSelector('.dropzone')
const drop = await page.$eval('.dropzone', (el) => el.innerText)
if (!/Unity WebGL/.test(drop) || !/40 MB/.test(drop)) throw new Error(drop)
await page.screenshot({ path: `${dir}/upload-engines.png` })

await page.evaluate(() => {
  location.hash = '#/create/generate'
})
await page.waitForFunction(() => /mashup desk/i.test(document.body.innerText))
if (await page.$('.check')) throw new Error('browser Gemini key field is still present')
await page.screenshot({ path: `${dir}/mashup-desk.png` })

await page.evaluate(() => {
  location.hash = '#/you'
})
await page.waitForFunction(() => document.body.innerText.includes('Cloud account'))
await page.waitForFunction(() => document.body.innerText.includes('Make a card'))
await page.screenshot({ path: `${dir}/you-cloud-off.png` })

await browser.close()
console.log('VERIFY_OK')
