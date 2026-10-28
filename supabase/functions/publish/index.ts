// '사이트에 반영' 버튼이 부르는 함수.
// POST: 깃헙에 사이트를 다시 만들라는 신호(repository_dispatch)를 보낸다.
// GET : 가장 최근 배포 작업의 상태를 돌려준다.
// 깃헙 토큰(GITHUB_TOKEN)은 이 함수의 비밀 값으로만 보관하고, 관리자 화면에는 노출하지 않는다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // 로그인한 관리자만 허용 (공개 키만 가진 요청은 거절)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user) return json({ error: 'unauthorized' }, 401);

  const repo = Deno.env.get('GITHUB_REPO') ?? 'leedalnim/portfolio';
  const token = Deno.env.get('GITHUB_TOKEN');
  if (!token) return json({ error: 'GITHUB_TOKEN 비밀 값이 설정되지 않았어요.' }, 500);
  const gh = (path: string, init: RequestInit = {}) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'portfolio-admin',
      },
    });

  if (req.method === 'POST') {
    const r = await gh('/dispatches', { method: 'POST', body: JSON.stringify({ event_type: 'publish' }) });
    if (r.status !== 204) return json({ error: 'github', status: r.status, detail: await r.text() }, 502);
    return json({ ok: true });
  }

  const r = await gh('/actions/workflows/deploy.yml/runs?per_page=1');
  if (!r.ok) return json({ error: 'github', status: r.status }, 502);
  const run = (await r.json()).workflow_runs?.[0];
  return json(run ? { status: run.status, conclusion: run.conclusion, created_at: run.created_at, url: run.html_url } : null);
});
