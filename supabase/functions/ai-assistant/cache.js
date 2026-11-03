import { validWeeklyFacts } from './facts.js'
import { validateReport } from './contract.js'

// Stable across database row order; financial edits, refunds and removals change
// the input. Completed weeks keep the same key on later visits.
export function weeklyFingerprintInput(rows, facts, { language, goal = 'understand', model = 'qwen3.8-flash' }) {
  const fields = ['id','space_id','parent_transaction_id','type','amount','currency','base_amount','base_currency','category','payment_status','transaction_date','conversion_status','updated_at','is_excluded','is_excluded_from_spending']
  return { rows: rows.map(row => Object.fromEntries(fields.map(field => [field,row[field] ?? null]))).sort((a,b) => String(a.id).localeCompare(String(b.id))), facts, language, goal, model, prompt:'weekly-select-v2' }
}

export function selectWeeklyReports(rows, facts, hash, goal = 'understand') {
  const valid = rows.filter(row => validWeeklyFacts(row.facts) && row.facts.start === facts.start && row.facts.currency === facts.currency && validateReport(row.output,row.facts,row.goal))
  return { report:valid.find(row => row.facts_hash === hash && row.goal === goal && validateReport(row.output,facts,goal)) || null,
    previousReport:valid.find(row => row.facts_hash !== hash) || null,
    stale:rows.some(row => row.facts_hash !== hash) }
}
