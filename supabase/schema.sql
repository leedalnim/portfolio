-- 포트폴리오 관리자용 Supabase 설정
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행하세요.

-- 1. 프로젝트 표
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null default '',
  summary     text not null default '',
  category    text not null default '',
  client      text not null default '',
  role        text not null default '',
  period      text not null default '',
  type        text not null default '',
  tags        text[] not null default '{}',
  thumbnail   text,
  sections    jsonb not null default '[]'::jsonb,  -- [{id, heading, body, layout, images:[{path, caption}]}]
  published   boolean not null default false,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

-- 방문자(로그인 안 함)는 공개된 프로젝트만 읽을 수 있음 → 사이트를 만들 때 이 권한으로 읽어감
drop policy if exists "public read published" on public.projects;
create policy "public read published" on public.projects
  for select to anon using (published);

-- 로그인한 관리자는 전부 읽고 쓰기
-- ⚠️ Authentication > Sign In / Providers 에서 '새 회원가입 허용'을 반드시 꺼 두세요.
--    꺼 두지 않으면 아무나 가입해서 관리자 권한을 얻을 수 있어요.
drop policy if exists "admin all" on public.projects;
create policy "admin all" on public.projects
  for all to authenticated using (true) with check (true);

-- 2. 이미지 저장소 (공개 읽기)
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

drop policy if exists "admin upload" on storage.objects;
create policy "admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio');

drop policy if exists "admin update" on storage.objects;
create policy "admin update" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio');

drop policy if exists "admin delete" on storage.objects;
create policy "admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio');
