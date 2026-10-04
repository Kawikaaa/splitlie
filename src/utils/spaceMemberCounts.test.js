import assert from 'node:assert/strict'
import test from 'node:test'
import { spaceMemberIconKind, withSpaceMemberCounts } from './spaceMemberCounts.js'

test('counts unique active members, excluding departed members and invitations', () => {
  const spaces = [{ id: 'p', type: 'personal' }, { id: 's', type: 'shared' }, { id: 'empty', type: 'shared' }]
  const result = withSpaceMemberCounts(spaces, [
    { space_id: 's', user_id: 'a', status: 'active' },
    { space_id: 's', user_id: 'a', status: 'active' },
    { space_id: 's', user_id: 'b', status: 'active' },
    { space_id: 's', user_id: 'c', status: 'left' },
    { space_id: 's', user_id: 'd', status: 'invited' },
  ])
  assert.deepEqual(result.map(space => space.member_count), [1, 2, 0])
  assert.equal(spaces[0].member_count, undefined)
})
test('failed member reads never present a fabricated zero or one', () => {
  assert.deepEqual(withSpaceMemberCounts([{ type: 'personal' }, { type: 'shared' }], null).map(space => space.member_count), [1, null])
})
test('two members use a pair icon; three or more use a group icon', () => {
  assert.deepEqual([1, 2, 3, 12, null, 0].map(spaceMemberIconKind), ['single', 'pair', 'group', 'group', 'group', 'group'])
})
