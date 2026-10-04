import assert from 'node:assert/strict'
import test from 'node:test'
import { overviewLoadState } from './overviewLoadState.js'

test('first paint and scope changes remain skeletons even before the effect starts', () => {
  assert.equal(overviewLoadState({ scope: 'personal:1', loadedScope: '', pending: false }), 'loading')
  assert.equal(overviewLoadState({ scope: 'shared:2', loadedScope: 'personal:1', pending: false }), 'loading')
  assert.equal(overviewLoadState({ scope: 'personal:refresh2', loadedScope: 'personal:refresh1', pending: false, failed: true }), 'loading')
})
test('pending refreshes cannot expose previous values; complete failures are retryable', () => {
  assert.equal(overviewLoadState({ scope: 'a', loadedScope: 'a', pending: true }), 'loading')
  assert.equal(overviewLoadState({ scope: 'a', loadedScope: 'a', pending: false, failed: true }), 'error')
  assert.equal(overviewLoadState({ scope: 'a', loadedScope: 'a', pending: false, failed: false }), 'ready')
})
