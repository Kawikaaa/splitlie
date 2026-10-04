# parse-transaction

Authenticated Edge Function for AI-assisted transaction extraction. The browser
never receives the model provider key.

Preferred production secret (GPT-6 Sol with strict Structured Outputs):

```sh
supabase secrets set OPENAI_API_KEY=your_key
```

`DEEPSEEK_API_KEY` remains an optional fallback when no OpenAI key is set.

Deploy with JWT verification enabled (the default):

```sh
supabase functions deploy parse-transaction
```

Input fields: `text`, `today`, `language`, `fallbackCurrency`.

The function validates both the signed-in Supabase user and the model's strict
schema result before returning it. Explicit currency codes and dates are also
rechecked by the client-side deterministic parser. It does not save transaction
text or model output.
