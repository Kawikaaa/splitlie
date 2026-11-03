-- Applied after explicit user approval on 2026-11-01.
-- Scope check reads only these columns. Client permissions are unchanged.
grant select (id, created_by, type) on public.spaces to service_role;
