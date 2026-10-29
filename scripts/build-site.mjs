// 방문자용 정적 사이트를 만든다.
// 1) 프로젝트와 사이트 설정을 읽는다
//    - 지금은 화면 모양을 잡는 단계라 기본값으로 샘플 데이터(scripts/sample.json)를 쓴다.
//    - 실제 데이터로 바꿀 때는 깃헙 Actions 변수 SITE_DATA 를 'live' 로 바꾸면 Supabase 공개 프로젝트를 읽는다.
// 2) 이미지를 WebP 960/1920px 과 모자이크용 작은 이미지로 줄인다 (.cache에 보관)
// 3) dist/ 에 메인, 프로젝트 목록, 상세, 어바웃, AI 답변, 404 를 쓴다
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { DEFAULT_SETTINGS, FILTER_KEYS } from '../admin/src/defaults.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache', 'img');
const BASE = (process.env.BASE_PATH || '/portfolio/').replace(/\/?$/, '/');
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
const DATA = process.env.SITE_DATA || 'sample';
const WIDTHS = [960, 1920];
const BUCKET = 'portfolio';
const FILTERS = Object.keys(FILTER_KEYS);
const V = Date.now().toString(36); // 캐시 무효화용

const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nb = (s = '') => esc(s).replace(/ /g, '&nbsp;'); // 태그 안에서 줄이 끊기지 않게
const cs = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');

async function sb(pathQ) {
  const r = await fetch(`${SB_URL}/rest/v1/${pathQ}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`Supabase에서 읽지 못했어요: ${r.status} ${await r.text()}`);
  return r.json();
}

function mergeSettings(saved) {
  const d = structuredClone(DEFAULT_SETTINGS);
  for (const k of Object.keys(d)) if (saved?.[k] !== undefined) d[k] = typeof d[k] === 'object' && !Array.isArray(d[k]) ? { ...d[k], ...saved[k] } : saved[k];
  return d;
}

async function load() {
  const hasSb = SB_URL && SB_KEY;
  let settings = DEFAULT_SETTINGS;
  if (hasSb) {
    try {
      const rows = await sb('site_settings?id=eq.1&select=data');
      settings = mergeSettings(rows[0]?.data);
    } catch (e) {
      console.warn('[site] 사이트 설정 표가 아직 없어 기본값을 써요.');
    }
  }
  if (DATA === 'live' && hasSb) {
    const projects = await sb('projects?published=eq.true&order=sort_order.asc');
    if (projects.length) return { projects, settings, live: true };
    console.warn('[site] 공개 프로젝트가 없어 샘플 데이터로 만들어요.');
  }
  const projects = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'sample.json'), 'utf8'));
  return { projects, settings, live: false };
}

/* ---------------- 이미지 ---------------- */
const done = new Map();
async function image(p) {
  if (!p) return null;
  if (done.has(p)) return done.get(p);
  const id = crypto.createHash('sha1').update(p).digest('hex').slice(0, 16);
  await fs.mkdir(CACHE, { recursive: true });
  const files = [...WIDTHS.map((w) => `${id}-${w}.webp`), `${id}-px.webp`];
  const cached = await Promise.all(files.map((f) => fs.stat(path.join(CACHE, f)).then(() => true, () => false)));
  if (!cached.every(Boolean)) {
    let buf;
    if (p.startsWith('local:')) buf = await fs.readFile(path.join(ROOT, p.slice(6)));
    else {
      const url = /^https?:/.test(p) ? p : `${SB_URL}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`[site] 이미지를 받지 못했어요: ${p} (${r.status})`);
        done.set(p, null);
        return null;
      }
      buf = Buffer.from(await r.arrayBuffer());
    }
    for (const w of WIDTHS) await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(CACHE, `${id}-${w}.webp`));
    // 모자이크용: 가로 28칸으로 줄인 아주 작은 이미지 (화면에서 키우면 칸이 보임)
    await sharp(buf).resize({ width: 28, height: 20, fit: 'cover', position: 'top' }).webp({ quality: 90 }).toFile(path.join(CACHE, `${id}-px.webp`));
  }
  const meta = await sharp(path.join(CACHE, `${id}-${WIDTHS[1]}.webp`)).metadata();
  await fs.mkdir(path.join(DIST, 'img'), { recursive: true });
  for (const f of files) await fs.copyFile(path.join(CACHE, f), path.join(DIST, 'img', f));
  const out = { id, w: meta.width, h: meta.height };
  done.set(p, out);
  return out;
}
const src = (im, w = 960) => `${BASE}img/${im.id}-${w}.webp`;
function pic(im, alt = '', sizes = '(max-width: 1023px) 100vw, 50vw', eager = false, cls = '') {
  if (!im) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${src(im)}" srcset="${src(im)} 960w, ${src(im, 1920)} 1920w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

/* ---------------- 공통 조각 ---------------- */
const tagLine = (p) => [p.kind, p.platform, ...(p.extra_tags || []), ...(p.filters || [])].filter(Boolean);
const href = (p) => `${BASE}projects/${p.slug}/`;

function header(active) {
  const a = (k) => (active === k ? ' aria-current="page"' : '');
  return `<header class="hd"><a class="logo" href="${BASE}" data-nav>DALNIM</a>
<nav class="nav" aria-label="주 메뉴">${active === 'ask' ? `<a class="back" href="${BASE}" data-back>← Back</a>` : ''}<a href="${BASE}projects/"${a('projects')} data-nav>Projects</a><a href="${BASE}about/"${a('about')} data-nav>About</a><a class="pdf" href="__PDF__" target="_blank" rel="noopener">PDF Download ↓</a></nav>
<button class="menu-btn" type="button" aria-controls="menu" aria-expanded="false" data-menu>Menu <i aria-hidden="true"></i></button></header>`;
}
function menu(count) {
  return `<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="전체 메뉴"><div class="mtop"><a class="logo" href="${BASE}" data-nav>DALNIM</a><button class="close" type="button" data-menu-close>Close <span class="x" aria-hidden="true"></span></button></div>
<nav><a href="${BASE}projects/" data-nav>Projects<sup>${count}</sup><span>→</span></a><a href="${BASE}about/" data-nav>About<span>→</span></a></nav>
<a class="btn-pdf light" href="__PDF__" target="_blank" rel="noopener">PDF Download ↓</a>
<div class="foot"><b>${FILTERS.join(' · ')}</b>© 2026 이달님. All rights reserved.</div></div>`;
}
const footer = () => `<footer class="ft"><div><a class="logo" href="${BASE}" data-nav>DALNIM</a><small>© 2026 이달님. All rights reserved.</small></div><div class="r"><a href="__PDF__" target="_blank" rel="noopener">PDF Download ↓</a></div></footer>
<button class="to-top" type="button" data-top aria-label="맨 위로">Top ↑</button>`;

// 큰 제목: 줄마다 같은 글자 두 장(선명 + 흐림)을 겹쳐 끝부분만 흐려 보이게
// 큰 제목: 피그마의 점진 블러를 그대로 살린 이미지 (site/title, scripts/make-titles.py 로 생성)
const TITLE_META = JSON.parse(await fs.readFile(path.join(ROOT, 'site/title/meta.json'), 'utf8'));
function imgTitle(name, alt) {
  const keys = Object.keys(TITLE_META).filter((k) => k === `pc-${name}` || k.startsWith(`pc-${name}-`) || k === `mo-${name}` || k.startsWith(`mo-${name}-`));
  const img = (k, i) => {
    const m = TITLE_META[k];
    return `<img class="${k.slice(0, 2)}" src="${BASE}assets/title/${k}.webp?v=${V}" alt="" width="${m.w}" height="${m.h}" style="--x:${m.x};--y:${m.y};--w:${m.w};--i:${i}" decoding="async" fetchpriority="high">`;
  };
  return `<h1 class="ttl ti"><span class="sr">${esc(alt)}</span>${keys.map((k) => img(k, +(k.split('-')[2] || 1) - 1)).join('')}</h1>`;
}
function title(lines, o = {}) {
  return `<h1 class="ttl"${o.style ? ` style="${o.style}"` : ''}><span class="sr">${esc(lines.join(''))}</span>${lines
    .map((t, i) => `<span class="ln" aria-hidden="true"><span class="bt" style="--i:${i}${o.fs ? `;--fs:${o.fs[i] ?? o.fs[0]}` : ''}"><span class="a">${esc(t)}</span><span class="b">${esc(t)}</span></span></span>`)
    .join('')}</h1>`;
}
// 칩: PC는 Figma 좌표 그대로, 모바일은 위·아래 두 묶음
function chips(pos, counts, link = true) {
  const one = (name, i) => {
    const [x, y] = pos[name];
    const n = counts ? `<sup>${counts[name] ?? 0}</sup>` : '';
    const tag = link ? 'a' : 'span';
    const at = link ? ` href="${BASE}projects/?f=${FILTER_KEYS[name]}" data-chip="${FILTER_KEYS[name]}"` : '';
    return `<${tag} class="chip"${at} style="--x:${x};--y:${y};--i:${i}">${esc(name)}${n}</${tag}>`;
  };
  return `<div class="cg t">${one('UX DESIGN', 0)}${one('VISUAL DESIGN', 1)}</div><div class="cg b">${one('AI WORKFLOW', 2)}${one('SOLO BUILD', 3)}</div>`;
}

function page({ title: t, body, active, settings, count, extra = '', desc }) {
  const pdf = settings.pdf?.url || '';
  const cfg = {
    base: BASE,
    ask: SB_URL ? `${SB_URL}/functions/v1/ask` : '',
    key: SB_KEY || '',
    chat: { fallback: settings.chat.fallback, limit: settings.chat.limit_message, faq: settings.chat.faq, enabled: settings.chat.enabled, followups: settings.chat.followups || [] },
  };
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(t)}</title><meta name="description" content="${esc(desc || 'UI/UX 디자이너 이달님의 포트폴리오')}">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(desc || 'UI/UX 디자이너 이달님의 포트폴리오')}"><meta name="theme-color" content="#FAF9F7">
<link rel="preload" href="${BASE}fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${BASE}fonts/pretendardvariable-dynamic-subset.css"><link rel="stylesheet" href="${BASE}assets/style.css?v=${V}">
<script>window.SITE=${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script><script src="${BASE}assets/app.js?v=${V}" defer></script></head>
<body>${header(active)}<main id="main">${body}</main>${footer()}${menu(count)}
<div class="layer" id="layer" aria-hidden="true"><div class="scroll" role="dialog" aria-modal="true" aria-label="프로젝트 상세"></div></div>
<div class="blinds" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<i style="--n:${k}"></i>`).join('')}</div>${extra}</body></html>`;
  // PDF를 아직 안 올렸으면 버튼은 그대로 두고 눌러도 아무 일 없게 (준비 중)
  if (!pdf) return html.replaceAll('href="__PDF__" target="_blank" rel="noopener"', 'href="#" aria-disabled="true" data-pdf-empty title="PDF 준비 중"');
  return html.replaceAll('__PDF__', esc(pdf));
}

function askBox(settings, opts = {}) {
  const c = settings.chat;
  return `<form class="ask" action="${BASE}ask/" method="get" role="search" data-ask${opts.live ? ' data-live' : ''}>
<label class="sr" for="q-${opts.id || 'm'}">AI에게 물어보기</label>
<div class="ask-box"><input id="q-${opts.id || 'm'}" name="q" autocomplete="off" placeholder="${esc(opts.placeholder || c.placeholder)}"${opts.phMo ? ` data-ph-mo="${esc(opts.phMo)}"` : ''} maxlength="300"><button type="submit" aria-label="보내기">↑</button></div>
<div class="ask-sug">${(opts.suggestions || c.suggestions).map((s) => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
<p class="ask-note">${esc(c.notice)}</p></form>`;
}

function rowItem(p, i, hidden = false) {
  return `<li data-kind="${esc(p.kind)}"${hidden ? ' hidden' : ''}><a href="${href(p)}" data-detail data-peek="${p._thumb ? src(p._thumb) : ''}"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="nm">${esc(p.title)}</span><span class="tg">${tagLine(p).map(nb).join(' · ')}</span><span class="ar" aria-hidden="true">→</span></a></li>`;
}
function kindTabs(list, scope) {
  const n = (k) => list.filter((p) => p.kind === k).length;
  return `<div class="pills" role="group" aria-label="구분" data-tabs="${scope}"><button class="pill" type="button" data-kind="" aria-pressed="true">ALL<sup>${list.length}</sup></button><button class="pill" type="button" data-kind="WORK" aria-pressed="false">WORK<sup>${n('WORK')}</sup></button><button class="pill" type="button" data-kind="NOT WORK" aria-pressed="false">NOT WORK<sup>${n('NOT WORK')}</sup></button></div>`;
}

/* ---------------- 페이지들 ---------------- */
// 메인 썸네일 벽 자리 (Figma 메인 기준, 192 칸 / 모바일 97.5 칸)
const WALL = [
  [0, 0, 384, 0, 0, 195], [384, 0, 192, 195, 0, 97.5], [576, 192, 192, 292.5, 97.5, 97.5], [768, 0, 384, 195, 195, 195],
  [1152, 0, 192, 0, 195, 97.5], [1344, 0, 384, 0, 292.5, 195], [1728, 192, 192, 97.5, 195, 97.5], [192, 384, 384, 195, 390, 195],
  [576, 384, 192, 0, 487.5, 97.5], [960, 384, 384, 0, 585, 195], [1344, 576, 192, 292.5, 585, 97.5], [1536, 384, 384, 195, 682.5, 97.5],
];

function home(projects, s, counts) {
  const wall = projects.filter((p) => p.show_on_wall && p._thumb).sort((a, b) => (a.wall_order ?? 99) - (b.wall_order ?? 99)).slice(0, WALL.length);
  const arc = projects.filter((p) => p.show_on_archive).slice(0, 10);
  const pos = { 'UX DESIGN': [1101, 159], 'VISUAL DESIGN': [1210, 211], 'AI WORKFLOW': [300, 230], 'SOLO BUILD': [150, 282] };
  return `<section class="hero grid" style="${cs({ hh: 380, mh: 274, mtop: 72, mfs: 94, mlh: 88, mtt: 112, mtb: 213, mbl: 154 })}">
${imgTitle('home', 'PORTFOLIO')}${chips(pos, counts)}</section>
<section class="m-search grid">${askBox(s, { id: 'home', phMo: s.chat.placeholder_mobile })}<div class="m-intro"><b>${esc(s.hero.intro_title)}</b><span>${esc(s.hero.intro_sub)}</span></div></section>
<section class="wall grid" aria-label="대표 작업" style="--rows:4;--mrows:8">
${wall
  .map((p, i) => {
    const [x, y, sz, mx, my, ms] = WALL[i];
    return `<a class="w rv" href="${href(p)}" data-detail data-s="${sz}" style="--x:${x};--y:${y};--s:${sz};--mx:${mx};--my:${my};--ms:${ms};--d:${i}">${pic(p._thumb, p.title, `(max-width: 1023px) 50vw, ${Math.round(sz / 19.2)}vw`)}<span class="ov"><i>${esc(p.kind)}</i><span><strong>${esc(p.title)}</strong><small>${[p.platform, ...(p.filters || [])].filter(Boolean).map(nb).join(' · ')}</small></span></span></a>`;
  })
  .join('')}
<p class="note" style="--x:0;--y:696;--w:180">${esc(s.hero.wall_note2)}</p><p class="note" style="--x:1152;--y:204;--w:180">${esc(s.hero.wall_note)}</p></section>
<section class="arc" aria-labelledby="arc-h"><div class="arc-head"><h2 class="h-en" id="arc-h">ARCHIVE<sup>${projects.length}</sup></h2>${kindTabs(arc, 'home')}</div>
<ul class="rows" data-list="home"><li class="th" aria-hidden="true"><span>NO.</span><span>프로젝트</span><span>필터</span></li>${arc.map((p, i) => rowItem(p, i)).join('')}</ul>
<div class="more"><a href="${BASE}projects/" data-nav>전체 보기 <span aria-hidden="true">→</span></a></div></section>
<div class="peek" aria-hidden="true"></div>`;
}

function projectsPage(projects, s, counts) {
  const pos = { 'UX DESIGN': [1378, 100], 'VISUAL DESIGN': [1487, 152], 'AI WORKFLOW': [300, 250], 'SOLO BUILD': [150, 302] };
  return `<section class="hero grid" style="${cs({ hh: 380, mh: 220, mtop: 102, mfs: 76, mlh: 72, mtt: 72, mtb: 160, mbl: 16 })}">${imgTitle('projects', 'PROJECTS')}${chips(pos, counts)}</section>
<div class="p-bar">${kindTabs(projects, 'cards')}<div class="sel" data-sel><button class="pill blue" type="button" data-sel-name aria-label="선택한 필터 해제"></button><button class="clear" type="button" data-clear>전체 해제</button></div><button class="sort" type="button" data-sort aria-label="정렬 순서 바꾸기">최신순 ↓</button></div>
<div class="cards" data-list="cards">${projects
    .map(
      (p, i) => `<a class="card rv" href="${href(p)}" data-detail data-kind="${esc(p.kind)}" data-f="${(p.filters || []).map((f) => FILTER_KEYS[f]).join(' ')}" style="--d:${i % 4}">
<span class="th">${p._thumb ? `${pic(p._thumb, '', '(max-width: 1023px) 50vw, 25vw')}<img class="px" src="${BASE}img/${p._thumb.id}-px.webp" alt="" aria-hidden="true" loading="lazy">` : '<span class="ph">이미지 넣기</span>'}</span>
<span class="ov"><strong>${esc(p.title)}</strong><small>${tagLine(p).map(nb).join(' · ')}</small><em>자세히 보기 ↑</em></span>
<span class="cap"><strong>${esc(p.title)}</strong><small>${tagLine(p).map(nb).join(' · ')}</small></span></a>`,
    )
    .join('')}<p class="empty" hidden data-empty>이 조건에 맞는 작업이 아직 없어요.</p></div>`;
}

function detail(p, next) {
  const meta = [
    ['구분', [p.kind, p.type].filter(Boolean).join(' · ')],
    ['플랫폼', p.platform],
    ['역할', p.role],
    ['기여도', p.contribution],
    ['기술', (p.tags || []).join(' · ')],
    ['클라이언트', p.client],
    ['기간', p.period],
  ].filter(([, v]) => v);
  const wide = new Set(['기술']);
  return `<article class="dt" id="detail" data-slug="${esc(p.slug)}">
<aside class="dt-side"><span class="dt-kind">${esc(p.kind)}</span><h1 class="dt-ttl">${esc(p.title)}</h1>
<dl class="dt-meta">${meta.map(([k, v]) => `<div${wide.has(k) ? ' class="w2"' : ''}><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
${(p.filters || []).length ? `<div class="w2"><dt>필터</dt><dd class="fl">${p.filters.map((f) => `<a href="${BASE}projects/?f=${FILTER_KEYS[f]}" data-nav>${esc(f)}</a>`).join('')}</dd></div>` : ''}</dl>
<a class="dt-close" href="${BASE}projects/" data-close>Close <span class="x" aria-hidden="true"></span></a></aside>
<div class="dt-main">${p.summary || p.description ? `<div class="dt-intro"><h2>${esc(p.summary)}</h2><p>${esc(p.description)}</p></div>` : ''}
${!(p.sections || []).length && p._thumb ? `<div class="dt-sec">${pic(p._thumb, p.title, '(max-width: 1023px) 100vw, 70vw', true)}</div>` : ''}
${(p.sections || [])
    .map((sec, i) => {
      const numbered = sec.label || sec.heading;
      const n = (p.sections.slice(0, i + 1).filter((x) => x.label || x.heading).length + '').padStart(2, '0');
      return `<section class="dt-sec">${numbered ? `<div class="lb"><b>${n}</b><span>${esc(sec.label || '')}</span></div><div class="tx"><h3>${esc(sec.heading)}</h3><p>${esc(sec.body)}</p></div>` : ''}
${(sec.points || []).length ? `<div class="dt-pts">${sec.points.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>` : ''}
<div class="gal c${esc(sec.layout || '1')}">${(sec.images || []).map((im) => (im._img ? `<figure>${pic(im._img, im.caption, '(max-width: 1023px) 100vw, 70vw', i === 0)}${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>` : '')).join('')}</div></section>`;
    })
    .join('')}
${next ? `<a class="dt-next" href="${href(next)}" data-detail data-replace><span><small>NEXT PROJECT</small><strong>${esc(next.title)}</strong></span><span class="ar" aria-hidden="true">→</span></a>` : ''}</div></article>`;
}

function about(s) {
  const a = s.about;
  const pos = { 'UX DESIGN': [910, 110], 'VISUAL DESIGN': [1019, 162], 'AI WORKFLOW': [300, 270], 'SOLO BUILD': [150, 322] };
  const lines = (arr) => `<ul class="lines">${arr.map((r) => `<li><span class="p">${esc(r.period)}</span><b>${esc(r.place)}</b><span>${esc(r.role)}</span><em>${esc(r.note)}</em></li>`).join('')}</ul>`;
  return `<section class="hero grid" style="${cs({ hh: 480, mh: 253, mtop: 102, mfs: 104, mlh: 96, mtt: 72, mtb: 184, mbl: 16 })}">${imgTitle('about', 'ABOUT')}${chips(pos, null)}<p class="a-top">${esc(s.hero.wall_year)}</p></section>
<section class="a-intro"><h2 class="rv">${esc(a.title)}</h2><p class="rv" style="--d:2">${esc(a.body)}</p></section>
<section class="a-sec"><h2 class="h-en">HOW I WORK</h2><div class="how">${a.how.map((h, i) => `<div class="rv" style="--d:${i}"><span class="tag">${esc(h.chip)}</span><h3>${esc(h.title)}</h3><p>${esc(h.desc)}</p></div>`).join('')}</div></section>
<section class="a-sec"><h2 class="h-en">EXPERIENCE</h2>${lines(a.experience)}</section>
<section class="a-sec"><h2 class="h-en">EDUCATION</h2>${lines(a.education)}</section>
<section class="a-sec"><h2 class="h-en">SKILLS</h2><div class="skills">${a.skills.map((k) => `<span>${esc(k)}</span>`).join('')}</div>${lines(a.certificates)}</section>
<section class="a-cta"><div><h2><span class="pc-only">${esc(a.pdf_title)}</span><span class="mo-only">${esc(a.pdf_note)}</span></h2><a class="btn-pdf" href="__PDF__" target="_blank" rel="noopener">PDF Download ↓</a></div>${askBox(s, { id: 'about', placeholder: '이달님에 대해 무엇이든 물어보세요', suggestions: a.ask_suggestions?.length ? a.ask_suggestions : null })}</section>`;
}

function askPage(s) {
  const pos = { 'UX DESIGN': [1502, 100], 'VISUAL DESIGN': [1611, 152], 'AI WORKFLOW': [300, 250], 'SOLO BUILD': [150, 302] };
  const words = s.chat.title.split(' ');
  return `<section class="hero grid" style="${cs({ hh: 470, mh: 380, mtop: 72, mfs: 104, mlh: 96, mfs2: 92, mlh2: 88, mtt: 100, mtb: 242, mbl: 16 })}">${s.chat.title === 'ASK DALNIM' ? imgTitle('ask', 'ASK DALNIM') : title([s.chat.title], { fs: ['84%'] }).replace('class="ttl"', 'class="ttl k-pc"') + title(words, { fs: ['70%', '78%'] }).replace('class="ttl"', 'class="ttl k-mo"')}${chips(pos, null)}<p class="k-sub">${esc(s.chat.subtitle)}</p></section>
<div class="chat-wrap"><section class="chat" aria-live="polite"><div class="chat-log" data-log></div>
<div class="chat-in">${askBox(s, { id: 'ask', placeholder: '이어서 물어보세요', live: true })}</div></section></div>`;
}

/* ---------------- 실행 ---------------- */
async function main() {
  const { projects, settings, live } = await load();
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(path.join(DIST, 'assets'), { recursive: true });
  await fs.mkdir(path.join(DIST, 'fonts'), { recursive: true });
  await fs.cp(path.join(ROOT, 'node_modules/pretendard/dist/web/variable/woff2-dynamic-subset'), path.join(DIST, 'fonts/woff2-dynamic-subset'), { recursive: true });
  await fs.copyFile(path.join(ROOT, 'node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'), path.join(DIST, 'fonts/pretendardvariable-dynamic-subset.css'));
  for (const f of ['figtree-latin-wght-normal.woff2', 'figtree-latin-ext-wght-normal.woff2'])
    await fs.copyFile(path.join(ROOT, 'node_modules/@fontsource-variable/figtree/files', f), path.join(DIST, 'fonts', f));
  await fs.cp(path.join(ROOT, 'site/title'), path.join(DIST, 'assets/title'), { recursive: true, filter: (f) => !f.endsWith('.json') });
  await fs.copyFile(path.join(ROOT, 'site/style.css'), path.join(DIST, 'assets/style.css'));
  await fs.copyFile(path.join(ROOT, 'site/app.js'), path.join(DIST, 'assets/app.js'));

  for (const p of projects) {
    p.filters = (p.filters || []).filter((f) => FILTERS.includes(f));
    p._thumb = await image(p.thumbnail);
    for (const sec of p.sections || []) for (const im of sec.images || []) im._img = await image(im.path);
  }
  const counts = Object.fromEntries(FILTERS.map((f) => [f, projects.filter((p) => p.filters.includes(f)).length]));
  const n = projects.length;
  const write = async (rel, html) => {
    const file = path.join(DIST, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, html);
  };

  // 챗봇이 관련 프로젝트 카드를 그릴 때 쓰는 목록
  const index = projects.map((p) => ({ slug: p.slug, title: p.title, href: href(p), thumb: p._thumb ? src(p._thumb) : '' }));
  const idx = `<script>window.PROJECTS=${JSON.stringify(index).replace(/</g, '\\u003c')}</script>`;

  await write('index.html', page({ title: 'DALNIM — UI/UX 디자이너 이달님 포트폴리오', body: home(projects, settings, counts), settings, count: n }));
  await write('projects/index.html', page({ title: 'Projects — DALNIM', body: projectsPage(projects, settings, counts), active: 'projects', settings, count: n }));
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const next = projects[(i + 1) % projects.length];
    await write(`projects/${p.slug}/index.html`, page({ title: `${p.title} — DALNIM`, body: detail(p, next !== p ? next : null), active: 'projects', settings, count: n, desc: p.summary?.replace(/\n/g, ' ') }));
  }
  await write('about/index.html', page({ title: 'About — DALNIM', body: about(settings), active: 'about', settings, count: n }));
  await write('ask/index.html', page({ title: 'Ask — DALNIM', body: askPage(settings), active: 'ask', settings, count: n, extra: idx }));
  await write('404.html', page({ title: '페이지를 찾을 수 없어요 — DALNIM', body: `<section class="hero grid" style="--hh:600;--mh:400">${title(['404'])}<p class="k-sub">찾는 페이지가 없어요. <a href="${BASE}" style="text-decoration:underline">처음으로</a></p></section>`, settings, count: n }));
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');
  console.log(`[site] ${live ? '실제' : '샘플'} 데이터 · 프로젝트 ${n}개, 이미지 ${[...done.values()].filter(Boolean).length}장으로 만들었어요.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
