// 방문자용 정적 사이트를 만든다.
// 1) Supabase에서 '공개' 프로젝트를 읽는다 (설정이 없으면 샘플 데이터 사용)
// 2) 이미지를 내려받아 WebP 960/1920px 두 가지로 줄인다 (.cache에 보관해 다음 배포 때 다시 받지 않음)
// 3) dist/ 에 홈과 프로젝트 상세 HTML을 쓴다
// ※ 화면 디자인은 임시. 홈페이지 디자인이 나오면 아래 template 부분만 바꾸면 된다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache', 'img');
const BASE = (process.env.BASE_PATH || '/portfolio/').replace(/\/?$/, '/');
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const WIDTHS = [960, 1920];
const BUCKET = 'portfolio';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');

async function loadProjects() {
  if (!SB_URL || !SB_KEY) {
    console.log('[site] Supabase 설정이 없어 샘플 데이터로 만듭니다.');
    return JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'sample.json'), 'utf8'));
  }
  const r = await fetch(`${SB_URL}/rest/v1/projects?published=eq.true&order=sort_order.asc`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`프로젝트를 불러오지 못했어요: ${r.status} ${await r.text()}`);
  return r.json();
}

const done = new Map();
async function image(p) {
  if (!p) return null;
  if (done.has(p)) return done.get(p);
  const id = crypto.createHash('sha1').update(p).digest('hex').slice(0, 16);
  const out = { id, files: [] };
  await fs.mkdir(CACHE, { recursive: true });
  const cached = await Promise.all(WIDTHS.map((w) => fs.stat(path.join(CACHE, `${id}-${w}.webp`)).then(() => true, () => false)));
  if (!cached.every(Boolean)) {
    const url = /^https?:/.test(p) ? p : `${SB_URL}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`[site] 이미지를 받지 못했어요: ${p} (${r.status})`);
      done.set(p, null);
      return null;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    for (const w of WIDTHS) {
      await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(CACHE, `${id}-${w}.webp`));
    }
  }
  const meta = await sharp(path.join(CACHE, `${id}-${WIDTHS[1]}.webp`)).metadata();
  await fs.mkdir(path.join(DIST, 'img'), { recursive: true });
  for (const w of WIDTHS) await fs.copyFile(path.join(CACHE, `${id}-${w}.webp`), path.join(DIST, 'img', `${id}-${w}.webp`));
  out.w = meta.width;
  out.h = meta.height;
  done.set(p, out);
  return out;
}

function pic(im, alt = '', sizes = '(max-width: 960px) 100vw, 960px', eager = false) {
  if (!im) return '<div class="ph"></div>';
  const src = (w) => `${BASE}img/${im.id}-${w}.webp`;
  return `<img src="${src(960)}" srcset="${src(960)} 960w, ${src(1920)} 1920w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

const css = `
:root{--bg:#fafafa;--ink:#16181c;--sub:#5c626b;--line:#e4e6ea;--accent:#1a29ee}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}img{display:block;max-width:100%;height:auto}
.wrap{max-width:1200px;margin:0 auto;padding:0 max(20px,env(safe-area-inset-left)) 0 max(20px,env(safe-area-inset-right))}
header.top{padding:28px 0;display:flex;justify-content:space-between;align-items:center}
header.top a{text-decoration:none;font-weight:700}
.hero{padding:64px 0 40px}.hero h1{font-size:clamp(32px,5vw,56px);line-height:1.15;letter-spacing:-.03em;margin:0}
.hero p{color:var(--sub);margin:16px 0 0}
.cat{margin:56px 0 0}.cat h2{font-size:14px;letter-spacing:.04em;color:var(--sub);font-weight:600;margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:28px}
.card{text-decoration:none;display:flex;flex-direction:column;gap:12px}
.card .th{aspect-ratio:16/10;overflow:hidden;border-radius:12px;background:#eee}.card .th img{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform .4s}
.card:hover .th img{transform:scale(1.03)}.card strong{font-size:18px;letter-spacing:-.01em}.card span{color:var(--sub);font-size:14px}
.ph{aspect-ratio:16/10;background:#eceef1;border-radius:12px}
.p-head{padding:56px 0 32px}.p-head .chip{font-size:13px;color:var(--accent);font-weight:600}
.p-head h1{font-size:clamp(30px,4.5vw,48px);line-height:1.2;letter-spacing:-.03em;margin:8px 0 0}.p-head p{color:var(--sub);font-size:18px;margin:12px 0 0}
dl.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:32px 0 0;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
dl.meta dt{font-size:12px;color:var(--sub)}dl.meta dd{margin:2px 0 0;font-weight:600}
.cover{margin:40px 0}.cover img{border-radius:16px}
.sec{margin:80px 0}.sec h2{font-size:26px;letter-spacing:-.02em;margin:0}.sec .body{color:var(--sub);max-width:680px;margin:12px 0 28px}
.gal{display:grid;gap:20px}.gal.c2{grid-template-columns:repeat(2,minmax(0,1fr))}.gal.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.gal figure{margin:0}.gal img{border-radius:12px;border:1px solid var(--line);background:#fff}.gal figcaption{font-size:14px;color:var(--sub);margin-top:8px}
footer{padding:64px 0;color:var(--sub);font-size:13px}
@media(max-width:720px){.gal.c2,.gal.c3{grid-template-columns:1fr}}
`;

const page = (title, body) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><link rel="stylesheet" href="${BASE}fonts/pretendardvariable-dynamic-subset.css"><style>${css}</style></head>
<body><div class="wrap"><header class="top"><a href="${BASE}">leedalnim</a></header>${body}<footer>© 이달님</footer></div></body></html>`;

async function main() {
  const projects = await loadProjects();
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await fs.cp(path.join(ROOT, 'node_modules/pretendard/dist/web/variable/woff2-dynamic-subset'), path.join(DIST, 'fonts/woff2-dynamic-subset'), { recursive: true });
  await fs.copyFile(path.join(ROOT, 'node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'), path.join(DIST, 'fonts/pretendardvariable-dynamic-subset.css'));

  for (const p of projects) {
    p._thumb = await image(p.thumbnail);
    for (const s of p.sections || []) for (const im of s.images || []) im._img = await image(im.path);
  }

  const cats = [...new Set(projects.map((p) => p.category))];
  const home = `<section class="hero"><h1>포트폴리오</h1><p>프로젝트 ${projects.length}개</p></section>
${cats
  .map(
    (c) => `<section class="cat"><h2>${esc(c)}</h2><div class="grid">${projects
      .filter((p) => p.category === c)
      .map((p) => `<a class="card" href="${BASE}projects/${esc(p.slug)}/"><div class="th">${pic(p._thumb, p.title, '(max-width: 720px) 100vw, 400px')}</div><strong>${esc(p.title)}</strong><span>${esc(p.summary)}</span></a>`)
      .join('')}</div></section>`,
  )
  .join('')}`;
  await fs.writeFile(path.join(DIST, 'index.html'), page('leedalnim 포트폴리오', home));

  for (const p of projects) {
    const meta = [
      ['클라이언트', p.client],
      ['역할', p.role],
      ['유형', p.type],
      ['기간', p.period],
      ['사용', (p.tags || []).join(', ')],
    ].filter(([, v]) => v);
    const body = `<section class="p-head"><span class="chip">${esc(p.category)}</span><h1>${esc(p.title)}</h1>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
<dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${p._thumb ? `<div class="cover">${pic(p._thumb, p.title, '(max-width: 1200px) 100vw, 1200px', true)}</div>` : ''}
${(p.sections || [])
  .map(
    (s) => `<section class="sec">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.body ? `<p class="body">${nl2br(s.body)}</p>` : ''}
<div class="gal c${esc(s.layout || '1')}">${(s.images || [])
      .map((im) => `<figure>${pic(im._img, im.caption, s.layout === '1' ? '(max-width: 1200px) 100vw, 1200px' : '(max-width: 720px) 100vw, 600px')}${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>`)
      .join('')}</div></section>`,
  )
  .join('')}`;
    const dir = path.join(DIST, 'projects', p.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), page(`${p.title} — leedalnim`, body));
  }

  await fs.writeFile(path.join(DIST, '404.html'), page('페이지를 찾을 수 없어요', `<section class="hero"><h1>페이지를 찾을 수 없어요</h1><p><a href="${BASE}">처음으로</a></p></section>`));
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');
  console.log(`[site] 프로젝트 ${projects.length}개, 이미지 ${[...done.values()].filter(Boolean).length}장으로 만들었어요.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
