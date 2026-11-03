import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readReviewContext,reviewWeekOptions,validReviewWeek,weeklyEvidenceUrl,readEvidenceFilters,evidenceReturnWeek,reviewReturnUrl,reviewSnapshotFacts} from './reviewNavigation.js'
import {buildWeeklyFacts} from '../../../supabase/functions/ai-assistant/facts.js'
import {spendingEvidenceRows} from './reviewNavigation.js'
import {readSpaceTransactions} from '../transactions/transactionReader.js'
import {finishCommittedSave} from '../transactions/personalSaveLifecycle.js'
const today='2026-11-02',space='11111111-1111-4111-8111-111111111111',entry='22222222-2222-4222-8222-222222222222'
const facts={start:'2026-10-26',through:'2026-11-01',categories:[{category:'Food'}],largest:{id:entry}}
test('one validated Monday controls a complete, current or historical review',()=>{
  assert.equal(validReviewWeek('2026-10-26',today),'2026-10-26')
  for(const week of ['2026-11-03','2026-11-09','2026-02-30','2025-01-06','anything'])assert.equal(validReviewWeek(week,today),null)
  const options=reviewWeekOptions(today,'2026-01-05');assert.equal(options[0],today);assert.ok(options.includes('2026-01-05'))
})
test('a return link cannot open a review from a different space',()=>{
  const params=new URLSearchParams(reviewReturnUrl(facts.start,space).split('?')[1])
  assert.equal(readReviewContext(params,{spaceId:space,today}),facts.start)
  assert.equal(readReviewContext(params,{spaceId:entry,today}),null)
})
test('category, largest purchase and refund evidence carry the exact review period and return context',()=>{
  for(const [fact,key,value] of [['category:0','category','Food'],['largest','entry',entry],['refunds','kind','refund']]){
    const params=new URLSearchParams(weeklyEvidenceUrl(facts,fact,space).split('?')[1])
    assert.equal(params.get(key),value);assert.equal(params.get('from'),facts.start);assert.equal(params.get('through'),facts.through)
    assert.equal(evidenceReturnWeek(params,{spaceId:space,today}),facts.start)
  }
})
test('invalid evidence filters never silently present a false empty subset',()=>{
  for(const params of [{from:'bad'},{from:'2026-11-02',through:'2026-11-01'},{entry:'bad'},{category:'bad\ncategory'},{kind:'transfer'}]){
    const value=readEvidenceFilters(new URLSearchParams(params));assert.equal(value.invalid,true)
    assert.equal(value.from,'');assert.equal(value.entry,'');assert.equal(value.category,'');assert.equal(value.kind,'')
  }
  assert.equal(readEvidenceFilters(new URLSearchParams({entry})).entry,entry)
})
test('tampering with the evidence period disables a misleading return context',()=>{
  const params=new URLSearchParams(weeklyEvidenceUrl(facts,'week',space).split('?')[1])
  params.set('from','2026-10-19');assert.equal(evidenceReturnWeek(params,{spaceId:space,today}),null)
})
test('a weekly summary cannot render another week, language, user or space snapshot',()=>{
  const context={userId:entry,spaceId:space,language:'zh',weekStart:facts.start}
  const snapshot={...context,facts:buildWeeklyFacts([],today,'USD',facts.start)}
  assert.equal(reviewSnapshotFacts(snapshot,context).net,0)
  for(const patch of [{weekStart:today},{userId:space},{spaceId:entry},{language:'en'},{facts:{net:0}}])assert.equal(reviewSnapshotFacts({...snapshot,...patch},context),null)
})
test('a committed save refresh failure is recoverable without another financial write',async()=>{
  let writes=1,refreshes=0,closed=0
  assert.equal(await finishCommittedSave({refresh:async()=>{refreshes++;throw Error('offline')},close:()=>closed++}),false)
  assert.equal(closed,0);assert.equal(writes,1)
  assert.equal(await finishCommittedSave({refresh:async()=>{refreshes++},close:()=>closed++}),true)
  assert.equal(refreshes,2);assert.equal(closed,1);assert.equal(writes,1)
})
test('a late refresh result cannot close a newer form or another space',async()=>{
  let closed=0
  assert.equal(await finishCommittedSave({refresh:async()=>{},close:()=>closed++,isCurrent:()=>false}),false)
  assert.equal(closed,0)
})
test('a refresh that never returns is bounded after the transaction is already committed',async()=>{
  let closed=0
  assert.equal(await finishCommittedSave({refresh:()=>new Promise(()=>{}),close:()=>closed++,timeoutMs:1}),false)
  assert.equal(closed,0)
})
test('review evidence uses the same paid spending and refund categories as the weekly facts',()=>{
  const row=(id,type,extra={})=>({id,type,amount:10,currency:'USD',transaction_date:'2026-11-01',category:'Food',...extra})
  const data=[row(entry,'expense'),row('refund','refund',{parent_transaction_id:entry,category:'Other'}),row('income','income'),row('upcoming','expense',{payment_status:'upcoming'}),row('transfer','transfer_out'),row('excluded','expense',{is_excluded:true})]
  const selected=spendingEvidenceRows(data,'USD');assert.deepEqual(selected.map(x=>x.id),[entry,'refund']);assert.equal(selected[1].category,'Food')
})
test('transaction reads include later pages and fail closed instead of returning a truncated ledger',async()=>{
  const data=[{id:'a'},{id:'b'},{id:'c'}],ranges=[]
  const client={from(){const q={select(){return q},eq(){return q},order(){return q},async range(from,to){ranges.push([from,to]);return {data:data.slice(from,to+1),error:null}}};return q}}
  assert.equal((await readSpaceTransactions(client,space,{pageSize:2,maxRows:4})).data.length,3);assert.deepEqual(ranges,[[0,1],[2,3]])
  assert.equal((await readSpaceTransactions(client,space,{pageSize:2,maxRows:2})).data,null)
  const failure={from(){const q={select(){return q},eq(){return q},order(){return q},async range(from){return from?{data:null,error:{message:'offline'}}:{data:data.slice(0,2),error:null}}};return q}}
  const result=await readSpaceTransactions(failure,space,{pageSize:2,maxRows:4});assert.equal(result.data,null);assert.equal(result.error.message,'offline')
})
