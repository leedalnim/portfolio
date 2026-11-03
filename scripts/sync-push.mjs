// 저장소 → Supabase
// scripts/sample.json 의 프로젝트와 scripts/sample-img 의 이미지를 Supabase에 올린다.
// - 프로젝트는 slug 기준으로 덮어쓴다 (관리자 페이지에서만 있는 프로젝트는 건드리지 않음, 지우지도 않음)
// - 이미지는 버킷의 site/ 폴더에 같은 이름으로 올린다
import fs from 'node:fs/promises';
import path from 'node:path';
import { SAMPLE, IMG_DIR, BUCKET, LOCAL, SITE_DIR, call, mapImages } from './sb-lib.mjs';

const projects = JSON.parse(await fs.readFile(SAMPLE, 'utf8'));
const files = new Set();
const rows = projects.map((p) =>
  mapImages(p, (v) => {
    if (!v.startsWith(LOCAL)) return v;
    const f = v.slice(LOCAL.length);
    files.add(f);
    return SITE_DIR + f;
  }),
);

const type = (f) => ({ webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' })[f.split('.').pop().toLowerCase()] || 'application/octet-stream';
let n = 0;
for (const f of files) {
  const buf = await fs.readFile(path.join(IMG_DIR, f));
  await call(`/storage/v1/object/${BUCKET}/${SITE_DIR}${encodeURIComponent(f)}`, {
    method: 'POST',
    headers: { 'Content-Type': type(f), 'x-upsert': 'true', 'cache-control': '3600' },
    body: buf,
  });
  n++;
}
console.log(`이미지 ${n}개 올림`);

await call('/rest/v1/projects?on_conflict=slug', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(rows.map(({ id, ...r }) => ({ ...r, updated_at: new Date().toISOString() }))),
});
console.log(`프로젝트 ${rows.length}개 올림`);
