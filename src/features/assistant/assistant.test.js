import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moneyUnits, validateReceipt, receiptFromSummary, inspectJpeg, stripJpegMetadata, reportOptions, validateReport } from '../../../supabase/functions/ai-assistant/contract.js'
import { buildWeeklyFacts, weekRange, validWeeklyFacts } from '../../../supabase/functions/ai-assistant/facts.js'
import { reconcileReceipt, receiptCanConfirm } from './receiptReconciliation.js'
import { createAssistantHandler } from '../../../supabase/functions/ai-assistant/handler.js'
import { receiptPayload, mergeReceiptDetails } from './receiptDraft.js'
import { requestAssistant } from './assistantService.js'
import { summarizeFinancialTransactions } from '../financial/transactionSemantics.js'
import { assistantLocales } from '../../i18n/assistantLocales.js'
import { reserveAssistantQuota } from '../../../supabase/functions/ai-assistant/quota.js'
import { weeklyFingerprintInput, selectWeeklyReports } from '../../../supabase/functions/ai-assistant/cache.js'
const receipt = () => ({ merchant: 'Synthetic shop', date: '2026-11-01', currency: 'USD', total: '10.35', items: [{ name: 'Tea', quantity: 1, amount: '10.00' }], tax: '.35', tip: null, discount: null, uncertain: [] })
const goodReceipt = () => ({ ...receipt(), tax: '0.35' })
const row = (id, type, amount, date = '2026-10-30', extra = {}) => ({ id, type, amount, currency: 'USD', base_currency: 'USD', base_amount: amount, transaction_date: date, category: 'Food', payment_status: 'paid', ...extra })
test('exact four-decimal receipt money refuses coercion, exponent, overflow and NaN', () => {
  assert.equal(moneyUnits('0.0001'), 1n); assert.equal(moneyUnits('-5.25', true), -52500n)
  for (const value of [0, '', '.5', '1e3', 'NaN', '-1', '2.00001', '10000000000', null]) assert.equal(moneyUnits(value), null)
})
test('receipt output preserves uncertainty and refuses extra fields, guessed missing amounts and overlong lines', () => {
  assert.equal(validateReceipt(goodReceipt()), true); assert.equal(validateReceipt(receipt()), false)
  assert.equal(validateReceipt({ ...goodReceipt(), tool: 'save' }), false)
  assert.equal(validateReceipt({ ...goodReceipt(), items: Array(61).fill(goodReceipt().items[0]) }), false)
  assert.equal(validateReceipt({ ...goodReceipt(), total: null, date: null, currency: null, uncertain: ['total', 'currency'] }), true)
  assert.equal(validateReceipt({ ...goodReceipt(), date: '2026-02-30' }), false)
})
test('receipt reconciliation does not double count line discounts or mask a difference', () => {
  const draft = {...goodReceipt(), tip:'0',discount:'0'}
  assert.equal(reconcileReceipt(draft).difference, 0n)
  assert.equal(reconcileReceipt({ ...draft, discount: '1' }).difference, -10000n)
  assert.equal(reconcileReceipt({ ...draft, items: [{ name: 'Unreadable', amount: null }] }).difference, null)
})
test('receipt payload needs explicit review and drops image data, duplicate records and arbitrary keys', () => {
  const form = { amount: '10.35', date: '2026-11-01', currency: 'USD', description: 'Tea' }
  const draft = { ...goodReceipt(), adjustment_modes: {tip:'not_applicable',discount:'not_applicable'}, image_hash: 'a'.repeat(64), model: 'test', preview: 'private', duplicates: ['id'] }
  assert.throws(() => receiptPayload(draft, form))
  const result = receiptPayload({ ...draft, reviewed: true }, form)
  assert.equal(result.total, '10.35'); assert.equal(result.preview, undefined); assert.equal(result.duplicates, undefined)
  assert.throws(() => receiptPayload({ ...draft, reviewed: true }, { ...form, date: 'bad' }))
})
function fakeJpeg(width = 100, height = 200, metadata = false) {
  const bytes = [255,216, ...(metadata ? [255,225,0,4,1,2] : []), 255,192,0,8,8,height >> 8,height & 255,width >> 8,width & 255,3,255,218,0,2,0,0,255,217]
  return Buffer.from(bytes).toString('base64')
}
test('image boundary rejects remote URLs, EXIF, invalid headers and pixel bombs', () => {
  assert.equal(inspectJpeg(fakeJpeg()).width, 100)
  for (const data of ['https://evil/image', 'not an image', fakeJpeg(3000, 100), fakeJpeg(2000, 2000), fakeJpeg(100, 100, true), 'A'.repeat(1400004)]) assert.equal(inspectJpeg(data), null)
})
test('canvas ICC and source EXIF are removed without dropping the JPEG image scan',()=>{
  const original=Buffer.from(fakeJpeg(100,100,true),'base64'),clean=stripJpegMetadata(original)
  assert.equal(inspectJpeg(Buffer.from(clean).toString('base64')).width,100)
  assert.deepEqual([...clean.slice(-6)],[0,2,0,0,255,217])
})
test('Monday based week boundaries do not depend on the server time zone', () => {
  assert.deepEqual(weekRange('2026-11-01'), { start: '2026-10-26', end: '2026-11-01', historyStart: '2026-09-28', through: '2026-11-01', comparisonDays:7, complete:false })
  assert.equal(weekRange('2027-01-01').start, '2026-12-28'); assert.throws(() => weekRange('2026-02-30'))
})
test('weekly facts agree with the financial engine for paid expenses, received refunds, upcoming and transfers', () => {
  const rows = [row('a', 'expense', 80), row('b', 'refund', 20, '2026-10-31', { parent_transaction_id: 'a' }), row('c', 'income', 400), row('d', 'transfer', 90), row('e', 'credit_card_payment', 40), row('f', 'expense', 50, '2026-10-30', { payment_status: 'upcoming' })]
  const facts = buildWeeklyFacts(rows, '2026-11-01', 'USD')
  assert.equal(facts.net, summarizeFinancialTransactions(rows, { currency: 'USD' }).expenses)
  assert.equal(facts.net, 60); assert.equal(facts.count, 1); assert.equal(facts.refunds, 20)
})
test('unknown cross-currency values stay excluded, not converted to zero; empty weeks not a zero baseline', () => {
  const facts = buildWeeklyFacts([row('a', 'expense', 10, '2026-10-05'), row('b', 'expense', 40, '2026-10-30', { currency: 'CAD', base_amount: null }), row('c', 'expense', 10, '2026-10-19')], '2026-11-01', 'USD')
  assert.equal(facts.excluded, 1); assert.equal(facts.average, 10); assert.equal(facts.baselineWeeks, 2)
  assert.equal(buildWeeklyFacts([], '2026-11-01', 'USD').average, null)
})
test('refunds use receipt date across weeks and duplicate IDs count only once', () => {
  const rows = [row('old','expense',100,'2026-10-20'), row('refund','refund',30), row('refund','refund',30)]
  const facts = buildWeeklyFacts(rows, '2026-11-01', 'USD'); assert.equal(facts.net,-30); assert.equal(facts.average,100); assert.equal(facts.count,0)
})
test('AI report only chooses verified observations and one small action; unknown claims cannot be rendered', () => {
  const facts = buildWeeklyFacts([], '2026-11-01', 'USD')
  assert.equal(validateReport({ observations: [], action: null }, facts), true)
  for (const output of [{ observations:['comparison'], action:'track' }, { observations:['scope','scope'],action:'track' }, { observations:['scope'], action:'invest' }, { observations:['scope'],action:'track', summary:'you saved 999' }]) assert.equal(validateReport(output,facts),false)
  assert.deepEqual(reportOptions(facts), {observations:[],actions:[]})
})
test('all five locales have identical keys and interpolation placeholders', () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const language of ['zh','ja','ko','es']) for (const [key,value] of Object.entries(assistantLocales.en)) {
    assert.ok(assistantLocales[language][key]); assert.deepEqual(placeholders(assistantLocales[language][key]),placeholders(value),`${language}:${key}`)
  }
})

test('unread adjustments remain unknown even if known lines happen to match the total', () => {
  const draft = {...goodReceipt(), total:'10',tax:null}
  assert.equal(reconcileReceipt(draft).status,'unverifiable')
  assert.equal(receiptCanConfirm({...draft,reviewed:true}),false)
  assert.equal(reconcileReceipt({...draft,adjustment_modes:{tax:'not_applicable',tip:'not_applicable',discount:'not_applicable'}}).status,'balanced')
})
test('included tax is not charged twice and explicit additional tax is counted once', () => {
  const draft={...goodReceipt(),total:'10',adjustment_modes:{tax:'included',tip:'not_applicable',discount:'not_applicable'}}
  assert.equal(reconcileReceipt(draft).difference,0n)
  assert.equal(reconcileReceipt({...draft,adjustment_modes:{...draft.adjustment_modes,tax:'additional'}}).difference,3500n)
})
test('manual exceptions require acknowledgement plus a bounded reason and keep the unresolved values', () => {
  const form={amount:'10.35',currency:'USD',date:'2026-11-01',description:'Synthetic shop'}
  const draft={...goodReceipt(),image_hash:'b'.repeat(64),reviewed:true}
  for(const patch of [{},{review_reason:'Unreadable line'},{exception_confirmed:true},{exception_confirmed:true,review_reason:'x'},{exception_confirmed:true,review_reason:'x'.repeat(241)}]) assert.throws(()=>receiptPayload({...draft,...patch},form))
  const saved=receiptPayload({...draft,exception_confirmed:true,review_reason:'Unprinted adjustments cannot be verified'},form)
  assert.equal(saved.review_mode,'manual_exception');assert.equal(saved.tip,null);assert.equal(saved.discount,null)
  assert.equal(saved.adjustment_modes.tip,'unknown');assert.equal(saved.exception_confirmed,undefined)
})
test('invalid fields cannot be bypassed with a manual exception', () => {
  for (const patch of [{items:[{name:'',quantity:1,amount:'10'}]},{items:[{name:'Tea',quantity:'0',amount:'10'}]},{items:[{name:'Tea',quantity:1,amount:'1e2'}]},{tax:'NaN'}]) {
    const draft={...goodReceipt(),...patch,exception_confirmed:true,review_reason:'Checked manually'}
    assert.equal(reconcileReceipt(draft).status,'invalid');assert.equal(receiptCanConfirm(draft),false)
  }
})
test('partial weeks compare the same weekdays, including across year boundaries', () => {
  const rows=[row('now','expense',20,'2027-01-04'),row('last-mon','expense',30,'2026-12-28'),row('last-fri','expense',999,'2027-01-01'),row('old-mon','expense',10,'2026-12-21')]
  const facts=buildWeeklyFacts(rows,'2027-01-04','USD')
  assert.equal(facts.comparisonDays,1);assert.equal(facts.average,20);assert.equal(facts.history[0].through,'2026-12-28');assert.equal(facts.comparable,true)
})
test('selected completed weeks exclude later entries and reject non-Monday, future and excessive history', () => {
  const facts=buildWeeklyFacts([row('old','expense',10,'2026-10-20'),row('later','expense',99,'2026-11-01')],'2026-11-01','USD','2026-10-19')
  assert.equal(facts.net,10);assert.equal(facts.through,'2026-10-25');assert.equal(facts.complete,true);assert.equal(facts.comparisonDays,7)
  for(const start of ['2026-10-20','2026-11-02','2024-10-21']) assert.throws(()=>weekRange('2026-11-01',start))
})
test('refund categories use the original expense outside the reporting window, without counting it again', () => {
  const rows=[row('parent','expense',100,'2026-08-01',{category:'Shopping'}),row('refund','refund',20,'2026-10-30',{parent_transaction_id:'parent',category:'Other'})]
  const facts=buildWeeklyFacts(rows,'2026-11-01','USD')
  assert.equal(facts.net,-20);assert.equal(facts.gross,0);assert.deepEqual(facts.categories,[{category:'Shopping',amount:-20}])
})
test('failed conversion and excluded rows never enter weekly money or misleading comparison claims', () => {
  const rows=[row('a','expense',20,'2026-10-30'),row('bad','expense',999,'2026-10-30',{conversion_status:'failed'}),row('hidden','expense',200,'2026-10-30',{is_excluded:true}),row('b','expense',10,'2026-10-20'),row('c','expense',10,'2026-10-13')]
  const facts=buildWeeklyFacts(rows,'2026-11-01','USD')
  assert.equal(facts.net,20);assert.equal(facts.excluded,1);assert.equal(facts.comparable,false)
  assert.equal(facts.net,summarizeFinancialTransactions(rows,{currency:'USD',month:'2026-10',throughDate:'2026-11-01'}).rows.filter(row=>row.transaction_date>='2026-10-26').reduce((sum,row)=>sum+row.spendingAmount,0))
  assert.ok(!reportOptions(facts).observations.some(item=>item.id==='comparison'))
})
test('snapshot validation rejects old and malformed saved JSON before source links can render', () => {
  const facts=buildWeeklyFacts([row('a','expense',80)],'2026-11-01','USD');assert.equal(validWeeklyFacts(facts),true)
  for(const patch of [{version:1},{categories:null},{history:[null]},{net:NaN},{through:'2026-11-03'},{largest:{id:'a'}},{start:'2026-02-30'}]) assert.equal(validWeeklyFacts({...facts,...patch}),false)
})
test('review output permits a quiet empty result and never more than two observations', () => {
  const facts=buildWeeklyFacts([row('a','expense',80),row('b','refund',10)],'2026-11-01','USD')
  assert.equal(validateReport({observations:[],action:null},facts),true)
  assert.equal(validateReport({observations:['large','refunds'],action:'track'},facts),true)
  assert.equal(validateReport({observations:['large','refunds','scope'],action:'track'},facts),false)
  assert.equal(validateReport({observations:[],action:'track'},facts),false)
})
test('weekly cache invalidates on edits, deletes and refunds but not row order or later visits to a completed week', () => {
  const rows=[row('a','expense',80,'2026-10-20'),row('b','expense',10,'2026-10-21')]
  const key=(rows,today='2026-11-01')=>JSON.stringify(weeklyFingerprintInput(rows,buildWeeklyFacts(rows,today,'USD','2026-10-19'),{language:'en'}))
  const original=key(rows)
  assert.equal(key([...rows].reverse()),original);assert.equal(key(rows,'2026-11-02'),original)
  for(const next of [[{...rows[0],amount:90,base_amount:90},rows[1]],[rows[0]],[...rows,row('refund','refund',10,'2026-10-24',{parent_transaction_id:'a'})]])assert.notEqual(key(next),original)
})
test('stale reports keep their own facts, and corrupted or different-week snapshots cannot become current', () => {
  const facts=buildWeeklyFacts([row('a','expense',80,'2026-10-20')],'2026-11-01','USD','2026-10-19')
  const snapshot={id:'old',facts,goal:'understand',facts_hash:'old',output:{observations:['large'],action:'track'}}
  const fresh=buildWeeklyFacts([row('a','expense',90,'2026-10-20')],'2026-11-01','USD','2026-10-19')
  const result=selectWeeklyReports([snapshot],fresh,'new')
  assert.equal(result.report,null);assert.equal(result.previousReport.facts.net,80);assert.equal(fresh.net,90)
  assert.equal(selectWeeklyReports([{...snapshot,facts:{...facts,categories:null},facts_hash:'new'}],fresh,'new').report,null)
  assert.equal(selectWeeklyReports([snapshot],buildWeeklyFacts([],'2026-11-01','USD'),'old').report,null)
})
const today = () => new Date().toISOString().slice(0,10)
const config = { AI_PARSER_ENABLED:'true',AI_FREE_QUOTA_CONFIRMED:'true',AI_RECEIPT_ENABLED:'true',AI_WEEKLY_ENABLED:'true',DASHSCOPE_API_KEY:'test-only',AI_PARSER_MODEL:'qwen3.8-flash',BAILIAN_BASE_URL:'https://dashscope.aliyuncs.com/compatible-mode/v1' }
function setup(overrides = {}) {
  const calls = { provider:0, quota:0, writes:0, body:null }
  const facts = buildWeeklyFacts([row('internal-id','expense',75,today())],today(),'USD')
  const handler = createAssistantHandler({ env:key=>config[key],authenticate:async()=>({user:{id:'owner'}}),reserveQuota:async()=>{calls.quota++;return true},loadWeekly:async()=>({facts,hash:'a'.repeat(64),report:null,stale:false}),findDuplicates:async()=>[],saveWeekly:async()=>{calls.writes++;return {id:'saved'}},fetchImpl:async(_url,options)=>{calls.provider++;calls.body=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({observations:['large'],action:'track'})}}]}))},...overrides })
  const request = (body = {}, headers = {Authorization:'Bearer test'}) => handler(new Request('https://local/test',{method:'POST',headers,body:JSON.stringify({version:1,weeklyVersion:2,task:'weekly',spaceId:'11111111-1111-4111-8111-111111111111',language:'en',today:today(),consent:true,...body})}))
  return {calls,request}
}
test('authentication, task consent, scope and date guards run before provider calls', async () => {
  const {calls,request}=setup()
  assert.equal((await request({},{})).status,401)
  assert.equal((await request({consent:false})).status,400)
  assert.equal((await request({spaceId:'other'})).status,400)
  assert.equal((await request({today:'2000-01-01'})).status,400)
  assert.equal(calls.provider,0);assert.equal(calls.quota,0)
})
test('weekly read and matching cache never reserve model quota', async () => {
  const {calls,request}=setup(); assert.equal((await request({task:'weekly_read',consent:false})).status,200);assert.equal(calls.provider,0);assert.equal(calls.quota,0)
})
test('quiet weeks and obsolete weekly clients never consume provider quota or write a report', async () => {
  const facts=buildWeeklyFacts([],today(),'USD')
  const {calls,request}=setup({loadWeekly:async()=>({facts,report:null,stale:false})})
  assert.equal((await request({weeklyVersion:1})).status,409)
  const response=await request();assert.equal(response.status,200);assert.equal((await response.json()).quiet,true)
  assert.equal(calls.provider,0);assert.equal(calls.quota,0);assert.equal(calls.writes,0)
})
test('independent flags and failed reservation close the gate', async () => {
  let system=setup({env:key=>key==='AI_RECEIPT_ENABLED'?undefined:config[key]})
  assert.equal((await system.request({task:'receipt',image:fakeJpeg(),imageHash:'a'.repeat(64)})).status,503);assert.equal(system.calls.provider,0)
  system=setup({reserveQuota:async()=>false});assert.equal((await system.request()).status,429);assert.equal(system.calls.provider,0)
})
test('provider receives only aggregated facts, no internal transaction identifiers; report saved once', async () => {
  const {calls,request}=setup(); assert.equal((await request()).status,200)
  assert.equal(calls.provider,1);assert.equal(calls.quota,1);assert.equal(calls.writes,1)
  assert.equal(JSON.stringify(calls.body).includes('internal-id'),false)
  assert.equal(calls.body.max_tokens,200)
})
test('unsupported model claims or truncated completions are rejected without saving', async () => {
  const {calls,request}=setup({fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"observations":["made_up"],"action":"track"}'}}]}))})
  assert.equal((await request()).status,502);assert.equal(calls.writes,0)
})
test('free quota stop returns sanitized failure, no retry or paid fallback', async () => {
  let calls=0;const {request}=setup({fetchImpl:async()=>{calls++;return new Response('private provider details',{status:403})}})
  const result=await request();assert.equal(result.status,503);assert.equal((await result.json()).code,'FREE_QUOTA_STOPPED');assert.equal(calls,1)
})
test('oversized bodies are rejected before provider/quota even without Content-Length', async () => {
  const {request,calls}=setup();assert.equal((await request({padding:'x'.repeat(1450001)})).status,413);assert.equal(calls.provider,0);assert.equal(calls.quota,0)
})
test('per-task quotas reuse the global reservation, reject caps and fail closed on compare-and-set races', async () => {
  for (const scenario of ['new','update','cap','race','readError','globalDenied']) {
    let reservations=0, writes=0, operation='read'
    const used=scenario==='new'?null:{requests:scenario==='cap'?4:2}
    const client={rpc:async()=>{reservations++;return {data:scenario!=='globalDenied',error:null}},from:()=>{
      const chain={select:()=>chain,eq:()=>chain,update:()=>{operation='write';writes++;return chain},insert:()=>{operation='write';writes++;return chain},single:async()=>({data:{requests:1},error:null}),maybeSingle:async()=>operation==='read'?{data:used,error:scenario==='readError'?{}:null}:{data:scenario==='race'?null:{requests:3},error:null}}
      return chain
    }}
    assert.equal(await reserveAssistantQuota(client,'owner','scope','receipt','2026-11-01'),['new','update'].includes(scenario),scenario)
    assert.equal(reservations,1)
    if(['cap','readError','globalDenied'].includes(scenario))assert.equal(writes,0)
  }
})
test('synthetic weekly mode is gated and never loads or saves ledger data', async () => {
  let reads=0,writes=0
  let system=setup({loadWeekly:async()=>{reads++},saveWeekly:async()=>{writes++}})
  assert.equal((await system.request({task:'weekly_sample'})).status,503)
  system=setup({env:key=>key==='AI_EVALUATION_ENABLED'?'true':config[key],loadWeekly:async()=>{reads++},saveWeekly:async()=>{writes++}})
  const result=await (await system.request({task:'weekly_sample'})).json()
  assert.equal(result.synthetic,true);assert.equal(result.facts.net,85);assert.equal(reads,0);assert.equal(writes,0)
})
test('receipt success returns review data and independently computed hash, never a financial write', async () => {
  const {request,calls}=setup({fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(goodReceipt())}}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}}))})
  const result=await (await request({task:'receipt',image:fakeJpeg(),imageHash:'0'.repeat(64)})).json()
  assert.equal(result.receipt.total,'10.35');assert.notEqual(result.imageHash,'0'.repeat(64));assert.equal(result.usage.total_tokens,140);assert.equal(calls.writes,0)
})

const summaryOutput=()=>({merchant:'Synthetic shop',date:'2026-11-02',currency:'USD',total:'12.80',uncertain:[]})
test('total-first extraction validates a smaller independent contract without itemization',()=>{
  const receipt=receiptFromSummary(summaryOutput())
  assert.equal(receipt.total,'12.80');assert.deepEqual(receipt.items,[]);assert.equal(receipt.tax,null)
  for(const patch of [{total:'1e3'},{total:'0'},{currency:'US$'},{date:'2026-02-30'},{items:[]},{uncertain:['items']}])assert.equal(receiptFromSummary({...summaryOutput(),...patch}),null)
  assert.ok(receiptFromSummary({...summaryOutput(),total:null,currency:null,uncertain:['total','currency']}))
})
test('summary API uses400output tokens and the existing receipt quota without writing transactions',async()=>{
  let quotaTask
  const {calls,request}=setup({reserveQuota:async(_user,_space,task)=>{quotaTask=task;return true},fetchImpl:async(_url,options)=>{calls.body=JSON.parse(options.body);calls.provider++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(summaryOutput())}}]}))}})
  const result=await (await request({task:'receipt_summary',image:fakeJpeg(),imageHash:'a'.repeat(64)})).json()
  assert.equal(result.receiptMode,'summary');assert.equal(result.receipt.total,'12.80');assert.deepEqual(result.receipt.items,[])
  assert.equal(calls.body.max_tokens,400);assert.equal(calls.body.enable_thinking,false);assert.equal(quotaTask,'receipt');assert.equal(calls.writes,0);assert.ok(!result.receipt.uncertain.includes('items'))
})
test('summary uncertainty stays null rather than blocking every field or inventing a total',async()=>{
  const {request}=setup({fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...summaryOutput(),total:null,currency:null,uncertain:[]})}}]}))})
  const result=await(await request({task:'receipt_summary',image:fakeJpeg(),imageHash:'a'.repeat(64)})).json()
  assert.equal(result.receipt.total,null);assert.equal(result.receipt.currency,null);assert.deepEqual(result.receipt.uncertain.sort(),['currency','total'])
})
test('summary rejects truncated, nonreceipt or extra-field model output without a financial write',async()=>{
  for(const [output,finish,status] of [[{...summaryOutput(),items:[]},'stop',502],[summaryOutput(),'length',502],[{...summaryOutput(),uncertain:['not_receipt']},'stop',422]]){
    const {request,calls}=setup({fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content:JSON.stringify(output)}}]}))})
    assert.equal((await request({task:'receipt_summary',image:fakeJpeg(),imageHash:'a'.repeat(64)})).status,status);assert.equal(calls.writes,0)
  }
})
test('summary save requires the final user confirmation and never claims item reconciliation',()=>{
  const draft={...receiptFromSummary(summaryOutput()),capture_mode:'summary',image_hash:'b'.repeat(64)}
  const form={amount:'12.80',currency:'USD',date:'2026-11-02',description:'Synthetic shop'}
  assert.throws(()=>receiptPayload(draft,form))
  const saved=receiptPayload({...draft,reviewed:true},form)
  assert.equal(saved.review_mode,'summary');assert.deepEqual(saved.items,[]);assert.equal(saved.tax,null);assert.equal(saved.review_reason,null)
  for(const patch of [{amount:'0'},{currency:'UNKNOWN'},{date:'bad'}])assert.throws(()=>receiptPayload({...draft,reviewed:true},{...form,...patch}))
})
test('optional details preserve reviewed summary fields and reset itemization confirmation',()=>{
  const original={...receiptFromSummary(summaryOutput()),capture_mode:'summary',reviewed:true,exception_confirmed:true}
  const merged=mergeReceiptDetails(original,{...goodReceipt(),date:'2020-01-01',currency:'JPY',total:'999'})
  assert.equal(merged.total,'12.80');assert.equal(merged.currency,'USD');assert.equal(merged.date,'2026-11-02');assert.equal(merged.capture_mode,'details');assert.equal(merged.reviewed,false);assert.equal(merged.exception_confirmed,false)
})
test('summary audit distinguishes recognized totals from amounts the user fills or changes',()=>{
  const draft={...receiptFromSummary(summaryOutput()),capture_mode:'summary',image_hash:'b'.repeat(64),reviewed:true}
  const form={amount:'12.80',currency:'USD',date:'2026-11-02',description:'Synthetic'}
  assert.equal(receiptPayload(draft,form).amount_source,'recognition')
  assert.equal(receiptPayload(draft,{...form,amount:'13.00'}).amount_source,'user')
  assert.equal(receiptPayload({...draft,total:null},form).amount_source,'user')
})

test('summary save ignores unfinished optional lines without mutating the retained detail draft',()=>{
  const draft={...receiptFromSummary(summaryOutput()),capture_mode:'summary',image_hash:'b'.repeat(64),reviewed:true,
    items:[{name:'',quantity:'invalid',amount:'not money'}],tax:'unfinished',tip:'bad',discount:'invalid'}
  const form={amount:'12.80',currency:'USD',date:'2026-11-02',description:'Synthetic'}
  const before=structuredClone(draft),saved=receiptPayload(draft,form)
  assert.deepEqual(saved.items,[]);assert.equal(saved.tax,null);assert.equal(saved.tip,null);assert.equal(saved.discount,null)
  assert.deepEqual(draft,before)
  assert.throws(()=>receiptPayload({...draft,capture_mode:'details'},form))
})

test('a manually supplied summary amount keeps its source after save, reopen and unrelated edits',()=>{
  const form={amount:'12.80',currency:'USD',date:'2026-11-02',description:'Synthetic'}
  const draft={...receiptFromSummary({...summaryOutput(),total:null}),capture_mode:'summary',image_hash:'b'.repeat(64),reviewed:true}
  const saved=receiptPayload(draft,form),reopened=JSON.parse(JSON.stringify(saved))
  assert.equal(saved.amount_source,'user')
  assert.equal(receiptPayload(reopened,{...form,description:'Corrected merchant'}).amount_source,'user')
  assert.equal(receiptPayload(reopened,{...form,amount:'13.00'}).amount_source,'user')
  const recognized=receiptPayload({...draft,total:'12.80'},form)
  assert.equal(receiptPayload(JSON.parse(JSON.stringify(recognized)),form).amount_source,'recognition')
})
test('total-first client has a shorter bound and preserves cancellation of late results',async()=>{
  const originalTimer=globalThis.setTimeout,delays=[]
  globalThis.setTimeout=(_callback,delay)=>{delays.push(delay);return 0}
  try{await requestAssistant(async()=>({data:{version:1}}),{task:'receipt_summary'});await requestAssistant(async()=>({data:{version:1}}),{task:'receipt'})}finally{globalThis.setTimeout=originalTimer}
  assert.deepEqual(delays,[16000,32000])
  const controller=new AbortController();let resolve
  const pending=requestAssistant(()=>new Promise(done=>{resolve=done}),{task:'receipt_summary'},controller.signal)
  controller.abort();resolve({data:{version:1,receipt:receiptFromSummary(summaryOutput())}})
  assert.equal((await pending).ok,false)
})
