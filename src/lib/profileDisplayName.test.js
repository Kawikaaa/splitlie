import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDisplayName, saveProfileDisplayName } from './profileDisplayName.js'

test('display names trim surrounding spaces and reject empty or long values', () => {
  assert.equal(normalizeDisplayName('  Kawika  '), 'Kawika')
  assert.throws(() => normalizeDisplayName('  '))
  assert.throws(() => normalizeDisplayName('x'.repeat(51)))
})

function mockClient(profileError = null, authError = null) {
  const calls = []
  const query = {
    update(value) { calls.push(['update', value]); return this },
    eq(key, value) { calls.push(['filter', key, value]); return this },
    select(value) { calls.push(['select', value]); return this },
    async single() { return { error: profileError } },
  }
  return { calls, client: {
    from(table) { calls.push(['table', table]); return query },
    auth: { async updateUser(value) { calls.push(['auth', value]); return { data: { user: {} }, error: authError } } },
  } }
}

test('saves only the current profile name and synchronizes Auth metadata', async () => {
  const { client, calls } = mockClient()
  const result = await saveProfileDisplayName(client, 'current-user', ' New name ')
  assert.equal(result.displayName, 'New name')
  assert.deepEqual(calls, [['table', 'profiles'], ['update', { display_name: 'New name' }],
    ['filter', 'id', 'current-user'], ['select', 'id, display_name'], ['auth', { data: { display_name: 'New name' } }]])
})

test('a denied database write never updates Auth or reports success', async () => {
  const { client, calls } = mockClient({ message: 'denied' })
  const result = await saveProfileDisplayName(client, 'current-user', 'New name')
  assert.ok(result.error)
  assert.ok(!calls.some(([operation]) => operation === 'auth'))
})

test('a partial metadata sync failure stays retryable rather than claiming success', async () => {
  const { client } = mockClient(null, { message: 'offline' })
  const result = await saveProfileDisplayName(client, 'current-user', 'New name')
  assert.ok(result.profileSaved)
  assert.ok(result.error)
  assert.equal(result.displayName, undefined)
})
