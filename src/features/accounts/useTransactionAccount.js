import { useEffect, useState } from 'react'
import { accountRepository } from './useAccounts'
import { getExchangeRate } from '../../services/currency/exchangeRateService'

export function useTransactionAccount({ open, personal, userId, spaceId, transaction, defaultAccountId = '', currency, date, amount }) {
  const [accountId, setAccountId] = useState('')
  const [accounts, setAccounts] = useState([])
  const [reading, setReading] = useState(false)
  const [readFailed, setReadFailed] = useState(false)
  const [conversion, setConversion] = useState(null)
  const [quoteRetry, setQuoteRetry] = useState(0)
  useEffect(() => {
    setAccountId(transaction ? transaction.financial_account_id || '' : defaultAccountId)
    setAccounts([]); setReadFailed(false)
    if (!open || !personal) return
    let cancelled = false
    setReading(true)
    accountRepository.list({ userId, spaceId, includeArchived: true }).then(({ data, error }) => {
      if (cancelled) return
      setAccounts(error ? [] : data); setReadFailed(Boolean(error)); setReading(false)
    }).catch(() => { if (!cancelled) { setReadFailed(true); setReading(false) } })
    return () => { cancelled = true }
  }, [open, personal, userId, spaceId, transaction?.id, transaction?.financial_account_id, defaultAccountId])
  const selected = accounts.find(account => account.id === accountId)
  const quoteKey = `${accountId}:${currency}:${selected?.currency}:${date}`
  useEffect(() => {
    if (!open || !personal || !accountId || !selected) { setConversion(null); return }
    let cancelled = false
    setConversion({ key: quoteKey, loading: true })
    const locked = transaction?.financial_account_id === accountId && transaction.currency === currency
      && transaction.transaction_date === date && Number(transaction.account_exchange_rate) > 0
    const request = locked ? Promise.resolve({ rate: Number(transaction.account_exchange_rate), date: transaction.account_rate_date, provider: 'locked' })
      : getExchangeRate({ fromCurrency: currency, toCurrency: selected.currency, date })
    request.then(quote => { if (!cancelled) setConversion({ key: quoteKey, quote }) })
      .catch(() => { if (!cancelled) setConversion({ key: quoteKey, failed: true }) })
    return () => { cancelled = true }
  }, [open, personal, quoteKey, selected?.id, transaction, quoteRetry])
  const ready = !accountId || (!reading && selected && conversion?.key === quoteKey && conversion.quote)
  const payload = !accountId ? { financial_account_id: null, account_exchange_rate: null, account_rate_date: null }
    : ready ? { financial_account_id: accountId, account_exchange_rate: conversion.quote.rate, account_rate_date: conversion.quote.date } : null
  return { accountId, setAccountId, accounts, selected, reading, readFailed, ready, payload,
    retryQuote: () => setQuoteRetry(value => value + 1),
    failed: conversion?.key === quoteKey && conversion.failed,
    accountAmount: ready && accountId && Number.isFinite(Number(amount)) && Number(amount) > 0 ? Math.round(Number(amount) * conversion.quote.rate * 10000) / 10000 : null,
    quote: ready && accountId ? conversion.quote : null }
}
