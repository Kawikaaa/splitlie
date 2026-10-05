import { supabase } from '../lib/supabase'
import { withSpaceMemberCounts } from '../utils/spaceMemberCounts'

export async function fetchSpaces(userId) {
  const result = await supabase
    .from('spaces')
    .select('*')
    .order('updated_at', { ascending: false })

  if (result.error || !userId) return result

  const spaces = result.data ?? []
  const sharedIds = spaces.filter(space => space.type === 'shared').map(space => space.id)
  const [preferenceResult, memberResult] = await Promise.all([
    supabase.from('space_members').select('space_id, pinned_at').eq('user_id', userId),
    sharedIds.length ? supabase.from('space_members').select('space_id, user_id, status').in('space_id', sharedIds).eq('status', 'active') : Promise.resolve({ data: [], error: null }),
  ])
  const preferences = new Map((preferenceResult.data ?? []).map(item => [item.space_id, item.pinned_at]))
  return { ...result, data: withSpaceMemberCounts(spaces, memberResult.error ? null : memberResult.data)
    .map(space => ({ ...space, pinned_at: preferences.get(space.id) || null })) }
}

export async function updateSpacePinned(spaceId, userId, pinned) {
  return supabase.from('space_members')
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq('space_id', spaceId)
    .eq('user_id', userId)
}

export async function createSharedSpace({
  name,
  currency,
}) {
  return supabase.rpc(
    'create_shared_space',
    {
      p_name: name,
      p_currency: currency,
    }
  )
}

export async function completeSharedSpace(spaceId) {
  return supabase.rpc('complete_shared_space', { p_space_id: spaceId })
}

export async function deleteSharedSpacePermanently(spaceId) {
  return supabase.rpc('delete_shared_space_permanently', { p_space_id: spaceId })
}

export async function renameSharedSpace(spaceId, name) {
  return supabase
    .from('spaces')
    .update({ name: name.trim() })
    .eq('id', spaceId)
    .eq('type', 'shared')
    .select('*')
    .single()
}

export async function rebaseSpaceCurrency(spaceId, currency, conversionRate) {
  return supabase.rpc('rebase_space_currency', {
    p_space_id: spaceId,
    p_new_currency: currency,
    p_conversion_rate: conversionRate,
  })
}

export async function createSettlement({
  spaceId,
  fromUserId,
  toUserId,
  amount,
  currency,
  settlementDate,
  note,
}) {
  return supabase.rpc(
    'create_settlement',
    {
      p_space_id: spaceId,
      p_from_user: fromUserId,
      p_to_user: toUserId,
      p_amount: amount,
      p_currency: currency,
      p_settlement_date: settlementDate,
      p_note: note || null,
    }
  )
}

export async function fetchTransactions(spaceId) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('space_id', spaceId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchRecentTransactions(spaceId, limit = 12) {
  return supabase
    .from('transactions')
    .select('id, type, amount, currency, description, category, payment_status, transaction_date, created_at')
    .eq('space_id', spaceId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
}

export async function fetchMonthlyBudgets(spaceId, userId, month) {
  return supabase.from('monthly_budgets').select('*')
    .eq('space_id', spaceId).eq('user_id', userId).eq('month', `${month}-01`)
    .order('category')
}

export async function upsertMonthlyBudget(budget) {
  return supabase.from('monthly_budgets').upsert(budget, {
    onConflict: 'space_id,user_id,category,month',
  }).select('*').single()
}

export async function deleteMonthlyBudget(budgetId) {
  return supabase.from('monthly_budgets').delete().eq('id', budgetId)
}

export async function fetchFixedExpenses(spaceId, userId) {
  return supabase.from('fixed_expenses').select('*')
    .eq('space_id', spaceId).eq('user_id', userId)
    .order('due_day').order('created_at')
}

export async function createFixedExpense(expense) {
  return supabase.from('fixed_expenses').insert(expense).select('*').single()
}

export async function updateFixedExpense(expenseId, changes) {
  return supabase.from('fixed_expenses').update(changes).eq('id', expenseId).select('*').single()
}

export async function deleteFixedExpense(expenseId) {
  return supabase.from('fixed_expenses').delete().eq('id', expenseId)
}

export async function fetchFixedExpenseOccurrences(spaceId, userId) {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('fixed_expense_occurrences').select('*')
      .eq('space_id', spaceId).eq('user_id', userId).order('id').range(offset, offset + 999)
    if (error) return { data: null, error }
    rows.push(...data)
    if (data.length < 1000) return { data: rows, error: null }
  }
}

export function setFixedExpensePaused(id, paused, today) {
  return supabase.rpc('set_fixed_expense_paused', { p_id: id, p_paused: paused, p_today: today })
}

export function resolveFixedExpenseOccurrenceV2(id, dueDate, action, paidOn = null) {
  return supabase.rpc('resolve_fixed_expense_occurrence_v2', {
    p_fixed_expense_id: id, p_due_date: dueDate, p_action: action, p_paid_on: paidOn,
  })
}

// Uses the same authenticated reads and ownership filters as existing Personal Space pages.
// An incomplete read cannot be a before/after accounting baseline.
export async function fetchPersonalFinancialState({ spaceId, userId, month }) {
  try {
    const results = await Promise.all([
      fetchTransactions(spaceId), fetchMonthlyBudgets(spaceId, userId, month),
      fetchFixedExpenses(spaceId, userId), fetchFixedExpenseOccurrences(spaceId, userId, month),
    ])
    if (results.some(result => result.error)) return null
    const [transactions, budgets, fixedExpenses, fixedExpenseOccurrences] = results.map(result => result.data || [])
    return { transactions, budgets, fixedExpenses, fixedExpenseOccurrences }
  } catch { return null }
}

export async function resolveFixedExpenseOccurrence(fixedExpenseId, month, action) {
  return supabase.rpc('resolve_fixed_expense_occurrence', {
    p_fixed_expense_id: fixedExpenseId,
    p_occurrence_month: `${month}-01`,
    p_action: action,
  })
}

export async function fetchSpaceMembers(spaceId) {
  const result = await supabase
    .from('space_members')
    .select(`
      space_id,
      user_id,
      role,
      status,
      joined_at,
      left_at,
      profiles (display_name, avatar_url)
    `)
    .eq('space_id', spaceId)
    .order('joined_at', { ascending: true })

  if (!result.error || result.error.code !== '42703') return result

  return supabase
    .from('space_members')
    .select(`
      space_id,
      user_id,
      role,
      status,
      joined_at,
      left_at,
      profiles (display_name)
    `)
    .eq('space_id', spaceId)
    .order('joined_at', { ascending: true })
}

export async function fetchTransactionSplits() {
  return supabase
    .from('transaction_splits')
    .select('id, transaction_id, user_id, amount')
}

export async function fetchSettlements(spaceId) {
  return supabase
    .from('settlements')
    .select(
      'id, space_id, from_user, to_user, amount, currency, settlement_date, note, created_by, created_at, entry_type, reversal_of, reversed_at, reversed_by, reversal_reason'
    )
    .eq('space_id', spaceId)
    .order('settlement_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function reverseSettlement({
  settlementId,
  reason,
}) {
  return supabase.rpc('reverse_settlement', {
    p_settlement_id: settlementId,
    p_reason: reason,
  })
}

export async function fetchSettledTransactionIds(spaceId) {
  const { data: settlements, error: settlementError } =
    await supabase
      .from('settlements')
      .select('id')
      .eq('space_id', spaceId)

  if (settlementError) {
    return { data: null, error: settlementError }
  }

  const settlementIds = (settlements ?? []).map(
    (settlement) => settlement.id
  )

  if (settlementIds.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('settlement_transactions')
    .select('transaction_id')
    .in('settlement_id', settlementIds)

  return {
    data: error
      ? null
      : [...new Set(
          (data ?? []).map((row) => row.transaction_id)
        )],
    error,
  }
}

export async function deleteTransactionById(
  transactionId
) {
  return supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
}

export async function createSpaceInvitation(
  spaceId,
  email
) {
  return supabase.rpc(
    'create_email_space_invitation',
    {
      target_space_id: spaceId,
      target_email: email,
    }
  )
}

export async function fetchSpaceInvitations(spaceId) {
  return supabase
    .from('space_invitations')
    .select('id, invited_email, status, expires_at, created_at')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
}

export async function revokeSpaceInvitation(invitationId) {
  return supabase.rpc('revoke_space_invitation', {
    invitation_id: invitationId,
  })
}

export async function fetchSpaceInvitationDetails(token) {
  return supabase.rpc('get_space_invitation_details', {
    invitation_token: token,
  })
}

export async function acceptSpaceInvitation(
  invitationToken
) {
  return supabase.rpc(
    'accept_space_invitation',
    {
      invitation_token: invitationToken,
    }
  )
}

export async function fetchMemberSpaceBalance({
  spaceId,
  userId,
}) {
  return supabase.rpc(
    'get_member_space_balance',
    {
      target_space_id: spaceId,
      target_user_id: userId,
    }
  )
}

export async function removeSpaceMember({
  spaceId,
  userId,
}) {
  return supabase.rpc(
    'remove_space_member',
    {
      target_space_id: spaceId,
      target_user_id: userId,
    }
  )
}

export async function fetchMySpaceBalance(
  spaceId
) {
  return supabase.rpc(
    'get_my_space_balance',
    {
      target_space_id: spaceId,
    }
  )
}

export async function leaveSharedSpace(
  spaceId
) {
  return supabase.rpc(
    'leave_shared_space',
    {
      target_space_id: spaceId,
    }
  )
}

export async function fetchActiveSpaceMemberRows(
  spaceId
) {
  return supabase
    .from('space_members')
    .select('user_id, role, status')
    .eq('space_id', spaceId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
}

export async function fetchProfilesByIds(userIds) {
  const result = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  if (!result.error || result.error.code !== '42703') return result

  return supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)
}

export async function fetchProfileAvatar(userId) {
  if (!userId) return { data: null, error: null }

  return supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle()
}

export async function updateProfileAvatar(userId, avatarUrl) {
  return supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl || null })
    .eq('id', userId)
    .select('avatar_url')
    .single()
}

export async function createPersonalTransaction(
  transaction
) {
  return supabase
    .from('transactions')
    .insert(transaction)
}

export async function updatePersonalTransaction({
  transactionId,
  spaceId,
  changes,
  expectedUpdatedAt,
}) {
  let query = supabase
    .from('transactions')
    .update(changes)
    .eq('id', transactionId)
    .eq('space_id', spaceId)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  return query.select('id').single()
}

export async function createSharedTransaction(
  transaction
) {
  const result = await supabase.rpc(
    'create_shared_transaction_v2',
    transaction
  )

  if (result.error?.code === 'PGRST202' && transaction.p_currency === transaction.p_base_currency) {
    const { p_base_amount, p_base_currency, p_exchange_rate, p_exchange_rate_date, ...legacy } = transaction
    return supabase.rpc('create_shared_transaction', legacy)
  }

  return result
}

export async function updateSharedTransaction(
  transaction
) {
  const result = await supabase.rpc(
    'update_shared_transaction_v2',
    transaction
  )

  if (result.error?.code === 'PGRST202' && transaction.p_currency === transaction.p_base_currency) {
    const { p_base_amount, p_base_currency, p_exchange_rate, p_exchange_rate_date, ...legacy } = transaction
    return supabase.rpc('update_shared_transaction', legacy)
  }

  return result
}
