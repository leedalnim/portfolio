// 저장소 ↔ Supabase 동기화 공통 도구
// 키는 깃헙 Actions 비밀값(SUPABASE_SECRET_KEY)으로만 받는다. 저장소에는 절대 적지 않는다.
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const SAMPLE = path.join(ROOT, 'scripts', 'sample.json');
export const IMG_DIR = path.join(ROOT, 'scripts', 'sample-img');
export const BUCKET = 'portfolio';
export const LOCAL = 'local:scripts/sample-img/';
// 저장소에서 올린 이미지는 버킷 안 site/ 폴더에 둔다 (관리자 페이지에서 올린 이미지와 구분)
export const SITE_DIR = 'site/';

export const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) {
  console.error('SUPABASE_URL 과 SUPABASE_SECRET_KEY 가 필요해요.');
  process.exit(1);
}
// 새 형식 키(sb_secret_…)는 apikey 머리말만, 예전 형식(JWT)은 Authorization 도 함께
export const headers = (extra = {}) => ({ apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}), ...extra });

export async function call(p, init = {}) {
  const r = await fetch(`${URL_}${p}`, { ...init, headers: headers(init.headers) });
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${p} → ${r.status} ${await r.text()}`);
  return r;
}

// 프로젝트 안의 모든 이미지 경로를 바꾼다 (썸네일 + 섹션 이미지)
export function mapImages(p, fn) {
  const q = structuredClone(p);
  if (q.thumbnail) q.thumbnail = fn(q.thumbnail);
  for (const s of q.sections || []) for (const im of s.images || []) if (im.path) im.path = fn(im.path);
  return q;
}
