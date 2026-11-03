// Retired parser. The opt-in frontend uses the separate ai-transaction-draft function.
Deno.serve(() => new Response(JSON.stringify({ ok: false, code: 'RETIRED' }), {
  status: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
}))
