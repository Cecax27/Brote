drop extension moddatetime cascade;
create extension moddatetime with schema extensions;

create or replace function public.handle_updated_at()
returns trigger
set search_path = ''
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;
