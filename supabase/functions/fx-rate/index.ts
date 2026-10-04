const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supportedCurrencies = new Set([
  'USD', 'CAD', 'CNY', 'EUR', 'GBP',
  'JPY', 'AUD', 'HKD', 'SGD', 'KRW',
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const body = await request.json()
    const from = String(body?.from || '').trim().toUpperCase()
    const to = String(body?.to || '').trim().toUpperCase()
    const date = String(body?.date || '').trim()

    if (!supportedCurrencies.has(from) || !supportedCurrencies.has(to)) {
      return json({ error: 'Unsupported currency.' }, 400)
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'Date must use YYYY-MM-DD.' }, 400)
    }

    if (from === to) {
      return json({
        from,
        to,
        rate: 1,
        date: date || new Date().toISOString().slice(0, 10),
        provider: 'identity',
      })
    }

    const url = new URL(
      `https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`
    )

    if (date) url.searchParams.set('date', date)

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      const providerError = await response.text()
      console.error('FX provider error', response.status, providerError)
      return json({ error: 'Exchange rate is currently unavailable.' }, 502)
    }

    const data = await response.json()
    const rate = Number(data?.rate)

    if (!Number.isFinite(rate) || rate <= 0) {
      console.error('FX provider returned an invalid rate', data)
      return json({ error: 'Exchange rate is currently unavailable.' }, 502)
    }

    return json({
      from,
      to,
      rate,
      date: data.date || date || new Date().toISOString().slice(0, 10),
      provider: 'frankfurter',
    })
  } catch (error) {
    console.error('FX function failed', error)
    return json({ error: 'Exchange rate is currently unavailable.' }, 500)
  }
})

