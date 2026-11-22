-- Skema vir Leierskapnetwerk Platform
-- Hardloop dit in die Supabase SQL Editor.

create table if not exists notes (
  id bigint generated always as identity primary key,
  title text not null,
  body text,
  created_at timestamptz default now()
);
