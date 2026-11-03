-- 방문 통계와 챗봇 질문 기록 (여러 번 실행해도 안전해요)
-- 기록은 서버 함수(track, ask)만 쓸 수 있고, 관리자는 읽기와 질문 지우기만 할 수 있어요.
-- 접속 주소(IP)는 저장하지 않고, 하루 단위로 바뀌는 암호값(visitor)만 남겨요.

create table if not exists public.page_views (
  id       bigserial primary key,
  ts       timestamptz not null default now(),
  path     text not null,
  slug     text,
  ref      text,
  device   text,
  visitor  text
);
create index if not exists page_views_ts on public.page_views (ts);
alter table public.page_views enable row level security;
drop policy if exists "admin read views" on public.page_views;
create policy "admin read views" on public.page_views for select to authenticated using (true);

create table if not exists public.chat_logs (
  id       bigserial primary key,
  ts       timestamptz not null default now(),
  q        text not null,
  answer   text,
  source   text,
  visitor  text
);
create index if not exists chat_logs_ts on public.chat_logs (ts);
alter table public.chat_logs enable row level security;
drop policy if exists "admin read chats" on public.chat_logs;
create policy "admin read chats" on public.chat_logs for select to authenticated using (true);
drop policy if exists "admin delete chats" on public.chat_logs;
create policy "admin delete chats" on public.chat_logs for delete to authenticated using (true);
