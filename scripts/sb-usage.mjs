// Supabase 사용량 확인 (읽기 전용) — 저장소 버킷 파일 크기 합계와 표 행 수를 센다
import { URL_, BUCKET, call } from './sb-lib.mjs';
import fs from 'node:fs/promises';

async function list(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await call(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, offset }) });
    const items = await r.json();
    for (const it of items) {
      if (it.id === null) out.push(...await list(prefix + it.name + '/'));
      else out.push({ path: prefix + it.name, size: it.metadata?.size || 0 });
    }
    if (items.length < 1000) break;
  }
  return out;
}
const files = await list('');
const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';
const byDir = {};
for (const f of files) { const d = f.path.includes('/') ? f.path.split('/')[0] : '(최상위)'; byDir[d] = byDir[d] || { n: 0, b: 0 }; byDir[d].n++; byDir[d].b += f.size; }
const total = files.reduce((a, f) => a + f.size, 0);
const lines = [`## Supabase 사용량`, ``, `- 저장소(버킷 ${BUCKET}): 파일 ${files.length}개, ${mb(total)} / 무료 한도 1GB`];
for (const [d, v] of Object.entries(byDir)) lines.push(`  - ${d}/: ${v.n}개, ${mb(v.b)}`);
for (const t of ['projects', 'settings']) {
  try { const r = await call(`/rest/v1/${t}?select=*`, { headers: { Prefer: 'count=exact', Range: '0-0' } }); lines.push(`- 표 ${t}: ${r.headers.get('content-range')?.split('/')[1]}행`); } catch (e) { lines.push(`- 표 ${t}: 확인 못 함`); }
}
const txt = lines.join('\n');
console.log(txt);
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, txt + '\n');
