/* eslint-env mocha */

const context = require.context('./fixtures', true, /\.json$/)
const test = require('./test')
const { fromHex } = require('../util')

for (const key of context.keys()) {
  it(key, async () => {
  // load .json files to `fixture.data` and corresponding .hex file binary data as `fixture.block`
    const hash = key.replace(/^.\/([^.]+)\.json/, '$1')
    // console.log((await import(`!!raw-loader!./fixtures/${hash}.hex`)).substr(0, 100)
    const data = (await import(`./fixtures/${hash}.json`)).default
    const blockHex = (await import(`!!raw-loader!./fixtures/${hash}.hex`)).default
    const block = fromHex(blockHex.replace(/\n/g, ''))

    test(hash, block, data)
  })
}
