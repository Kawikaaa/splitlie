import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createReceiptPersistenceQa,validateReceiptQaConfig} from './receiptPersistence.js'
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const config=()=>({version:1,userId:id(1),spaceId:id(2),prefix:'__receipt_e2e_synthetic__',accountIds:[id(3),id(4)],transactionIds:[5,6,7,8,9].map(id),forbiddenUserIds:[id(10)]})
const payload=()=>({created_by:id(1),space_id:id(2),type:'expense',currency:'USD',amount:10,description:'__receipt_e2e_synthetic__ Receipt',financial_account_id:id(3),receipt_data:{image_hash:'c'.repeat(64),model:'synthetic-e2e-no-model'}})
function guardClient({userId=id(1),currency='USD'}={}){
  const calls=[]
  return {calls,auth:{async getUser(){return {data:{user:{id:userId}},error:null}}},from(table){calls.push(table);assert.equal(table,'spaces','No data write may reach the client')
    const query={select(){return query},eq(){return query},async single(){return {data:{id:id(2),currency},error:null}}};return query}}
}
test('receipt QA refuses unbound, real-identity, duplicate and unbounded fixture configuration',()=>{
  assert.doesNotThrow(()=>validateReceiptQaConfig(config()))
  for(const patch of [{userId:null},{spaceId:null},{userId:id(10)},{prefix:''},{accountIds:[id(3)]},{transactionIds:[5,6,7,8,3].map(id)}]){
    assert.throws(()=>validateReceiptQaConfig({...config(),...patch}))
  }
})
test('every QA operation stops on a changed session before any database access',async()=>{
  const client=guardClient({userId:id(20)}),qa=createReceiptPersistenceQa(client,config())
  for(const action of [qa.read,qa.seed,qa.cleanup,qa.regressions,()=>qa.writes(0).create(payload()),()=>qa.writes(0).update({transactionId:id(5)})])await assert.rejects(action,/session changed/)
  assert.deepEqual(client.calls,[])
})
test('receipt QA refuses real-account links, unmarked receipts and unexpected write values',async()=>{
  for(const patch of [{created_by:id(20)},{space_id:id(20)},{financial_account_id:id(20)},{description:'Real purchase'},{type:'income'},{amount:1001},{currency:'CNY'},{receipt_data:{image_hash:'c'.repeat(64),model:'real-provider'}}]){
    const client=guardClient(),qa=createReceiptPersistenceQa(client,config())
    await assert.rejects(()=>qa.writes(0).create({...payload(),...patch}))
    assert.deepEqual(client.calls,['spaces'])
  }
})
test('receipt QA stops on a non-USD space rather than changing its base currency',async()=>{
  const client=guardClient({currency:'CNY'}),qa=createReceiptPersistenceQa(client,config())
  await assert.rejects(qa.seed,/requires a USD test space/);assert.deepEqual(client.calls,['spaces'])
})
