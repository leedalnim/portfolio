-- 챗봇 질문 수 확인만 하는 함수 (더하지 않음)
-- 한도에 걸린 질문까지 횟수에 쌓이지 않도록, 함수에서 먼저 확인하고 통과할 때만 chat_hit 으로 더한다.
create or replace function public.chat_peek(v text) returns int language sql security definer as $$
  select coalesce((select count from public.chat_usage where visitor = v and day = current_date), 0);
$$;
revoke all on function public.chat_peek(text) from public, anon, authenticated;
