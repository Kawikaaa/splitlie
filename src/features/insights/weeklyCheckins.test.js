import test from 'node:test'
import assert from 'node:assert/strict'
import { countWeeklyStreak, previousWeek, readLegacyCheckins, createWeeklyCheckinApi, localDateKey, toCheckinRow } from './weeklyCheckins.js'
import { checkinLocales } from '../../i18n/checkinLocales.js'

test('streak counts beyond eight weeks, tolerates unfinished current week, resets after missed week', () => {
  let week = '2026-09-28'
  const records = []
  for (let index = 0; index < 14; index++) { records.push({ week, completed: true }); week = previousWeek(week) }
  assert.equal(countWeeklyStreak(records, '2026-09-28'), 14)
  assert.equal(countWeeklyStreak(records, '2026-10-05'), 14)
  assert.equal(countWeeklyStreak(records, '2026-10-12'), 0)
  assert.equal(countWeeklyStreak([...records, records[0]], '2026-09-28'), 14)
  assert.equal(countWeeklyStreak([{ week: 'invalid', completed: true }], '2026-09-28'), 0)
})
test('week keys stay local across DST and year boundaries', () => {
  assert.equal(previousWeek('2026-11-02'), '2026-10-26')
  assert.equal(previousWeek('2026-01-05'), '2025-12-29')
  assert.equal(localDateKey(new Date('2026-10-04T23:30:00')), '2026-10-04')
})
test('legacy import merges both keys, rejects corrupt entries, never invents dates', () => {
  const storage = { getItem: key => JSON.stringify(key.startsWith('splitly:') ? ['2026-09-21'] : [
    { week: '2026-09-28', completed: true, feeling: 'comfortable', tags: ['otherReason','invalid'], completedAt: '2026-10-04T12:00:00Z' },
    { week: '2026-02-30', completed: true }, { week: '2026-09-28', completed: false }, null,
  ]) }
  const records = readLegacyCheckins(storage, 'space')
  assert.equal(records.length, 2)
  assert.equal(records[0].completedDate, null)
  assert.equal(records[1].completedDate, localDateKey(new Date('2026-10-04T12:00:00Z')))
  assert.deepEqual(records[1].tags, ['otherReason'])
  assert.deepEqual(readLegacyCheckins({ getItem() { throw Error('blocked') } }, 'space'), [])
})
test('cloud save returns persisted data only, errors cannot produce successful records', async () => {
  const record = { week: '2026-09-28', feeling: 'comfortable', tags: [], completedAt: '2026-10-04T12:00:00Z', completedDate: '2026-10-04' }
  const row = toCheckinRow(record, 'user', 'space')
  let options
  const client = { from: () => ({ upsert(payload, config) { assert.deepEqual(payload, row); options = config; return { select: () => ({ single: async () => ({ data: row, error: null }) }) } } }) }
  const saved = await createWeeklyCheckinApi(client).save('user', 'space', record)
  assert.equal(saved.completed, true)
  assert.equal(saved.completedDate, '2026-10-04')
  assert.equal(options.onConflict, 'user_id,space_id,week_start')
  const broken = { from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({ error: new Error('offline') }) }) }) }) }
  await assert.rejects(createWeeklyCheckinApi(broken).save('user','space',record), /offline/)
})
test('legacy import never replaces existing account rows', async () => {
  const client = { from: () => ({ upsert: async (_, options) => { assert.equal(options.ignoreDuplicates, true); return { error: null } } }) }
  await createWeeklyCheckinApi(client).importLegacy('user','space',[{ week: '2026-09-28' }])
})
test('check-in copy exists in all five languages with matching keys', () => {
  for (const messages of Object.values(checkinLocales)) assert.deepEqual(Object.keys(messages), Object.keys(checkinLocales.en))
})
