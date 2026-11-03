// 저장소 → Supabase
// scripts/sample.json 의 프로젝트와 scripts/sample-img 의 이미지를 Supabase에 올린다.
// - 프로젝트는 slug 기준으로 덮어쓴다 (관리자 페이지에서만 있는 프로젝트는 건드리지 않음, 지우지도 않음)
// - 이미지는 버킷의 site/ 폴더에 같은 이름으로 올린다
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { SAMPLE, IMG_DIR, BUCKET, LOCAL, SITE_DIR, call, mapImages } from './sb-lib.mjs';

const projects = JSON.parse(await fs.readFile(SAMPLE, 'utf8'));
const files = new Set();
// 같은 이름으로 이미지를 바꿔도 사이트가 옛 이미지를 쓰지 않도록, 올리는 이름에 내용 해시(8자)를 붙인다
const hashed = new Map();
for (const p of projects) mapImages(p, (v) => (v.startsWith(LOCAL) && files.add(v.slice(LOCAL.length)), v));
for (const f of files) {
  const h = crypto.createHash('sha1').update(await fs.readFile(path.join(IMG_DIR, f))).digest('hex').slice(0, 8);
  const i = f.lastIndexOf('.');
  hashed.set(f, `${f.slice(0, i)}-${h}${f.slice(i)}`);
}
const rows = projects.map((p) => mapImages(p, (v) => (v.startsWith(LOCAL) ? SITE_DIR + hashed.get(v.slice(LOCAL.length)) : v)));

const type = (f) => ({ webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' })[f.split('.').pop().toLowerCase()] || 'application/octet-stream';
let n = 0;
for (const f of files) {
  const buf = await fs.readFile(path.join(IMG_DIR, f));
  await call(`/storage/v1/object/${BUCKET}/${SITE_DIR}${encodeURIComponent(hashed.get(f))}`, {
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

// 사이트 설정: scripts/settings.json 이 있으면 그 내용으로 올리고,
// 없으면 DB가 비어 있을 때만 기본값(admin/src/defaults.js)으로 채운다.
const SETTINGS = path.join(path.dirname(SAMPLE), 'settings.json');
let data = await fs.readFile(SETTINGS, 'utf8').then(JSON.parse, () => null);
if (!data) {
  const cur = await (await call('/rest/v1/site_settings?id=eq.1&select=data')).json();
  if (!cur[0] || !Object.keys(cur[0].data || {}).length) data = (await import('../admin/src/defaults.js')).DEFAULT_SETTINGS;
}
if (data) {
  await call('/rest/v1/site_settings?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, data, updated_at: new Date().toISOString() }),
  });
  console.log('사이트 설정 올림');
} else console.log('사이트 설정은 그대로 둠');
