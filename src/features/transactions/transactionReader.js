// Load every page rather than quietly inheriting the API's first-page limit.
// A failure or excessive result never becomes a seemingly complete subset.
export async function readSpaceTransactions(client,spaceId,{pageSize=1000,maxRows=20000}={}) {
  if(!spaceId||!Number.isSafeInteger(pageSize)||pageSize<1||!Number.isSafeInteger(maxRows)||maxRows<pageSize)return {data:null,error:{message:'INVALID_TRANSACTION_RANGE'}}
  const rows=new Map()
  for(let offset=0;offset<=maxRows;offset+=pageSize){
    const result=await client.from('transactions').select('*').eq('space_id',spaceId)
      .order('transaction_date',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+pageSize-1)
    if(result.error)return {data:null,error:result.error}
    if(!Array.isArray(result.data))return {data:null,error:{message:'INVALID_TRANSACTION_PAGE'}}
    for(const row of result.data)rows.set(row.id,row)
    if(rows.size>maxRows)return {data:null,error:{message:'TRANSACTION_RANGE_TOO_LARGE'}}
    if(result.data.length<pageSize)return {data:[...rows.values()],error:null}
  }
  return {data:null,error:{message:'TRANSACTION_RANGE_TOO_LARGE'}}
}
