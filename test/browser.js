/* eslint-env mocha */

import test from './test.js'
import { fromHex } from '../util.js'

// @ts-ignore
const context = require.context('./fixtures', true, /\.json$/)

for (const key of context.keys()) {
  const hash = key.replace(/^.\/([^.]+)\.json/, '$1')
  it(hash, async () => {
    // load .json files to `fixture.data` and corresponding .hex file binary data as `fixture.block`
    const data = (await import(`./fixtures/${hash}.json`)).default
    const blockHex = (await import(`!!raw-loader!./fixtures/${hash}.hex`)).default
    const block = fromHex(blockHex.replace(/\n/g, ''))

    test(block, data)
  }).timeout(5000)
}
