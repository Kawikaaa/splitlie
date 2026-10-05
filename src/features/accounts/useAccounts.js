import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getExchangeRate } from '../../services/currency/exchangeRateService'
import { getLocalDateKey } from '../../utils/dateKeys.js'
import { createAccountRepository } from './accountRepository.js'
import { loadAccountQuotes } from './accountQuotes.js'

export const accountRepository = createAccountRepository(supabase)

export function useAccounts({ userId, spaceId, currency }) {
  const [state, setState] = useState({ loading: true, accounts: [], quotes: [], failed: false })
  const generation = useRef(0)
  const reload = useCallback(async () => {
    const request = ++generation.current
    setState({ loading: true, accounts: [], quotes: [], failed: false })
    try {
      const { data, error } = await accountRepository.list({ userId, spaceId, includeArchived: true })
      if (error) throw error
      const { quotes } = await loadAccountQuotes({ accounts: data, currency, date: getLocalDateKey(new Date()), getRate: getExchangeRate })
      if (generation.current === request) setState({ loading: false, accounts: data, quotes, failed: false })
    } catch {
      if (generation.current === request) setState({ loading: false, accounts: [], quotes: [], failed: true })
    }
  }, [userId, spaceId, currency])
  useEffect(() => {
    reload()
    return () => { generation.current += 1 }
  }, [reload])
  return { ...state, reload }
}
