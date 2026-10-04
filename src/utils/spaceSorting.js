export function sortSpaces(spaces = []) {
  return [...spaces].sort((a, b) => {
    const aPersonal = a.type === 'personal'
    const bPersonal = b.type === 'personal'
    if (aPersonal !== bPersonal) return aPersonal ? -1 : 1
    const aPinned = Boolean(a.pinned_at)
    const bPinned = Boolean(b.pinned_at)
    if (aPinned !== bPinned) return aPinned ? -1 : 1
    const aUpdated = new Date(a.updated_at || a.created_at || 0).getTime()
    const bUpdated = new Date(b.updated_at || b.created_at || 0).getTime()
    return bUpdated - aUpdated
  })
}
