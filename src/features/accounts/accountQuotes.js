// getRate is the existing exchange-rate adapter, injected for testability.
// Native balances never change when the display currency changes.
export async function loadAccountQuotes({ accounts, currency, date, getRate }) {
  const currencies = [...new Set(accounts.filter(account => !account.archived_at && account.include_in_total &&
    account.currency !== currency && Number(account.balance) > 0).map(account => account.currency))]
  const results = await Promise.all(currencies.map(async from => {
    try {
      const rate = await getRate({ fromCurrency: from, toCurrency: currency, date })
      if (!(Number(rate?.rate) > 0) || !Number.isFinite(Number(rate.rate)) || !rate.date || !rate.provider || rate.provider === 'unknown') throw new Error('Unattributed rate')
      return { quote: { from_currency: from, to_currency: currency, rate: Number(rate.rate), rate_date: rate.date, provider: rate.provider } }
    } catch {
      return { issue: { currency: from, reason: 'account_fx_unavailable' } }
    }
  }))
  return { quotes: results.flatMap(result => result.quote ? [result.quote] : []), issues: results.flatMap(result => result.issue ? [result.issue] : []) }
}
