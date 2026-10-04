# fx-rate

Authenticated Supabase Edge Function used by Splitlie to retrieve a latest or
historical accounting exchange rate. It uses Frankfurter v2 on the server side
and never falls back to a rate of `1` when currencies differ.

Deploy from the Supabase Dashboard or with:

```sh
supabase functions deploy fx-rate --use-api
```

Keep JWT verification enabled. The browser invokes this function through the
signed-in Supabase client.


