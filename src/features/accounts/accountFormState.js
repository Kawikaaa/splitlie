export function accountDraft(account, currency) {
  return { name: account?.name || '', type: account?.type || 'checking', currency: account?.currency || currency,
    balance: account ? String(account.balance) : '', include_in_total: account?.include_in_total ?? true,
    institution: account?.institution || '', note: account?.note || '' }
}

export function buildAccountChanges(draft, original, confirmBalance = false) {
  const changes = {}
  for (const field of ['name', 'type', 'include_in_total', 'institution', 'note']) {
    const value = field === 'name' ? draft.name.trim() : draft[field]
    if (value !== (original[field] ?? '')) changes[field] = value
  }
  if (Number(draft.balance) !== Number(original.balance) || confirmBalance) changes.balance = Number(draft.balance)
  if (draft.currency !== original.currency) changes.currency = draft.currency
  return changes
}
