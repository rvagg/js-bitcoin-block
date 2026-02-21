#!/usr/bin/env node

import { Transform } from 'node:stream'
import { createReadStream } from 'node:fs'
import { BitcoinBlock } from './bitcoin-block.js'

/** @typedef {import('node:fs').ReadStream} ReadStream */

/**
 * @param {ReadStream} stream
 * @returns {Promise<Buffer>}
 */
async function streamToBuffer (stream) {
  return new Promise((resolve, reject) => {
    /** @type {Uint8Array[]} */
    const chunks = []
    stream
      .on('error', reject)
      .pipe(new Transform({
        transform (chunk, _, callback) {
          chunks.push(chunk)
          callback()
        }
      }))
      .on('finish', function () {
        resolve(Buffer.concat(chunks))
      })
      .on('error', reject)
  })
}

/**
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function ensureBinary (buf) {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] < 48 || buf[i] > 102) { // not hex
      return buf
    }
  }
  // probably hex, convert it
  return Buffer.from(buf.toString('ascii'), 'hex')
}

/**
 * @param {ReadStream} stream
 * @param {'min'|'header'|'full'} [type]
 */
async function toJson (stream, type) {
  let block = await streamToBuffer(stream)
  block = ensureBinary(block)
  const decoded = BitcoinBlock.decode(block)
  const porcelain = decoded.toPorcelain(type)
  console.log(JSON.stringify(porcelain, null, 2))
}

async function run () {
  if (process.argv[2] === 'to-json' || process.argv[2] === 'to-json-min') {
    const stream = process.argv.length > 3 ? createReadStream(process.argv[3]) : process.stdin
    await toJson(/** @type {ReadStream} */ (stream), process.argv[2] === 'to-json-min' ? 'min' : 'full')
  } else {
    console.error(`No such command [${process.argv[2] || ''}]`)
    console.error('Usage: bitcoin-block <to-json | to-json-min> [file]    (or stdin)')
    process.exit(1)
  }
}

run().catch((err) => {
  console.error(err.stack)
  process.exit(1)
})
