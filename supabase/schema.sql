-- =========================================================
-- Shared Ledger V1
-- Production-ready database foundation
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 200000),
  default_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. SPACES
-- Personal and Shared use the SAME table.
-- =========================================================

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal', 'shared')),
  currency text not null default 'USD',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One Personal Space per user.
create unique index if not exists one_personal_space_per_user
on public.spaces(created_by)
where type = 'personal';

-- =========================================================
-- 3. SPACE MEMBERS
-- =========================================================

create table if not exists public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index if not exists idx_space_members_user
on public.space_members(user_id);

-- =========================================================
-- 4. TRANSACTIONS
-- Same table for Personal + Shared transactions.
-- =========================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null
    references public.spaces(id) on delete cascade,

  created_by uuid not null
    references public.profiles(id) on delete cascade,

  paid_by uuid
    references public.profiles(id) on delete set null,

  type text not null
    check (type in ('expense', 'income')),

  amount numeric(12,2) not null
    check (amount > 0),

  currency text not null default 'USD',

  category text,
  description text,

  transaction_date date not null default current_date,

  split_type text not null default 'none'
    check (split_type in ('none', 'equal', 'custom')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint income_cannot_be_split
  check (
    type = 'expense'
    or split_type = 'none'
  )
);

create index if not exists idx_transactions_space
on public.transactions(space_id);

create index if not exists idx_transactions_date
on public.transactions(transaction_date desc);

-- =========================================================
-- 5. TRANSACTION SPLITS
-- Stores how much each member is RESPONSIBLE for.
-- Example:
-- $120 dinner
-- You $60 / Alex $40 / Sam $20
-- =========================================================

create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),

  transaction_id uuid not null
    references public.transactions(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  amount numeric(12,2) not null
    check (amount >= 0),

  created_at timestamptz not null default now(),

  unique(transaction_id, user_id)
);

create index if not exists idx_transaction_splits_transaction
on public.transaction_splits(transaction_id);

create index if not exists idx_transaction_splits_user
on public.transaction_splits(user_id);

-- =========================================================
-- 6. SETTLEMENTS
-- Example:
-- Alex pays you $50.
-- =========================================================

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null
    references public.spaces(id) on delete cascade,

  from_user uuid not null
    references public.profiles(id) on delete cascade,

  to_user uuid not null
    references public.profiles(id) on delete cascade,

  amount numeric(12,2) not null
    check (amount > 0),

  currency text not null default 'USD',

  settlement_date date not null default current_date,

  note text,

  created_by uuid not null
    references public.profiles(id) on delete cascade,

  created_at timestamptz not null default now(),

  constraint settlement_users_different
  check (from_user <> to_user)
);

create index if not exists idx_settlements_space
on public.settlements(space_id);

-- =========================================================
-- 7. INVITATIONS
-- =========================================================

create table if not exists public.space_invitations (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null
    references public.spaces(id) on delete cascade,

  invited_email text not null,

  invited_by uuid not null
    references public.profiles(id) on delete cascade,

  token text not null unique
    default encode(gen_random_bytes(24), 'hex'),

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),

  expires_at timestamptz not null
    default (now() + interval '7 days'),

  created_at timestamptz not null default now()
);

create index if not exists idx_space_invitations_space
on public.space_invitations(space_id);

create index if not exists idx_space_invitations_email
on public.space_invitations(lower(invited_email));

-- =========================================================
-- 8. HELPER FUNCTIONS
-- These avoid recursive RLS policy problems.
-- =========================================================

create or replace function public.is_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_space_owner(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.can_manage_transaction(target_transaction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.transactions t
    where t.id = target_transaction_id
      and (
        t.created_by = auth.uid()
        or public.is_space_owner(t.space_id)
      )
  );
$$;

-- =========================================================
-- 9. AUTOMATIC PROFILE + PERSONAL SPACE
-- Runs every time a user signs up.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
  user_name text;
begin

  user_name :=
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      'User'
    );

  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    user_name
  );

  insert into public.spaces (
    name,
    type,
    currency,
    created_by
  )
  values (
    'My Money',
    'personal',
    'USD',
    new.id
  )
  returning id into new_space_id;

  insert into public.space_members (
    space_id,
    user_id,
    role
  )
  values (
    new_space_id,
    new.id,
    'owner'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- =========================================================
-- 10. CREATE SHARED SPACE RPC
-- Creates Shared Space + owner membership atomically.
-- =========================================================

create or replace function public.create_shared_space(
  space_name text,
  space_currency text default 'USD'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if trim(space_name) = '' then
    raise exception 'Space name cannot be empty';
  end if;

  insert into public.spaces (
    name,
    type,
    currency,
    created_by
  )
  values (
    trim(space_name),
    'shared',
    upper(space_currency),
    auth.uid()
  )
  returning id into new_space_id;

  insert into public.space_members (
    space_id,
    user_id,
    role
  )
  values (
    new_space_id,
    auth.uid(),
    'owner'
  );

  return new_space_id;
end;
$$;

-- =========================================================
-- 11. CREATE INVITATION RPC
-- Only owner can invite.
-- Returns invitation token.
-- =========================================================

create or replace function public.create_space_invitation(
  target_space_id uuid,
  email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_token text;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_space_owner(target_space_id) then
    raise exception 'Only the space owner can invite members';
  end if;

  if trim(email) = '' then
    raise exception 'Email cannot be empty';
  end if;

  insert into public.space_invitations (
    space_id,
    invited_email,
    invited_by
  )
  values (
    target_space_id,
    lower(trim(email)),
    auth.uid()
  )
  returning token into invite_token;

  return invite_token;
end;
$$;

-- =========================================================
-- 12. ACCEPT INVITATION RPC
-- User must be signed in with invited email.
-- =========================================================

create or replace function public.accept_space_invitation(
  invitation_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.space_invitations%rowtype;
  current_email text;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into invitation_row
  from public.space_invitations
  where token = invitation_token
  limit 1;

  if invitation_row.id is null then
    raise exception 'Invitation not found';
  end if;

  if invitation_row.status <> 'pending' then
    raise exception 'Invitation is no longer valid';
  end if;

  if invitation_row.expires_at < now() then

    update public.space_invitations
    set status = 'expired'
    where id = invitation_row.id;

    raise exception 'Invitation has expired';
  end if;

  select lower(email)
  into current_email
  from auth.users
  where id = auth.uid();

  if current_email <> lower(invitation_row.invited_email) then
    raise exception 'This invitation belongs to another email address';
  end if;

  insert into public.space_members (
    space_id,
    user_id,
    role
  )
  values (
    invitation_row.space_id,
    auth.uid(),
    'member'
  )
  on conflict (space_id, user_id) do nothing;

  update public.space_invitations
  set status = 'accepted'
  where id = invitation_row.id;

  return invitation_row.space_id;
end;
$$;

-- =========================================================
-- 13. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists spaces_updated_at on public.spaces;

create trigger spaces_updated_at
before update on public.spaces
for each row
execute procedure public.set_updated_at();

drop trigger if exists transactions_updated_at on public.transactions;

create trigger transactions_updated_at
before update on public.transactions
for each row
execute procedure public.set_updated_at();

-- =========================================================
-- 14. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.space_invitations enable row level security;

-- =========================================================
-- 15. PROFILES POLICIES
-- =========================================================

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

create policy "Members can view profiles in shared spaces"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.space_members mine
    join public.space_members theirs
      on mine.space_id = theirs.space_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

-- =========================================================
-- 16. SPACES POLICIES
-- =========================================================

create policy "Members can view their spaces"
on public.spaces
for select
to authenticated
using (
  public.is_space_member(id)
);

create policy "Users can create spaces"
on public.spaces
for insert
to authenticated
with check (
  created_by = auth.uid()
);

create policy "Owners can update spaces"
on public.spaces
for update
to authenticated
using (
  public.is_space_owner(id)
)
with check (
  public.is_space_owner(id)
);

create policy "Owners can delete shared spaces"
on public.spaces
for delete
to authenticated
using (
  type = 'shared'
  and public.is_space_owner(id)
);

-- =========================================================
-- 17. SPACE MEMBERS POLICIES
-- =========================================================

create policy "Members can view space membership"
on public.space_members
for select
to authenticated
using (
  public.is_space_member(space_id)
);

create policy "Space creators can add themselves"
on public.space_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.spaces
    where spaces.id = space_members.space_id
      and spaces.created_by = auth.uid()
  )
);

create policy "Owners can add members"
on public.space_members
for insert
to authenticated
with check (
  public.is_space_owner(space_id)
);

create policy "Owners can remove members"
on public.space_members
for delete
to authenticated
using (
  public.is_space_owner(space_id)
);

create policy "Members can leave shared spaces"
on public.space_members
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.spaces
    where spaces.id = space_members.space_id
      and spaces.type = 'shared'
  )
);

-- =========================================================
-- 18. TRANSACTIONS POLICIES
-- =========================================================

create policy "Members can view transactions"
on public.transactions
for select
to authenticated
using (
  public.is_space_member(space_id)
);

create policy "Members can create transactions"
on public.transactions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_space_member(space_id)
);

create policy "Creator or owner can update transactions"
on public.transactions
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_space_owner(space_id)
)
with check (
  public.is_space_member(space_id)
);

create policy "Creator or owner can delete transactions"
on public.transactions
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_space_owner(space_id)
);

-- =========================================================
-- 19. SPLIT POLICIES
-- =========================================================

create policy "Members can view transaction splits"
on public.transaction_splits
for select
to authenticated
using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_splits.transaction_id
      and public.is_space_member(t.space_id)
  )
);

create policy "Transaction managers can create splits"
on public.transaction_splits
for insert
to authenticated
with check (
  public.can_manage_transaction(transaction_id)
);

create policy "Transaction managers can update splits"
on public.transaction_splits
for update
to authenticated
using (
  public.can_manage_transaction(transaction_id)
)
with check (
  public.can_manage_transaction(transaction_id)
);

create policy "Transaction managers can delete splits"
on public.transaction_splits
for delete
to authenticated
using (
  public.can_manage_transaction(transaction_id)
);

-- =========================================================
-- 20. SETTLEMENT POLICIES
-- =========================================================

create policy "Members can view settlements"
on public.settlements
for select
to authenticated
using (
  public.is_space_member(space_id)
);

create policy "Members can create settlements"
on public.settlements
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_space_member(space_id)
);

create policy "Settlement creator or owner can update"
on public.settlements
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_space_owner(space_id)
)
with check (
  public.is_space_member(space_id)
);

create policy "Settlement creator or owner can delete"
on public.settlements
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_space_owner(space_id)
);

-- =========================================================
-- 21. INVITATION POLICIES
-- =========================================================

create policy "Owners can view invitations"
on public.space_invitations
for select
to authenticated
using (
  public.is_space_owner(space_id)
);

create policy "Invited users can view their invitation"
on public.space_invitations
for select
to authenticated
using (
  lower(invited_email)
  =
  lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "Owners can create invitations"
on public.space_invitations
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and public.is_space_owner(space_id)
);

create policy "Owners can update invitations"
on public.space_invitations
for update
to authenticated
using (
  public.is_space_owner(space_id)
)
with check (
  public.is_space_owner(space_id)
);

create policy "Owners can delete invitations"
on public.space_invitations
for delete
to authenticated
using (
  public.is_space_owner(space_id)
);

-- =========================================================
-- DONE
-- =========================================================
