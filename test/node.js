/* eslint-env mocha */

import fs from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from './test.js'
import { fromHex } from '../util.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// export an async function per block
const hashes = readdirSync(path.join(__dirname, 'fixtures'))
  .map((f) => f.endsWith('.hex') && f.substring(0, f.length - 4))
  .filter(Boolean)

for (const hash of hashes) {
  if (typeof hash !== 'string') {
    continue
  }
  it(hash, async () => {
    const blockContent = fromHex(await fs.readFile(path.join(__dirname, 'fixtures', `${hash}.hex`), 'utf8'))
    const expectedData = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures', `${hash}.json`), 'utf8'))
    test(blockContent, expectedData)
  }).timeout(15000)
}
