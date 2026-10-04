# Splitlie

Splitlie is a personal budget and shared-expense app. Every user starts with a private Personal Space and can create shared spaces for trips, partners, roommates, or groups.

## Demo features

- Email/password authentication and password recovery
- Personal and shared spaces with pinning, activity ordering, completion history, and permanent deletion
- Expenses, income, categories, custom/equal splits, balances, settlements, and reversals
- Personal monthly budget, fixed expenses, and Safe to Spend
- English and Simplified Chinese interface
- Responsive desktop/mobile navigation and app-owned confirmation dialogs

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add the Supabase project URL and anonymous key
4. Start Vite: `npm run dev`

On Windows PowerShell, use `npm.cmd run dev` if script execution policy blocks `npm.ps1`.

## Production build

Run `npm run build`. The deployable site is generated in `dist/`. The hosting provider must rewrite unknown routes to `/index.html` because the app uses client-side routing.

## Supabase

The SQL changes used by the current app are stored in `supabase/proposed/` and should be applied in filename order. Never expose the Supabase service-role key in the browser; only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in the frontend environment.

Before sharing the Demo URL, add both the production URL and the local development URL to Supabase Authentication → URL Configuration. See [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) for the release and smoke-test checklist.

