// 방문 기록 함수. 사이트가 페이지를 열 때마다 한 번 부른다.
// - 접속 주소(IP)는 저장하지 않고, IP+브라우저+날짜를 섞은 한 방향 암호값(visitor)만 남긴다 → 하루가 지나면 같은 사람인지 알 수 없다.
// - type: 'view'(페이지 열람) / 'chat'(사이트 안에서 바로 답한 챗봇 질문: 장난 질문 안내·고정 답변)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors });
  const ua = req.headers.get('user-agent') ?? '';
  if (/bot|crawl|spider|preview|headless|lighthouse/i.test(ua)) return new Response('skip', { headers: cors });
  let b: Record<string, unknown> = {};
  try {
    b = JSON.parse(await req.text());
  } catch {
    return new Response('bad', { status: 400, headers: cors });
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const visitor = await sha(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}|${Deno.env.get('CHAT_SALT') ?? 'dalnim'}`);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (b.type === 'chat') {
    await sb.from('chat_logs').insert({ q: clip(b.q, 300), answer: clip(b.answer, 800), source: clip(b.source, 20), visitor });
  } else {
    await sb.from('page_views').insert({ path: clip(b.path, 200) || '/', slug: clip(b.slug, 80) || null, ref: clip(b.ref, 80) || null, device: clip(b.device, 10) || null, visitor });
  }
  return new Response('ok', { headers: cors });
});
