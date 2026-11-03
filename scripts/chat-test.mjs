// 챗봇 점검용 (임시): 면접 질문을 보내고 답을 출력한다
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const Q = [
  '간단하게 자기소개 부탁드립니다.',
  '저희가 공공기관 프로젝트를 많이 하는데, 비슷한 경험을 말씀해 주세요.',
  '중구청 AI 검색 프로젝트에서 맡은 역할은 무엇이었나요?',
  '클라이언트가 시안을 여러 번 반려하면 어떻게 하시나요?',
  '기획 쪽으로도 커리어를 넓히고 싶다고 하셨는데, 기획 경험이 있나요?',
  '디자이너로서 본인의 단점은 무엇이라고 생각하세요?',
  '반응형 웹 작업에서 가장 신경 쓰는 점은 무엇인가요?',
  '희망 연봉은 어느 정도 생각하세요?',
  '오늘 서울 날씨 어때요?',
  '개발자에게 디자인을 넘길 때는 어떤 방식으로 하나요?',
];
for (const [i, q] of Q.entries()) {
  const t = Date.now();
  const r = await fetch(`${URL_}/functions/v1/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ q }) });
  const j = await r.json().catch(() => ({}));
  console.log(`\n### ${i + 1}. ${q}\n상태 ${r.status} · ${((Date.now() - t) / 1000).toFixed(1)}초\n답: ${(j.answer || j.error || '').replace(/\n+/g, ' ')}\n관련: ${(j.related || []).join(', ') || '-'}`);
}
