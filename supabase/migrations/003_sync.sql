-- 저장소(sample.json)와 Supabase를 맞추기 위해 프로젝트 표에 칸 2개를 더한다
-- (여러 번 실행해도 안전해요)
alter table public.projects add column if not exists title_br   text;  -- 상세 큰 제목 줄바꿈 버전 (예: '자원순환\n마루')
alter table public.projects add column if not exists wall_order int;   -- 메인 썸네일 벽 순서 (작을수록 앞)
