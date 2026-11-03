// 챗봇 점검용: 면접 질문 10개를 보내고 답을 출력한다 (깃헙 Actions에서 한 번 돌리고 지움)
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const Q = [
  '본인 소개를 간단히 해주세요.',
  '가장 자신 있는 프로젝트는 무엇이고, 이유는 뭔가요?',
  '공공기관 프로젝트를 하면서 어려웠던 점은 무엇이었나요?',
  '디자인 시스템을 만들어 본 경험이 있나요?',
  '퍼블리싱도 직접 하시나요?',
  '웹 접근성은 어떻게 고려하나요?',
  '기획자나 개발자와는 어떻게 협업하나요?',
  'AI를 실제 업무에 어떻게 활용했나요?',
  '반응형 웹이나 모바일 작업 경험이 있나요?',
  '앞으로 어떤 디자이너가 되고 싶나요?',
];
for (const [i, q] of Q.entries()) {
  const t = Date.now();
  const r = await fetch(`${URL_}/functions/v1/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ q }) });
  const j = await r.json().catch(() => ({}));
  console.log(`\n### ${i + 1}. ${q}\n상태 ${r.status} · ${((Date.now() - t) / 1000).toFixed(1)}초\n답: ${j.answer || j.error}\n관련: ${(j.related || []).join(', ') || '-'}`);
}
