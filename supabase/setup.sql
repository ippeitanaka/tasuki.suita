-- NPO法人TASUKI 管理画面用セットアップ
-- Supabase Dashboard > SQL Editor で一度だけ実行してください。

create table if not exists public.tasuki_news (
  id text primary key,
  title text not null,
  published_on date not null default current_date,
  summary text,
  body text,
  is_published boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  pdf jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasuki_news enable row level security;

-- 公開・管理ともVercel Functions経由でアクセスするため、
-- anon/authenticated向けのRLSポリシーは作成しません。

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tasuki-media',
  'tasuki-media',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
