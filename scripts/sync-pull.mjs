// Supabase → 저장소
// 관리자 페이지에서 고친 내용을 scripts/sample.json 과 scripts/sample-img 로 받아온다.
// 저장소에서 작업하기 전에 항상 먼저 실행한다.
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL_, SAMPLE, IMG_DIR, BUCKET, LOCAL, SITE_DIR, call, mapImages } from './sb-lib.mjs';

const ORDER = ['slug', 'title', 'title_br', 'summary', 'description', 'category', 'client', 'role', 'period', 'type', 'tags', 'kind', 'platform', 'extra_tags', 'filters', 'contribution', 'show_on_wall', 'show_on_archive', 'wall_order', 'thumbnail', 'sections', 'published', 'sort_order', 'custom_css'];
const rows = await (await call('/rest/v1/projects?select=*&order=sort_order.asc')).json();

await fs.mkdir(IMG_DIR, { recursive: true });
let n = 0;
const projects = [];
for (const r of rows) {
  const jobs = [];
  const p = mapImages(r, (v) => {
    if (!v || /^https?:|^local:/.test(v)) return v;
    // site/ 폴더는 원래 저장소 이름 그대로, 관리자에서 올린 건 폴더 구분을 __ 로 바꿔 이름이 겹치지 않게
    const f = v.startsWith(SITE_DIR) ? v.slice(SITE_DIR.length) : v.replace(/\//g, '__');
    jobs.push([v, f]);
    return LOCAL + f;
  });
  for (const [v, f] of jobs) {
    const dst = path.join(IMG_DIR, f);
    const r2 = await fetch(`${URL_}/storage/v1/object/public/${BUCKET}/${v.split('/').map(encodeURIComponent).join('/')}`);
    if (!r2.ok) {
      console.warn(`이미지를 받지 못했어요: ${v} (${r2.status})`);
      continue;
    }
    const buf = Buffer.from(await r2.arrayBuffer());
    const old = await fs.readFile(dst).catch(() => null);
    if (!old || !old.equals(buf)) {
      await fs.writeFile(dst, buf);
      n++;
    }
  }
  const out = {};
  for (const k of ORDER) if (p[k] !== undefined && p[k] !== null) out[k] = p[k];
  for (const k of Object.keys(p)) if (!(k in out) && !['id', 'updated_at'].includes(k) && p[k] !== null) out[k] = p[k];
  projects.push(out);
}
await fs.writeFile(SAMPLE, JSON.stringify(projects, null, 2) + '\n');
console.log(`프로젝트 ${projects.length}개, 바뀐 이미지 ${n}개 받아옴`);
