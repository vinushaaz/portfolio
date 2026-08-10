-- Run this once in Supabase → SQL Editor.
-- Safe to run even if you already ran the original schema.sql.

alter table profile add column if not exists logo_url text default '';
alter table profile add column if not exists extra_links jsonb default '[]';

-- projects.gallery already exists from the original schema.sql,
-- this line is just a safety net in case it was missed.
alter table projects add column if not exists gallery jsonb default '[]';
