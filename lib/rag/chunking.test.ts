import assert from 'node:assert/strict'
import test from 'node:test'
import { chunkDocument } from './chunking'

test('chunkDocument creates overlapping ordered chunks', () => {
  const chunks = chunkDocument('a'.repeat(8500), 4000)
  assert.equal(chunks.length, 3)
  assert.equal(chunks[1].sourceMetadata.start, 3600)
  assert.equal(chunks[0].index, 0)
})

test('chunkDocument rejects oversized input', () => {
  assert.throws(() => chunkDocument('a'.repeat(200001)), /size limit/)
})
