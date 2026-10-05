export const FEELINGS = ['comfortable', 'aboutRight', 'higherThanLiked']
export const CONTEXT_TAGS = ['diningOut', 'socialActivities', 'shoppingReason', 'transportationReason', 'travelReason', 'unexpectedExpense', 'otherReason']

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function validWeek(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localDateKey(date) === value && date.getDay() === 1
}
export function previousWeek(week) {
  const date = new Date(`${week}T12:00:00`)
  date.setDate(date.getDate() - 7)
  return localDateKey(date)
}
export function countWeeklyStreak(records, currentWeek) {
  if (!validWeek(currentWeek)) return 0
  const weeks = new Set(records.filter(item => item.completed && validWeek(item.week)).map(item => item.week))
  let week = weeks.has(currentWeek) ? currentWeek : previousWeek(currentWeek)
  let count = 0
  while (weeks.has(week)) { count += 1; week = previousWeek(week) }
  return count
}
export function readLegacyCheckins(storage, spaceId) {
  const byWeek = new Map()
  for (const prefix of ['splitly', 'splitlie']) {
    let rows
    try { rows = JSON.parse(storage.getItem(`${prefix}:weekly-checkins:${spaceId}`) || '[]') } catch { continue }
    if (!Array.isArray(rows)) continue
    for (const raw of rows) {
      const item = typeof raw === 'string' ? { week: raw, completed: true } : raw
      if (!item?.completed || !validWeek(item.week)) continue
      const date = item.completedAt ? new Date(item.completedAt) : null
      const knownDate = date && !Number.isNaN(date.getTime())
      byWeek.set(item.week, { week: item.week, completed: true,
        feeling: FEELINGS.includes(item.feeling) ? item.feeling : null,
        tags: Array.isArray(item.tags) ? [...new Set(item.tags.filter(tag => CONTEXT_TAGS.includes(tag)))] : [],
        completedAt: knownDate ? date.toISOString() : null,
        completedDate: knownDate ? localDateKey(date) : null,
      })
    }
  }
  return [...byWeek.values()]
}
export function fromCheckinRow(row) {
  return { week: row.week_start, feeling: row.feeling, tags: row.tags || [], completed: true, completedAt: row.completed_at, completedDate: row.completed_date }
}
export function toCheckinRow(record, userId, spaceId) {
  return { user_id: userId, space_id: spaceId, week_start: record.week, feeling: record.feeling || null, tags: record.tags || [], completed_at: record.completedAt || null, completed_date: record.completedDate || null }
}
export function createWeeklyCheckinApi(client) {
  return {
    async load(userId, spaceId) {
      const rows = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('weekly_checkins').select('*').eq('user_id', userId).eq('space_id', spaceId).order('week_start').range(offset, offset + 499)
        if (error) throw error
        rows.push(...data.map(fromCheckinRow))
        if (data.length < 500) return rows
      }
    },
    async importLegacy(userId, spaceId, records) {
      for (let index = 0; index < records.length; index += 100) {
        const { error } = await client.from('weekly_checkins').upsert(records.slice(index, index + 100).map(record => toCheckinRow(record, userId, spaceId)), { onConflict: 'user_id,space_id,week_start', ignoreDuplicates: true })
        if (error) throw error
      }
    },
    async save(userId, spaceId, record) {
      const { data, error } = await client.from('weekly_checkins').upsert(toCheckinRow(record, userId, spaceId), { onConflict: 'user_id,space_id,week_start' }).select('*').single()
      if (error) throw error
      return fromCheckinRow(data)
    },
  }
}
