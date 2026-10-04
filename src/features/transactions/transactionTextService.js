import { getToday } from './transactionUtils.js'
import { parseQuickTransaction } from './quickTransactionParser.js'

export async function parseTransactionText(text, { fallbackCurrency = 'USD' } = {}) {
  const today = getToday()
  const deterministic = parseQuickTransaction(text, { fallbackCurrency, today })

  // V2 uses local parsing only. Future enrichment must be an explicit optional layer.
  return { ...deterministic, source: 'local' }
}
