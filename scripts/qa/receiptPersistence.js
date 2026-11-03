import { createPersonalEntry, updatePersonalEntry } from '../../src/features/transactions/personalTransactionRepository.js'
import { receiptPayload } from '../../src/features/assistant/receiptDraft.js'

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
const must = (condition,message) => {if(!condition)throw new Error(message)}
const check = result => {if(result.error)throw new Error(result.error.message||result.error.code);return result.data}
export function validateReceiptQaConfig(config) {
  must(config.version===1&&uuid(config.userId)&&uuid(config.spaceId),'QA identity has not been approved')
  must(/^__receipt_e2e_[a-z0-9_]+__$/.test(config.prefix),'Invalid QA prefix')
  must(config.accountIds?.length===2&&config.transactionIds?.length===5,'Unexpected fixture count')
  const ids=[...config.accountIds,...config.transactionIds]
  must(ids.every(uuid)&&new Set(ids).size===ids.length,'Invalid or repeated fixture UUID')
  must(!config.forbiddenUserIds?.includes(config.userId),'Real personal identity is blocked')
}

// Explicitly opt-in QA only. No service key, DDL, model calls or real-account writes.
export function createReceiptPersistenceQa(client,config) {
  validateReceiptQaConfig(config)
  const accounts=()=>client.from('financial_accounts').select('*').eq('user_id',config.userId).eq('space_id',config.spaceId).in('id',config.accountIds)
  const transactions=()=>client.from('transactions').select('*').eq('created_by',config.userId).eq('space_id',config.spaceId).in('id',config.transactionIds)
  async function guard(){
    const {data,error}=await client.auth.getUser()
    must(!error&&data.user?.id===config.userId,'QA session changed; writes blocked')
    const space=check(await client.from('spaces').select('id,currency').eq('id',config.spaceId).eq('created_by',config.userId).eq('type','personal').single())
    must(space?.currency==='USD','This QA run requires a USD test space; no space settings will be changed')
  }
  function safeEntry(row){
    must(config.transactionIds.includes(row.id)&&row.created_by===config.userId&&row.space_id===config.spaceId,'Unregistered transaction scope')
    must(row.type==='expense'&&row.currency==='USD'&&Number(row.amount)>0&&Number(row.amount)<=1000,'Unexpected synthetic transaction')
    must(row.description?.startsWith(config.prefix)&&(!row.financial_account_id||config.accountIds.includes(row.financial_account_id)),'Non-fixture transaction/account blocked')
    must(row.receipt_data?.image_hash==='c'.repeat(64)&&row.receipt_data?.model==='synthetic-e2e-no-model','Unexpected receipt source')
  }
  async function read(){
    await guard();const a=check(await accounts()),t=check(await transactions())
    must(a.every(row=>row.name.startsWith(config.prefix))&&t.every(row=>row.description?.startsWith(config.prefix)),'Fixture identity mismatch')
    return {accounts:a,transactions:t}
  }
  async function seed(){
    // Authenticated account inserts intentionally cannot supply an id. Preserve
    // those grants: fixed-ID fixtures are provisioned by the separately approved
    // setup SQL, never by expanding frontend privileges.
    const state=await read()
    must(state.accounts.length===2&&state.transactions.length===0,'Approved fixture setup is absent or this run has already started')
    must(state.accounts.every(row=>row.currency==='USD'&&Number(row.balance)===(row.id===config.accountIds[0]?100:60)),'Fixture opening balances differ')
    return state
  }
  function receipt(amount){return receiptPayload({merchant:config.prefix+' Direct',date:'2026-11-01',currency:'USD',total:String(amount),items:[],tax:null,tip:null,discount:null,
    uncertain:[],capture_mode:'summary',reviewed:true,image_hash:'c'.repeat(64),model:'synthetic-e2e-no-model'},
    {amount:String(amount),currency:'USD',date:'2026-11-01',description:config.prefix+' Direct'})}
  function directRow(index,amount=5){return {id:config.transactionIds[index],created_by:config.userId,space_id:config.spaceId,paid_by:config.userId,type:'expense',amount,
    currency:'USD',description:config.prefix+' Direct',category:'Other',transaction_date:'2026-11-01',split_type:'none',payment_status:'paid',
    base_amount:amount,base_currency:'USD',exchange_rate:1,exchange_rate_date:'2026-11-01',conversion_status:'converted',
    financial_account_id:config.accountIds[0],account_exchange_rate:1,account_rate_date:'2026-11-01',receipt_data:receipt(amount)}}
  function writes(index){return {
    async create(payload){await guard();const row={...payload,id:config.transactionIds[index]};safeEntry(row);return createPersonalEntry(client,row)},
    async update(input){
      await guard();const old=check(await transactions().eq('id',input.transactionId).single())
      must(input.spaceId===config.spaceId&&config.transactionIds.includes(input.transactionId),'Unregistered update')
      safeEntry({...old,...input.changes});return updatePersonalEntry(client,input)
    }
  }}
  async function regressions(){
    const before=await read();must(before.accounts.length===2&&!before.transactions.some(row=>row.id===config.transactionIds[2]),'Direct test already run or fixtures absent')
    const baseline=Number(before.accounts.find(row=>row.id===config.accountIds[0]).balance),row=directRow(2)
    safeEntry(row)
    // Actual authenticated insert; only its successful response is hidden, not its write.
    const lostClient={from(table){const original=client.from(table);return {
      async insert(value){const result=await original.insert(value);return result.error?result:{data:null,error:{message:'Synthetic lost successful response'}}},
      select(...args){return original.select(...args)}
    }}}
    const results=await Promise.all([createPersonalEntry(lostClient,row),createPersonalEntry(client,row)])
    must(results.every(result=>!result.error),'Identical retries did not recover')
    let after=await read();must(after.transactions.filter(value=>value.id===row.id).length===1,'Duplicate operation persisted')
    must(Number(after.accounts.find(value=>value.id===config.accountIds[0]).balance)===baseline-5,'Retry deducted more than once')
    const checks=['concurrent/recovered response: one transaction and one deduction']
    const stale=await updatePersonalEntry(client,{transactionId:row.id,spaceId:config.spaceId,expectedUpdatedAt:'1900-01-01T00:00:00Z',changes:{amount:6}})
    must(stale.error?.code==='PGRST116','Stale update was not rejected');checks.push('stale edit rejected')
    const invalid=directRow(3);invalid.receipt_data.total='999'
    const invalidResult=await client.from('transactions').insert(invalid)
    must(invalidResult.error?.message?.includes('RECEIPT_INVALID'),'Mismatched receipt was not rejected');checks.push('invalid receipt rejected')
    const insufficient=directRow(4,1000),insufficientResult=await client.from('transactions').insert(insufficient)
    must(insufficientResult.error?.message?.includes('ACCOUNT_INSUFFICIENT'),'Insufficient balance was not rejected');checks.push('insufficient balance rejected')
    after=await read();must(!after.transactions.some(value=>config.transactionIds.slice(3).includes(value.id)),'Failed write persisted')
    must(Number(after.accounts.find(value=>value.id===config.accountIds[0]).balance)===baseline-5,'Rejected write moved funds')
    return {checks,state:after}
  }
  async function cleanup(){
    const before=await read()
    const linked=check(await client.from('transactions').select('id').eq('space_id',config.spaceId).eq('created_by',config.userId).in('financial_account_id',config.accountIds))
    must(linked.every(row=>config.transactionIds.includes(row.id)),'Unknown transaction uses a fixture account; cleanup stopped')
    for(const row of before.transactions)check(await client.from('transactions').delete().eq('id',row.id).eq('created_by',config.userId).eq('space_id',config.spaceId).eq('description',row.description))
    const restored=await read()
    must(restored.transactions.length===0,'Some fixture transactions remain')
    must(restored.accounts.every(row=>Number(row.balance)===(row.id===config.accountIds[0]?100:60)),'Unexpected account balance; account deletion stopped')
    for(const row of restored.accounts)check(await client.from('financial_accounts').delete().eq('id',row.id).eq('user_id',config.userId).eq('space_id',config.spaceId).eq('name',row.name))
    const final=await read();must(final.accounts.length===0&&final.transactions.length===0,'Cleanup incomplete');return final
  }
  return {read,seed,writes,regressions,cleanup}
}
