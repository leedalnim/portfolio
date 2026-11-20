// AI 챗봇 오늘 질문 수 초기화
// 방문자별 · 사이트 전체 오늘 기록(chat_usage)을 지운다. 질문 내용 기록(chat_logs)은 건드리지 않는다.
// 챗봇 함수가 날짜를 UTC 기준으로 세므로 여기서도 UTC 날짜를 쓴다 (한국 시간 오전 9시에 날짜가 바뀜).
import { call } from './sb-lib.mjs';

const day = new Date().toISOString().slice(0, 10);
const r = await call(`/rest/v1/chat_usage?day=eq.${day}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
const rows = await r.json();
const lines = [`## 챗봇 질문 수 초기화 (${day} UTC)`, `- 지운 기록: ${rows.length}건`];
for (const x of rows) lines.push(`- ${x.visitor === '__site__' ? '사이트 전체' : '방문자 ' + String(x.visitor).slice(0, 8)}: ${x.count}회 → 0회`);
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  const fs = await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}
