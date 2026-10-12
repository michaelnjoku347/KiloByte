import { readdir, readFile, writeFile } from 'node:fs/promises'
import { brotliCompress, gzip, constants } from 'node:zlib'
import { promisify } from 'node:util'
import path from 'node:path'

const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)
const root = path.resolve('dist')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (/\.(js|css|html|svg|json|wasm|webmanifest)$/.test(entry.name)) files.push(full)
  }
  return files
}

const files = await walk(root)
for (const file of files) {
  const body = await readFile(file)
  if (body.length < 1024) continue
  await writeFile(file + '.gz', await gzipAsync(body, { level: 9 }))
  await writeFile(file + '.br', await brotliAsync(body, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }))
}
console.log(`compressed ${files.length} static files`)
