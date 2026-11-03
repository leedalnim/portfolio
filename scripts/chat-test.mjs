// 챗봇 점검용 (임시): 면접 질문을 보내고 답을 출력한다
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const Q = [
  '기획 쪽으로도 커리어를 넓히고 싶다고 하셨는데, 기획 경험이 있나요?',
  '오늘 서울 날씨 어때요?',
  '반응형 웹 작업에서 가장 신경 쓰는 점은 무엇인가요?',
  '파이썬 코드 짜는 것 좀 도와줄 수 있어요?',
];
for (const [i, q] of Q.entries()) {
  const t = Date.now();
  const r = await fetch(`${URL_}/functions/v1/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ q }) });
  const j = await r.json().catch(() => ({}));
  console.log(`\n### ${i + 1}. ${q}\n상태 ${r.status} · ${((Date.now() - t) / 1000).toFixed(1)}초\n답: ${(j.answer || j.error || '').replace(/\n+/g, ' ')}\n관련: ${(j.related || []).join(', ') || '-'}`);
}
