export const TRANSACTION_CATEGORIES = [
  'Food',
  'Groceries',
  'Housing',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Income',
  'Other',
]

export function roundMoney(value) {
  return (
    Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100
  )
}

export function getToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function createTransactionFormValues({
  transaction,
  userId,
}) {
  if (!transaction?.id) {
    return {
      type: 'expense',
      amount: '',
      category: 'Food',
      paymentStatus: 'paid',
      description: '',
      date: getToday(),
      paidBy: userId || '',
      splitType: 'none',
      participantIds: [],
      customSplits: {},
    }
  }

  const splits = transaction.splits ?? []

  return {
    type: transaction.type || 'expense',
    amount:
      transaction.amount != null
        ? String(transaction.amount)
        : '',
    category:
      transaction.category ||
      (transaction.type === 'income'
        ? 'Income'
        : 'Food'),
    paymentStatus: transaction.payment_status || 'paid',
    description: transaction.description || '',
    date: transaction.transaction_date || getToday(),
    paidBy: transaction.paid_by || userId || '',
    splitType:
      transaction.type === 'income'
        ? 'none'
        : transaction.split_type || 'none',
    participantIds: splits.map(
      (split) => split.user_id
    ),
    customSplits: Object.fromEntries(
      splits.map((split) => [
        split.user_id,
        String(Number(split.amount) || 0),
      ])
    ),
    percentageSplits: transaction.split_type === 'percentage' && Number(transaction.base_amount) > 0
      ? Object.fromEntries(splits.map((split) => [
          split.user_id,
          String(roundMoney(Number(split.amount) / Number(transaction.base_amount) * 100)),
        ]))
      : {},
  }
}

export function selectParticipants(
  members,
  participantIds
) {
  const selected = new Set(participantIds)

  return members.filter((member) =>
    selected.has(member.user_id)
  )
}

export function calculateEqualSplits(
  participants,
  amount
) {
  if (
    participants.length === 0 ||
    amount <= 0
  ) {
    return []
  }

  const totalCents = Math.round(amount * 100)
  const baseCents = Math.floor(
    totalCents / participants.length
  )
  const remainder =
    totalCents - baseCents * participants.length

  return participants.map((member, index) => ({
    user_id: member.user_id,
    amount:
      (baseCents + (index < remainder ? 1 : 0)) /
      100,
  }))
}

export function calculateCustomTotal(
  participants,
  customSplits
) {
  return roundMoney(
    participants.reduce(
      (total, member) =>
        total +
        (Number(customSplits[member.user_id]) || 0),
      0
    )
  )
}

export function calculatePercentageSplits(
  participants,
  percentages,
  amount
) {
  if (participants.length === 0 || amount <= 0) return []

  const totalCents = Math.round(amount * 100)
  const rows = participants.map((member, index) => {
    const percentage = Math.max(0, Number(percentages[member.user_id]) || 0)
    const exactCents = totalCents * percentage / 100
    const cents = Math.floor(exactCents)

    return {
      user_id: member.user_id,
      index,
      cents,
      remainder: exactCents - cents,
    }
  })

  let remaining = totalCents - rows.reduce((sum, row) => sum + row.cents, 0)
  const remainderOrder = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  )

  for (let index = 0; remaining > 0 && remainderOrder.length > 0; index += 1) {
    remainderOrder[index % remainderOrder.length].cents += 1
    remaining -= 1
  }

  return rows.map(({ user_id, cents }) => ({
    user_id,
    amount: cents / 100,
  }))
}
