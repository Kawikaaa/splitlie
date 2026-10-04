# Splitlie Demo Release Checklist

## 1. Build and hosting

- [ ] Run `npm install` and `npm run build` successfully.
- [ ] Deploy the generated `dist/` directory.
- [ ] Configure an SPA rewrite so every application route serves `/index.html`.
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting environment.
- [ ] Confirm that no service-role key or private credential is present in the frontend environment.

## 2. Supabase configuration

- [ ] Confirm every migration in `supabase/proposed/` has been applied in filename order.
- [ ] Set the Supabase Auth Site URL to the Demo URL.
- [ ] Add the Demo URL and `http://localhost:5173/**` to Auth redirect URLs.
- [ ] Keep email confirmation enabled or intentionally disable it for the invited testers.
- [ ] Send a real password-reset email and confirm its link returns to the Demo site.

## 3. Two-account smoke test

Use two fresh test accounts in separate browser profiles.

- [ ] Create account A; confirm its Personal Space is created automatically.
- [ ] Add a personal expense, income, monthly budget, and fixed expense; verify Safe to Spend.
- [ ] Create a shared space and invite account B by email.
- [ ] Open the invitation as account B and join successfully.
- [ ] Add equal-split and custom-split expenses from both accounts.
- [ ] Confirm balances match on both accounts, then record and reverse a settlement.
- [ ] Rename and pin the shared space; confirm ordering survives a refresh.
- [ ] Complete a test space and confirm it becomes read-only in History.
- [ ] Permanently delete a disposable test space and confirm it disappears for both accounts.

## 4. UI and device checks

- [ ] Switch between English and Chinese on Overview, Transactions, Budget, Settings, invitations, and transaction forms.
- [ ] Check the app at desktop width and at 390 px mobile width.
- [ ] Confirm custom modals are used for destructive actions and no browser alert/confirm dialogs appear.
- [ ] Confirm empty, loading, error, and long-name states remain readable.
- [ ] Refresh directly on `/budget`, `/transactions`, `/spaces`, and `/settings`.

## 5. Demo data and handoff

- [ ] Prepare one clean Personal Space and one shared “Trip” space with realistic sample activity.
- [ ] Avoid real financial information, personal email addresses, or production credentials.
- [ ] Write a short tester note explaining that this is a Demo and how to report issues.
- [ ] Record known limitations before inviting friends.

