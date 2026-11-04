-- 상세 페이지 '사이트 방문' 버튼용 실제 사이트 주소
alter table public.projects add column if not exists site_url text not null default '';
