begin;
-- Receipt and its lines live on the transaction row, so existing financial
-- triggers and optimistic edits atomically commit or reject the entire record.
alter table public.transactions add column receipt_data jsonb;
create function accounts_private.validate_receipt_data() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare r jsonb := new.receipt_data; line jsonb; field text;
begin
  if r is null then return new; end if;
  if new.type <> 'expense' or not exists (select 1 from public.spaces where id = new.space_id and type = 'personal' and created_by = auth.uid()) then raise exception 'RECEIPT_SCOPE'; end if;
  if jsonb_typeof(r) <> 'object' or pg_column_size(r) > 40000 or (r->>'version') is distinct from '1' or (r->>'reviewed') is distinct from 'true'
    or coalesce(r->>'image_hash','') !~ '^[a-f0-9]{64}$'
    or coalesce(r->>'total','') !~ '^\d{1,10}(\.\d{1,4})?$' or (r->>'total')::numeric <> new.amount
    or r->>'currency' is distinct from new.currency or r->>'date' is distinct from new.transaction_date::text
    or jsonb_typeof(r->'items') is distinct from 'array' then raise exception 'RECEIPT_INVALID'; end if;
  if jsonb_array_length(r->'items') > 60 then raise exception 'RECEIPT_INVALID'; end if;
  for line in select value from jsonb_array_elements(r->'items') loop
    if jsonb_typeof(line) <> 'object' or coalesce(length(line->>'name'),0) not between 1 and 120
      or coalesce(line->>'amount','') !~ '^-?\d{1,10}(\.\d{1,4})?$' then raise exception 'RECEIPT_INVALID'; end if;
    if line->>'quantity' is not null and ((line->>'quantity') !~ '^\d+(\.\d+)?$' or (line->>'quantity')::numeric <= 0 or (line->>'quantity')::numeric > 10000) then raise exception 'RECEIPT_INVALID'; end if;
  end loop;
  foreach field in array array['tax','tip','discount'] loop
    if r->>field is not null and (r->>field) !~ '^\d{1,10}(\.\d{1,4})?$' then raise exception 'RECEIPT_INVALID'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function accounts_private.validate_receipt_data() from public,anon,authenticated;
create trigger validate_receipt before insert or update of receipt_data,amount,currency,transaction_date,type,space_id on public.transactions for each row execute function accounts_private.validate_receipt_data();

create table public.ai_weekly_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade, week_start date not null,
  language text not null check (language in ('en','zh','ja','ko','es')),
  goal text not null check (goal in ('understand','flexible','subscriptions','steady')),
  facts_hash text not null check (facts_hash ~ '^[a-f0-9]{64}$'), facts jsonb not null check (jsonb_typeof(facts)='object' and pg_column_size(facts)<20000),
  output jsonb not null check (jsonb_typeof(output)='object' and pg_column_size(output)<2000), model text not null, prompt_version text not null,
  created_at timestamptz not null default now(), unique(user_id,space_id,facts_hash)
);
create index ai_weekly_reports_scope on public.ai_weekly_reports(user_id,space_id,week_start,language,created_at desc);
alter table public.ai_weekly_reports enable row level security;
create policy own_reports on public.ai_weekly_reports for all to authenticated
  using (user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'))
  with check (user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'));
revoke all on public.ai_weekly_reports from public,anon,authenticated;
grant select,insert,delete on public.ai_weekly_reports to authenticated;

create table public.ai_assistant_preferences (
  user_id uuid not null references auth.users(id) on delete cascade, space_id uuid not null references public.spaces(id) on delete cascade,
  goal text not null check(goal in ('understand','flexible','subscriptions','steady')), primary key(user_id,space_id)
);
alter table public.ai_assistant_preferences enable row level security;
create policy own_assistant_preferences on public.ai_assistant_preferences for all to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'))
  with check(user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'));
revoke all on public.ai_assistant_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_preferences to authenticated;

create table public.ai_assistant_actions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade, report_id uuid not null references public.ai_weekly_reports(id) on delete cascade,
  kind text not null check(kind in ('track','review_category','review_purchase')),
  feedback text not null check(feedback in ('accepted','ignored','one_off','necessary','helpful','not_helpful','completed')),
  review_date date not null, created_at timestamptz not null default now(), unique(user_id,report_id)
);
create index ai_assistant_actions_scope on public.ai_assistant_actions(user_id,space_id,review_date);
alter table public.ai_assistant_actions enable row level security;
create policy own_assistant_actions on public.ai_assistant_actions for all to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.ai_weekly_reports r where r.id=report_id and r.user_id=(select auth.uid()) and r.space_id=ai_assistant_actions.space_id))
  with check(user_id=(select auth.uid()) and exists(select 1 from public.ai_weekly_reports r where r.id=report_id and r.user_id=(select auth.uid()) and r.space_id=ai_assistant_actions.space_id and r.output->>'action'=kind));
revoke all on public.ai_assistant_actions from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_actions to authenticated;

create table public.ai_assistant_quotas(quota_day date not null, user_id uuid not null, task text not null check(task in ('receipt','weekly')), requests integer not null default 0 check(requests>=0), primary key(quota_day,user_id,task));
alter table public.ai_assistant_quotas enable row level security;
revoke all on public.ai_assistant_quotas from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_quotas to service_role;
commit;
