// Once the write is committed, a list-refresh failure must never invoke it again.
export async function finishCommittedSave({refresh,close,isCurrent=()=>true,timeoutMs=8000}) {
  let timer,refreshed=false
  try { refreshed=await Promise.race([Promise.resolve().then(()=>refresh?.()).then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs)})]) }
  catch { refreshed=false }
  finally { clearTimeout(timer) }
  if(!refreshed||!isCurrent())return false
  close()
  return true
}
