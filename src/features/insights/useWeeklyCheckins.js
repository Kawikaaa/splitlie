import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createWeeklyCheckinApi, readLegacyCheckins } from './weeklyCheckins'

const api = createWeeklyCheckinApi(supabase)
export default function useWeeklyCheckins(userId, spaceId) {
  const [state, setState] = useState({ scope: '', records: [], loading: true, error: null })
  const [retryNonce, setRetryNonce] = useState(0)
  const epoch = useRef(0)
  const saving = useRef(false)
  const scope = userId && spaceId ? `${userId}:${spaceId}` : ''
  useEffect(() => {
    const version = ++epoch.current
    saving.current = false
    setState({ scope, records: [], loading: Boolean(scope), error: null })
    if (!scope) return
    async function load() {
      try {
        // Read first: never overwrite an existing account reflection with browser history.
        let records = await api.load(userId, spaceId)
        if (version !== epoch.current) return
        const known = new Set(records.map(item => item.week))
        let legacy = []
        // Browser storage can be unavailable; account reads must still work.
        try { legacy = readLegacyCheckins(localStorage, spaceId).filter(item => !known.has(item.week)) } catch { /* No accessible legacy history. */ }
        if (legacy.length) {
          await api.importLegacy(userId, spaceId, legacy)
          records = await api.load(userId, spaceId)
        }
        if (version === epoch.current) setState({ scope, records, loading: false, error: null })
      } catch {
        if (version === epoch.current) setState({ scope, records: [], loading: false, error: 'load' })
      }
    }
    load()
    return () => { epoch.current += 1 }
  }, [scope, userId, spaceId, retryNonce])
  async function save(record) {
    if (saving.current || state.scope !== scope || state.loading || state.error === 'load') return false
    const version = epoch.current
    saving.current = true
    setState(current => ({ ...current, saving: true, error: null }))
    try {
      const saved = await api.save(userId, spaceId, record)
      if (version !== epoch.current) return false
      setState(current => ({ ...current, records: [...current.records.filter(item => item.week !== saved.week), saved], saving: false, error: null }))
      return true
    } catch {
      if (version === epoch.current) setState(current => ({ ...current, saving: false, error: 'save' }))
      return false
    } finally { if (version === epoch.current) saving.current = false }
  }
  return { ...(state.scope === scope ? state : { records: [], loading: true, error: null }), save, retry: () => setRetryNonce(value => value + 1) }
}
