export function withSpaceMemberCounts(spaces, memberships) {
  const membersBySpace = new Map()
  for (const member of memberships ?? []) {
    if (member.status !== 'active' || !member.user_id) continue
    if (!membersBySpace.has(member.space_id)) membersBySpace.set(member.space_id, new Set())
    membersBySpace.get(member.space_id).add(member.user_id)
  }
  return spaces.map(space => ({
    ...space,
    member_count: space.type === 'personal' ? 1 : memberships == null ? null : (membersBySpace.get(space.id)?.size ?? 0),
  }))
}

export function spaceMemberIconKind(count) {
  if (!Number.isInteger(count) || count >= 3 || count < 1) return 'group'
  return count === 2 ? 'pair' : 'single'
}
