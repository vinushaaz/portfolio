-- ============================================================================
-- Portfolio CMS — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILE  (single row — the hero / contact info)
-- ---------------------------------------------------------------------------
create table if not exists profile (
  id integer primary key default 1,
  name text default '',
  role text default '',
  bio text default '',
  status text default '',
  avatar_url text default '',
  cover_url text default '',
  resume_url text default '',
  github text default '',
  linkedin text default '',
  leetcode text default '',
  hackerrank text default '',
  email text default '',
  phone text default '',
  portfolio_url text default '',
  location text default '',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into profile (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. ABOUT  (single row — rich text + JSON lists)
-- ---------------------------------------------------------------------------
create table if not exists about (
  id integer primary key default 1,
  content_html text default '',
  education jsonb default '[]',
  experience jsonb default '[]',
  achievements jsonb default '[]',
  interests jsonb default '[]',
  languages jsonb default '[]',
  gallery jsonb default '[]',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into about (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. PROJECTS
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled project',
  slug text unique,
  thumbnail_url text default '',
  gallery jsonb default '[]',
  summary text default '',
  content_html text default '',
  github_url text default '',
  demo_url text default '',
  docs_url text default '',
  diagram_url text default '',
  tech_stack jsonb default '[]',
  tags jsonb default '[]',
  category text default '',
  status text default 'In Progress',
  featured boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 4. SKILLS
-- ---------------------------------------------------------------------------
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Embedded Systems',
  logo_url text default '',
  description text default '',
  level integer default 3,        -- 1-5
  years numeric default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 5. CERTIFICATES
-- ---------------------------------------------------------------------------
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text default '',
  issued_date date,
  credential_url text default '',
  pdf_url text default '',
  image_url text default '',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 6. TECH NOTES
-- ---------------------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled note',
  slug text unique,
  content_html text default '',
  category text default 'General',
  tags jsonb default '[]',
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 7. LEARNING TRACKER
-- ---------------------------------------------------------------------------
create table if not exists learning (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'Embedded Systems',
  resources jsonb default '[]',   -- [{label,url}]
  progress integer default 0,     -- 0-100
  completed boolean default false,
  notes text default '',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 8. GALLERY
-- ---------------------------------------------------------------------------
create table if not exists gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text default '',
  category text default 'General',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 9. SITE SETTINGS  (SEO + footer, single row)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id integer primary key default 1,
  seo_title text default '',
  seo_description text default '',
  footer_text text default '',
  visitor_count integer default 0,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Public (anon) can only READ. Only a signed-in user can WRITE.
-- This is a single-owner site, so "any authenticated user" = the owner,
-- as long as you never create a public sign-up flow (see README).
-- ============================================================================
alter table profile enable row level security;
alter table about enable row level security;
alter table projects enable row level security;
alter table skills enable row level security;
alter table certificates enable row level security;
alter table notes enable row level security;
alter table learning enable row level security;
alter table gallery enable row level security;
alter table settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profile','about','projects','skills','certificates','notes','learning','gallery','settings']
  loop
    execute format('drop policy if exists "public read %1$s" on %1$s;', t);
    execute format('create policy "public read %1$s" on %1$s for select using (true);', t);

    execute format('drop policy if exists "owner write %1$s" on %1$s;', t);
    execute format('create policy "owner write %1$s" on %1$s for insert with check (auth.role() = ''authenticated'');', t);

    execute format('drop policy if exists "owner update %1$s" on %1$s;', t);
    execute format('create policy "owner update %1$s" on %1$s for update using (auth.role() = ''authenticated'');', t);

    execute format('drop policy if exists "owner delete %1$s" on %1$s;', t);
    execute format('create policy "owner delete %1$s" on %1$s for delete using (auth.role() = ''authenticated'');', t);
  end loop;
end $$;

-- ============================================================================
-- STORAGE BUCKETS
-- Run once. Public read, authenticated write.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects
  for select using (bucket_id = 'portfolio-media');

drop policy if exists "owner upload media" on storage.objects;
create policy "owner upload media" on storage.objects
  for insert with check (bucket_id = 'portfolio-media' and auth.role() = 'authenticated');

drop policy if exists "owner update media" on storage.objects;
create policy "owner update media" on storage.objects
  for update using (bucket_id = 'portfolio-media' and auth.role() = 'authenticated');

drop policy if exists "owner delete media" on storage.objects;
create policy "owner delete media" on storage.objects
  for delete using (bucket_id = 'portfolio-media' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Visitor counter — public can increment (but not read/write settings directly)
-- ---------------------------------------------------------------------------
create or replace function increment_visitor_count()
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  update settings set visitor_count = visitor_count + 1 where id = 1
  returning visitor_count into new_count;
  return new_count;
end;
$$;
grant execute on function increment_visitor_count() to anon, authenticated;

-- ============================================================================
-- Done. Next steps:
-- 1. Authentication → Providers → make sure "Email" is enabled.
-- 2. Authentication → Users → Add user → create YOUR admin login (email + password).
-- 3. Authentication → Settings → turn OFF "Allow new users to sign up"
--    (this is a single-owner site — nobody else should be able to register).
-- 4. Copy your Project URL + anon public key into assets/js/supabase-config.js
-- ============================================================================
