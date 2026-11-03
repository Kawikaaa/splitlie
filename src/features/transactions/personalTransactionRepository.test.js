import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createPersonalEntry,updatePersonalEntry} from './personalTransactionRepository.js'
import {receiptPayload} from '../assistant/receiptDraft.js'

const clone = value => JSON.parse(JSON.stringify(value))
const form = {amount:'12.80',currency:'USD',date:'2026-11-02',description:'Synthetic shop'}
const summary = () => receiptPayload({merchant:null,date:null,currency:null,total:null,items:[],tax:null,tip:null,discount:null,
  uncertain:['total'],image_hash:'b'.repeat(64),capture_mode:'summary',reviewed:true,preview:'must-not-persist'},form)
const entry = () => ({id:'receipt-operation',space_id:'synthetic-space',created_by:'synthetic-user',type:'expense',
  amount:12.8,currency:'USD',transaction_date:form.date,payment_status:'paid',account_id:null,receipt_data:summary()})
const networkError={message:'Synthetic lost response'}

// In-memory PostgREST contract double; no real database/account balances exist.
function memory({loseResponse=false,readError=false,insertError=false}={}) {
  const rows=new Map(),calls=[];let writes=0
  const client={from(table){assert.equal(table,'transactions');let operation,body,filters=[]
    const query={
      insert(value){calls.push(['insert',clone(value)]);if(insertError)return Promise.resolve({data:null,error:networkError})
        if(rows.has(value.id))return Promise.resolve({data:null,error:{code:'23505'}})
        rows.set(value.id,{...clone(value),updated_at:'version-1'});writes++
        return Promise.resolve({data:null,error:loseResponse?networkError:null})},
      update(value){operation='update';body=value;return query},
      select(columns){calls.push(['select',columns]);return query},
      eq(key,value){filters.push([key,value]);calls.push(['eq',key,value]);return query},
      async maybeSingle(){if(readError)return {data:null,error:{message:'Read failed'}}
        return {data:clone([...rows.values()].find(row=>filters.every(([key,value])=>row[key]===value))||null),error:null}},
      async single(){assert.equal(operation,'update');const row=[...rows.values()].find(row=>filters.every(([key,value])=>row[key]===value))
        if(!row)return {data:null,error:{code:'PGRST116'}}
        rows.set(row.id,{...row,...clone(body),updated_at:'version-2'});writes++;return {data:{id:row.id},error:null}}
    };return query}}
  return {client,rows,calls,get writes(){return writes}}
}

test('summary save/read/edit round trip preserves manual source and excludes image/session data',async()=>{
  const db=memory(),original=entry();assert.equal((await createPersonalEntry(db.client,original)).error,null)
  const reopened=clone(db.rows.get(original.id));assert.equal(reopened.receipt_data.amount_source,'user')
  assert.equal('preview' in reopened.receipt_data,false);assert.deepEqual(reopened.receipt_data.items,[])
  const receipt=receiptPayload(reopened.receipt_data,{...form,amount:'14.50',description:'Corrected synthetic shop'})
  const result=await updatePersonalEntry(db.client,{transactionId:original.id,spaceId:original.space_id,expectedUpdatedAt:reopened.updated_at,
    changes:{amount:14.5,description:'Corrected synthetic shop',receipt_data:receipt}})
  assert.equal(result.error,null);const final=clone(db.rows.get(original.id))
  assert.equal(final.amount,14.5);assert.equal(final.receipt_data.total,'14.50');assert.equal(final.receipt_data.amount_source,'user')
})

test('lost successful receipt response recovers only the scoped persisted operation',async()=>{
  const db=memory({loseResponse:true}),row=entry(),result=await createPersonalEntry(db.client,row)
  assert.equal(result.error,null);assert.equal(db.writes,1)
  assert.deepEqual(db.calls.filter(call=>call[0]==='eq'),[['eq','id',row.id],['eq','space_id',row.space_id],['eq','created_by',row.created_by]])
})

test('concurrent same-operation receipt retries persist only once',async()=>{
  const db=memory({loseResponse:true}),row=entry()
  const results=await Promise.all([createPersonalEntry(db.client,row),createPersonalEntry(db.client,clone(row))])
  assert.ok(results.every(result=>!result.error));assert.equal(db.writes,1);assert.equal(db.rows.size,1)
})

test('JSON object key reordering during persistence does not break an identical receipt retry',async()=>{
  const db=memory();const row=entry();await createPersonalEntry(db.client,row)
  const stored=db.rows.get(row.id);stored.receipt_data=Object.fromEntries(Object.entries(stored.receipt_data).reverse())
  assert.equal((await createPersonalEntry(db.client,row)).error,null);assert.equal(db.writes,1)
})

test('a changed amount, account or receipt is not silently accepted as a successful retry',async()=>{
  for(const changes of [{amount:18},{account_id:'different-account'},{receipt_data:{...summary(),amount_source:'recognition'}}]){
    const db=memory(),row=entry();await createPersonalEntry(db.client,row)
    assert.equal((await createPersonalEntry(db.client,{...row,...changes})).error.code,'23505');assert.equal(db.writes,1)
  }
})

test('a failed duplicate read or a missing persisted row cannot fabricate success',async()=>{
  const db=memory({loseResponse:true,readError:true})
  assert.equal((await createPersonalEntry(db.client,entry())).error,networkError)
  const missing=memory({insertError:true})
  assert.equal((await createPersonalEntry(missing.client,entry())).error,networkError);assert.equal(missing.writes,0)
})

test('different user or space cannot recover another receipt operation',async()=>{
  for(const changes of [{created_by:'other-user'},{space_id:'other-space'}]){
    const db=memory(),row=entry();await createPersonalEntry(db.client,row)
    assert.equal((await createPersonalEntry(db.client,{...row,...changes})).error.code,'23505');assert.equal(db.writes,1)
  }
})

test('legacy entries without an operation UUID keep error behavior without recovery reads',async()=>{
  const db=memory({insertError:true}),{id:unused,...row}={...entry(),receipt_data:null}
  assert.equal((await createPersonalEntry(db.client,row)).error,networkError)
  assert.deepEqual(db.calls.map(call=>call[0]),['insert'])
})

test('ordinary entries with a stable operation UUID also recover without duplicate writes',async()=>{
  const db=memory({loseResponse:true}),row={...entry(),receipt_data:null}
  assert.equal((await createPersonalEntry(db.client,row)).error,null)
  assert.equal((await createPersonalEntry(db.client,structuredClone(row))).error,null)
  assert.equal(db.writes,1);assert.equal(db.rows.size,1)
})

test('editing a stale or out-of-space entry fails without changing the persisted row',async()=>{
  for(const context of [{spaceId:'other-space',expectedUpdatedAt:'version-1'},{spaceId:'synthetic-space',expectedUpdatedAt:'stale-version'}]){
    const db=memory(),row=entry();await createPersonalEntry(db.client,row)
    const before=clone(db.rows.get(row.id))
    const result=await updatePersonalEntry(db.client,{transactionId:row.id,...context,changes:{amount:99,receipt_data:null}})
    assert.equal(result.error.code,'PGRST116');assert.deepEqual(db.rows.get(row.id),before);assert.equal(db.writes,1)
  }
})
