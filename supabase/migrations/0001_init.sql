-- Window Depot Visualizer — initial schema.
--
-- Every table is owned by a rep (auth.users) and readable only by that rep.
-- Homeowner-facing sharing deliberately does NOT go through RLS: the share
-- page calls an API route holding the service-role key, which validates the
-- token server-side. That keeps anonymous access narrow and auditable instead
-- of widening row policies for unauthenticated visitors.

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without every caller remembering to set it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- customers

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  address     text,
  phone       text,
  email       text,
  notes       text,
  badge       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customers_user_idx on public.customers (user_id, created_at desc);

-- Backs the search box on the Customers screen. pg_trgm gives useful partial
-- matches on a half-typed street name, which plain ILIKE prefix search does not.
create extension if not exists "pg_trgm";
create index customers_search_idx on public.customers
  using gin ((coalesce(name, '') || ' ' || coalesce(address, '') || ' ' || coalesce(phone, '')) gin_trgm_ops);

-- ----------------------------------------------------------------- projects

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  name         text not null default 'Exterior remodel',
  status       text not null default 'active'
               check (status in ('active', 'quoted', 'won', 'lost', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_customer_idx on public.projects (customer_id, created_at desc);
create index projects_user_idx on public.projects (user_id, updated_at desc);

-- ------------------------------------------------------------------- photos

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  storage_path  text not null,
  label         text not null default 'Elevation',
  width         integer not null,
  height        integer not null,
  is_active     boolean not null default false,
  captured_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index photos_project_idx on public.photos (project_id, created_at);

-- At most one active photo per project — the canvas has exactly one subject.
create unique index photos_one_active_per_project
  on public.photos (project_id) where is_active;

-- --------------------------------------------------------------- detections

-- One detected surface (roof plane, siding wall, window group) on one photo.
-- Polygon is normalised 0..1 against the photo's own dimensions so overlays
-- survive any container size, device pixel ratio, or later downscale.
create table public.detections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  photo_id     uuid not null references public.photos (id) on delete cascade,
  category     text not null,
  label        text not null,
  polygon      jsonb not null,
  approx_sqft  numeric,
  confidence   numeric check (confidence between 0 and 1),
  source       text not null default 'auto' check (source in ('auto', 'manual')),
  selected     boolean not null default true,
  created_at   timestamptz not null default now()
);

create index detections_photo_idx on public.detections (photo_id);

-- --------------------------------------------------------------- selections

create table public.selections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  category    text not null,
  line        text not null,
  color       text not null,
  options     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (project_id, category)
);

-- ----------------------------------------------------------------- versions

create table public.versions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  photo_id      uuid not null references public.photos (id) on delete cascade,
  name          text not null,
  meta          text,
  storage_path  text not null,
  instructions  jsonb not null default '[]'::jsonb,
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now()
);

create index versions_project_idx on public.versions (project_id, created_at desc);

-- -------------------------------------------------------------- render_jobs

-- Rendering is a job rather than a request/response so the UI survives a
-- serverless timeout, a dropped connection, or a tablet going to sleep
-- mid-render. The client polls this row; the function owns the transitions.
create table public.render_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  photo_id     uuid not null references public.photos (id) on delete cascade,
  version_id   uuid references public.versions (id) on delete set null,
  version_name text not null default 'Option A',
  state        text not null default 'queued'
               check (state in ('queued', 'running', 'done', 'failed', 'cancelled')),
  stage        integer not null default 0,
  instructions jsonb not null default '[]'::jsonb,
  mask_path    text,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index render_jobs_project_idx on public.render_jobs (project_id, created_at desc);
create index render_jobs_open_idx on public.render_jobs (state) where state in ('queued', 'running');

-- ------------------------------------------------------------------- shares

create table public.shares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at  timestamptz not null default (now() + interval '30 days'),
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index shares_token_idx on public.shares (token) where not revoked;

-- ----------------------------------------------------------------- feedback

-- Backs "Report result" — a rep flagging a bad render is the only signal we
-- get that prompt or masking quality regressed on a real house.
create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  version_id  uuid references public.versions (id) on delete cascade,
  note        text not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------ updated_at

create trigger customers_touch    before update on public.customers    for each row execute function public.touch_updated_at();
create trigger projects_touch     before update on public.projects     for each row execute function public.touch_updated_at();
create trigger selections_touch   before update on public.selections   for each row execute function public.touch_updated_at();
create trigger render_jobs_touch  before update on public.render_jobs  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS

alter table public.customers   enable row level security;
alter table public.projects    enable row level security;
alter table public.photos      enable row level security;
alter table public.detections  enable row level security;
alter table public.selections  enable row level security;
alter table public.versions    enable row level security;
alter table public.render_jobs enable row level security;
alter table public.shares      enable row level security;
alter table public.feedback    enable row level security;

-- Every table carries user_id, so one policy shape covers all of them. Written
-- out per table rather than generated, so the grants are greppable.
create policy customers_owner   on public.customers   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_owner    on public.projects    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy photos_owner      on public.photos      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy detections_owner  on public.detections  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy selections_owner  on public.selections  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy versions_owner    on public.versions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy render_jobs_owner on public.render_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shares_owner      on public.shares      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy feedback_owner    on public.feedback    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false), ('renders', 'renders', false)
on conflict (id) do nothing;

-- Objects are keyed <user_id>/<project_id>/<file>, so the first path segment
-- is the ownership check.
create policy "photos own folder" on storage.objects for all
  to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "renders own folder" on storage.objects for all
  to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
