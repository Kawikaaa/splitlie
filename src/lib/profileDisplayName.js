export function normalizeDisplayName(value) {
  const name = String(value ?? '').trim()
  if (!name || name.length > 50) throw new Error('invalid-display-name')
  return name
}

// Profiles supplies member names; Auth metadata supplies the signed-in UI.
// Only show success once both persisted copies have been updated.
export async function saveProfileDisplayName(client, userId, value) {
  const displayName = normalizeDisplayName(value)
  if (!userId) throw new Error('missing-user')
  const profile = await client.from('profiles')
    .update({ display_name: displayName }).eq('id', userId)
    .select('id, display_name').single()
  if (profile.error) return { error: profile.error }
  const auth = await client.auth.updateUser({ data: { display_name: displayName } })
  if (auth.error) return { error: auth.error, profileSaved: true }
  return { data: auth.data, displayName }
}
