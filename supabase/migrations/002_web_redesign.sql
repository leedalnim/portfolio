-- 웹 포트폴리오 새 디자인에 필요한 칸과 표
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 한 번 실행하세요. (여러 번 실행해도 안전해요)

-- 1. 프로젝트 표에 새 칸 추가
alter table public.projects add column if not exists kind          text    not null default 'WORK';  -- WORK / NOT WORK
alter table public.projects add column if not exists platform      text    not null default 'WEB';   -- WEB / APP / RESPONSIVE WEB
alter table public.projects add column if not exists filters       text[]  not null default '{}';    -- UX DESIGN, VISUAL DESIGN, AI WORKFLOW, SOLO BUILD
alter table public.projects add column if not exists extra_tags    text[]  not null default '{}';    -- 목록에 같이 보일 기타 태그 (예: GAME, PROPOSAL)
alter table public.projects add column if not exists description   text    not null default '';      -- 상세 맨 위 회색 설명
alter table public.projects add column if not exists contribution  text    not null default '';      -- 기여도 (예: 100%)
alter table public.projects add column if not exists show_on_wall    boolean not null default true;  -- 메인 썸네일 벽에 보이기
alter table public.projects add column if not exists show_on_archive boolean not null default true;  -- 메인 아카이브(10줄)에 보이기
alter table public.projects add column if not exists custom_css    text    not null default '';      -- 이 프로젝트 상세에만 쓰는 CSS

-- 2. 사이트 설정 (메인 문구, 어바웃, 챗봇, PDF) — 한 줄짜리 표
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admin write settings" on public.site_settings;
create policy "admin write settings" on public.site_settings for all to authenticated using (true) with check (true);

-- 3. AI 챗봇 사용 기록 (방문자별 하루 질문 수 제한용)
--    방문자 정보는 접속 주소를 그대로 저장하지 않고 한 방향 암호(해시)로만 저장해요.
create table if not exists public.chat_usage (
  visitor   text not null,
  day       date not null default current_date,
  count     int  not null default 0,
  primary key (visitor, day)
);
alter table public.chat_usage enable row level security;
-- 정책을 만들지 않으면 방문자·관리자 모두 직접 읽거나 쓸 수 없고, 챗봇 함수(서버 키)만 쓸 수 있어요.

-- 4. 오래된 사용 기록 정리 (7일 지난 것) — 챗봇 함수가 가끔 부름
create or replace function public.chat_usage_cleanup() returns void language sql security definer as $$
  delete from public.chat_usage where day < current_date - 7;
$$;

-- 5. 질문 수 세기: 한 번에 1을 더하고 더한 뒤의 수를 돌려준다 (동시에 들어와도 정확하게)
create or replace function public.chat_hit(v text) returns int language sql security definer as $$
  insert into public.chat_usage (visitor, day, count) values (v, current_date, 1)
  on conflict (visitor, day) do update set count = public.chat_usage.count + 1
  returning count;
$$;
revoke all on function public.chat_hit(text) from public, anon, authenticated;
revoke all on function public.chat_usage_cleanup() from public, anon, authenticated;
