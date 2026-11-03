import { calendarDate } from '../../../supabase/functions/ai-transaction-draft/contract.js'
import { shiftDay, weekRange, validWeeklyFacts } from '../../../supabase/functions/ai-assistant/facts.js'
import { normalizeFinancialTransactions } from '../financial/transactionSemantics.js'

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
export function validReviewWeek(value, today) {
  if (!value) return null
  try { return weekRange(today,value).start } catch { return null }
}
export function reviewWeekOptions(today, selected) {
  const current=weekRange(today).start
  const options=Array.from({length:7},(_,index)=>shiftDay(current,-7*index))
  if(validReviewWeek(selected,today)&&!options.includes(selected))options.push(selected)
  return options.sort().reverse()
}
export function readReviewContext(params,{spaceId,today}) {
  const week=validReviewWeek(params.get('reviewWeek'),today)
  return week&&params.get('reviewSpace')===spaceId ? week : null
}
export function reviewSnapshotFacts(snapshot,{userId,spaceId,language,weekStart}) {
  return snapshot?.userId===userId&&snapshot.spaceId===spaceId&&snapshot.language===language&&snapshot.weekStart===weekStart
    &&validWeeklyFacts(snapshot.facts)&&snapshot.facts.start===weekStart ? snapshot.facts : null
}
export function reviewReturnUrl(week,spaceId) {
  return `/?${new URLSearchParams({reviewWeek:week,reviewSpace:spaceId})}`
}
export function weeklyEvidenceUrl(facts,factId,spaceId) {
  const params=new URLSearchParams({from:facts.start,through:facts.through,basis:'spending'})
  if(factId==='category:0'&&facts.categories[0])params.set('category',facts.categories[0].category)
  else if(factId?.startsWith('category:')&&facts.categories.some(row=>row.category===factId.slice(9)))params.set('category',factId.slice(9))
  if(factId==='largest'&&facts.largest&&uuid(facts.largest.id))params.set('entry',facts.largest.id)
  if(factId==='refunds')params.set('kind','refund')
  if(spaceId){params.set('reviewWeek',facts.start);params.set('reviewSpace',spaceId)}
  return `/transactions?${params}`
}
export function readEvidenceFilters(params) {
  const names=['from','through','entry','category','kind','basis']
  const hasSource=names.some(key=>params.has(key))
  const from=params.get('from')||'',through=params.get('through')||'',entry=params.get('entry')||'',category=params.get('category')||'',kind=params.get('kind')||'',basis=params.get('basis')||''
  const invalid=names.some(key=>params.has(key)&&!params.get(key))||(from&&!calendarDate(from))||(through&&!calendarDate(through))||(from&&through&&from>through)
    ||(entry&&!uuid(entry))||(category&&(category.length>120||/[\u0000-\u001f\u007f]/.test(category)))||(kind&&kind!=='refund')||(basis&&basis!=='spending')
  return invalid?{hasSource,invalid:true,from:'',through:'',entry:'',category:'',kind:'',basis:''}:{hasSource,invalid:false,from,through,entry,category,kind,basis}
}
export function spendingEvidenceRows(rows,currency) {
  return normalizeFinancialTransactions(rows,{currency}).rows.filter(row=>['expense','refund'].includes(row.type)&&(row.payment_status||'paid')==='paid'&&!row.is_excluded&&!row.is_excluded_from_spending)
}
export function evidenceReturnWeek(params,{spaceId,today}) {
  const week=readReviewContext(params,{spaceId,today}),filters=readEvidenceFilters(params)
  if(!week||filters.invalid||filters.from!==week||!filters.through||filters.through>weekRange(today,week).through)return null
  return week
}
