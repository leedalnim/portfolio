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

// 프로젝트마다 가진 칸이 조금씩 달라서(예: title_br) 한 줄씩 올린다
for (const { id, ...r } of rows) {
  await call('/rest/v1/projects?on_conflict=slug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...r, updated_at: new Date().toISOString() }),
  });
}
console.log(`프로젝트 ${rows.length}개 올림`);

// 사이트 설정이 아직 비어 있으면 기본값(admin/src/defaults.js)으로 한 번 채운다.
// 관리자 페이지에서 한 번이라도 저장했다면 건드리지 않는다.
const { DEFAULT_SETTINGS } = await import('../admin/src/defaults.js');
const cur = await (await call('/rest/v1/site_settings?id=eq.1&select=data')).json();
if (!cur[0] || !Object.keys(cur[0].data || {}).length) {
  await call('/rest/v1/site_settings?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, data: DEFAULT_SETTINGS, updated_at: new Date().toISOString() }),
  });
  console.log('사이트 설정 기본값을 채움');
} else console.log('사이트 설정은 이미 있어서 그대로 둠');
