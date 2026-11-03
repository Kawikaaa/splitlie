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

commit;
