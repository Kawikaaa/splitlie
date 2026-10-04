-- Shared member profile photos.
-- The app stores a compact 256x256 WebP data URL so no public Storage bucket is required.

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_length;

alter table public.profiles
  add constraint profiles_avatar_url_length
  check (avatar_url is null or char_length(avatar_url) <= 200000);

comment on column public.profiles.avatar_url is
  'Compact profile image data URL visible only through existing profile RLS policies.';
