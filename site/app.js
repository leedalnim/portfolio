// leedalnim 포트폴리오 — 화면 동작 (프레임워크 없이 가볍게)
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const S = window.SITE || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const blinds = $('.blinds');

  /* ---------- 블라인드 (세로 막대 4개) ---------- */
  async function cover(color = '#fff') {
    blinds.style.setProperty('--bc', color);
    blinds.classList.remove('out');
    blinds.classList.add('on');
    await wait(700);
  }
  async function uncover() {
    blinds.classList.add('out');
    await wait(700);
    blinds.classList.remove('on', 'out');
  }

  // 페이지 이동: 막대가 덮은 뒤 이동, 새 페이지에서는 막대가 걷히며 시작
  if (sessionStorage.getItem('pf-nav')) {
    sessionStorage.removeItem('pf-nav');
    blinds.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(uncover));
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && !layer.classList.contains('open')) return;
    e.preventDefault();
    closeMenu(true);
    await cover();
    try {
      sessionStorage.setItem('pf-nav', '1');
    } catch {}
    location.href = url.href;
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted) blinds.classList.remove('on', 'out');
  });

  /* ---------- 나타나기 ---------- */
  const io = new IntersectionObserver(
    (en) =>
      en.forEach((x) => {
        if (x.isIntersecting) {
          x.target.classList.add('in');
          io.unobserve(x.target);
        }
      }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  $$('.rv').forEach((el) => io.observe(el));

  /* ---------- 위로 ---------- */
  $$('[data-top]').forEach((b) => b.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })));

  /* ---------- 모바일 전체 메뉴 ---------- */
  const menu = $('#menu');
  const menuBtn = $('[data-menu]');
  async function openMenu() {
    await cover('#142FB2');
    menu.classList.add('open');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('locked');
    blinds.classList.remove('on', 'out');
    requestAnimationFrame(() => menu.classList.add('ready'));
    $('.close', menu)?.focus();
  }
  function closeMenu(instant) {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('ready');
    const end = () => {
      menu.classList.remove('open');
      document.body.classList.remove('locked');
      menuBtn?.setAttribute('aria-expanded', 'false');
    };
    if (instant) return end();
    setTimeout(end, reduce ? 0 : 250);
    menuBtn?.focus();
  }
  menuBtn?.addEventListener('click', openMenu);
  $('[data-menu-close]')?.addEventListener('click', () => closeMenu());

  /* ---------- 구분 탭 (ALL / WORK / NOT WORK) ---------- */
  function setupList(scope, getItems, onChange) {
    const tabs = $(`[data-tabs="${scope}"]`);
    if (!tabs) return null;
    const state = { kind: '' };
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state.kind = b.dataset.kind;
      $$('button', tabs).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange(state);
    });
    return state;
  }

  // 메인 아카이브
  const homeList = $('[data-list="home"]');
  if (homeList) {
    setupList('home', null, ({ kind }) => {
      $$('li[data-kind]', homeList).forEach((li) => (li.hidden = !!kind && li.dataset.kind !== kind));
    });
    // 마우스를 따라다니는 미리보기 사진
    const peek = $('.peek');
    let raf = 0,
      mx = 0,
      my = 0,
      px = 0,
      py = 0;
    const loop = () => {
      px += (mx - px) * 0.18;
      py += (my - py) * 0.18;
      peek.style.left = px + 'px';
      peek.style.top = py + 'px';
      raf = Math.abs(mx - px) + Math.abs(my - py) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    homeList.addEventListener('mousemove', (e) => {
      const a = e.target.closest('a[data-peek]');
      if (!a || !a.dataset.peek) return peek.classList.remove('on');
      if (peek.dataset.src !== a.dataset.peek) {
        peek.dataset.src = a.dataset.peek;
        peek.style.backgroundImage = `url("${a.dataset.peek}")`;
      }
      mx = e.clientX + 170;
      my = e.clientY - 20;
      if (!peek.classList.contains('on')) {
        px = mx;
        py = my;
      }
      peek.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    homeList.addEventListener('mouseleave', () => peek.classList.remove('on'));
  }

  // 프로젝트 목록: 칩(필터) + 탭(구분) + 정렬
  const cards = $('[data-list="cards"]');
  if (cards) {
    const NAMES = { ux: 'UX DESIGN', visual: 'VISUAL DESIGN', ai: 'AI WORKFLOW', solo: 'SOLO BUILD' };
    const params = new URLSearchParams(location.search);
    const st = { kind: '', f: NAMES[params.get('f')] ? params.get('f') : '' };
    const sel = $('[data-sel]');
    const apply = () => {
      let shown = 0;
      $$('.card', cards).forEach((c) => {
        const ok = (!st.kind || c.dataset.kind === st.kind) && (!st.f || c.dataset.f.split(' ').includes(st.f));
        c.hidden = !ok;
        if (ok) shown++;
      });
      $('[data-empty]').hidden = shown > 0;
      $$('.chip[data-chip]').forEach((c) => {
        c.classList.toggle('dim', !!st.f && c.dataset.chip !== st.f);
        c.classList.toggle('on', c.dataset.chip === st.f);
        c.setAttribute('aria-pressed', String(c.dataset.chip === st.f));
      });
      sel.classList.toggle('on', !!st.f);
      if (st.f) $('[data-sel-name]').textContent = NAMES[st.f] + '  ✕';
      // 탭 숫자도 걸러진 기준으로
      const base = $$('.card', cards).filter((c) => !st.f || c.dataset.f.split(' ').includes(st.f));
      $$('[data-tabs="cards"] button').forEach((b) => {
        const k = b.dataset.kind;
        b.querySelector('sup').textContent = base.filter((c) => !k || c.dataset.kind === k).length;
      });
      const u = new URL(location.href);
      st.f ? u.searchParams.set('f', st.f) : u.searchParams.delete('f');
      history.replaceState(history.state, '', u);
    };
    setupList('cards', null, ({ kind }) => {
      st.kind = kind;
      apply();
    });
    $$('.chip[data-chip]').forEach((c) =>
      c.addEventListener('click', (e) => {
        e.preventDefault();
        st.f = st.f === c.dataset.chip ? '' : c.dataset.chip;
        apply();
      }),
    );
    $('[data-sel-name]').addEventListener('click', () => {
      st.f = '';
      apply();
    });
    $('[data-clear]').addEventListener('click', () => {
      st.f = '';
      st.kind = '';
      $$('[data-tabs="cards"] button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === 0)));
      apply();
    });
    const sortBtn = $('[data-sort]');
    sortBtn.addEventListener('click', () => {
      const list = $$('.card', cards).reverse();
      list.forEach((c) => cards.insertBefore(c, $('[data-empty]')));
      sortBtn.textContent = sortBtn.textContent.includes('최신') ? '오래된순 ↑' : '최신순 ↓';
    });
    apply();
  }

  /* ---------- 상세: 목록 위에 덮이는 팝업 ---------- */
  const layer = $('#layer');
  const scroller = $('.scroll', layer);
  const cache = new Map();
  let opener = null;
  let listUrl = null;
  const getDetail = (url) => {
    if (!cache.has(url))
      cache.set(
        url,
        fetch(url)
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then((t) => new DOMParser().parseFromString(t, 'text/html').querySelector('#detail'))
          .catch(() => (cache.delete(url), null)),
      );
    return cache.get(url);
  };
  // 마우스를 올리는 순간 미리 받아 둔다
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[data-detail]');
    if (a) getDetail(a.href);
  });
  async function openDetail(url, push = true, replace = false) {
    const node = await getDetail(url);
    if (!node) return (location.href = url);
    if (!layer.classList.contains('open')) {
      listUrl = location.href;
      await cover();
      layer.classList.add('open');
      layer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked');
    } else {
      layer.classList.remove('ready');
      await wait(250);
    }
    scroller.replaceChildren(document.importNode(node, true));
    scroller.scrollTop = 0;
    $$('.rv', scroller).forEach((el) => el.classList.add('in'));
    if (push) history[replace ? 'replaceState' : 'pushState']({ detail: url }, '', url);
    document.title = (node.querySelector('.dt-ttl')?.textContent || '') + ' — DALNIM';
    blinds.classList.remove('on', 'out');
    requestAnimationFrame(() => layer.classList.add('ready'));
    $('.dt-close', scroller)?.focus({ preventScroll: true });
  }
  async function closeDetail(push = true) {
    if (!layer.classList.contains('open')) return;
    layer.classList.remove('ready');
    blinds.classList.add('on');
    await wait(450);
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden', 'true');
    scroller.replaceChildren();
    document.body.classList.remove('locked');
    await uncover();
    if (push && listUrl) history.pushState(null, '', listUrl);
    document.title = document.querySelector('title')?.textContent || document.title;
    opener?.focus({ preventScroll: true });
  }
  const standalone = !!$('#main > #detail');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-detail]');
    if (a && !standalone && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (!a.closest('#layer')) opener = a;
      openDetail(a.href, true, !!a.closest('#layer'));
      return;
    }
    const c = e.target.closest('a[data-close]');
    if (c && layer.classList.contains('open')) {
      e.preventDefault();
      if (history.state?.detail) history.back();
      else closeDetail();
    }
  });
  addEventListener('popstate', (e) => {
    if (e.state?.detail) openDetail(e.state.detail, false);
    else if (layer.classList.contains('open')) closeDetail(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menu.classList.contains('open')) closeMenu();
    else if (layer.classList.contains('open')) history.state?.detail ? history.back() : closeDetail();
  });
  // 상세 단독 페이지에서 닫기 → 목록으로
  if (standalone) document.documentElement.classList.add('is-detail');

  /* ---------- AI 질문 ---------- */
  $$('form[data-ask]').forEach((f) => {
    $$('[data-q]', f).forEach((b) =>
      b.addEventListener('click', () => {
        f.q.value = b.dataset.q;
        f.requestSubmit();
      }),
    );
    if (f.hasAttribute('data-live'))
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = f.q.value.trim();
        if (q) ask(q);
        f.q.value = '';
      });
  });

  const log = $('[data-log]');
  const projects = window.PROJECTS || [];
  function faq(q) {
    const t = q.toLowerCase();
    let best = null,
      score = 0;
    for (const item of S.chat?.faq || []) {
      const s = String(item.keywords || '')
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k && t.includes(k)).length;
      if (s > score) (best = item), (score = s);
    }
    return best ? { answer: best.answer, related: String(best.related || '').split(',').map((x) => x.trim()).filter(Boolean) } : null;
  }
  function card(slug) {
    const p = projects.find((x) => x.slug === slug);
    if (!p) return '';
    return `<a href="${p.href}" data-detail>${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : ''}<span>${p.title} ↗</span></a>`;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-pdf-empty]')) e.preventDefault();
  });
  const hist = [];
  async function ask(q) {
    if (!log) return;
    const qEl = document.createElement('div');
    qEl.className = 'q';
    qEl.textContent = q;
    log.append(qEl);
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div class="a-lb">AI 답변</div><div class="ans wait">답변을 준비하고 있어요</div>';
    log.append(wrap);
    wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const box = $('.ans', wrap);
    let res = null;
    const local = faq(q);
    if (local) res = local; // 자주 묻는 질문은 AI를 부르지 않고 바로 답한다
    else if (S.ask && S.chat?.enabled !== false) {
      try {
        const r = await fetch(S.ask, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: S.key, Authorization: 'Bearer ' + S.key }, body: JSON.stringify({ q, history: hist.slice(-4) }) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429) res = { answer: S.chat.limit };
        else if (r.ok && j.answer) res = j;
      } catch {}
    }
    if (!res) res = local || { answer: S.chat?.fallback || '지금은 답변을 드릴 수 없어요.' };
    box.classList.remove('wait');
    box.textContent = res.answer;
    hist.push({ role: 'user', text: q }, { role: 'model', text: res.answer });
    const rel = (res.related || []).map(card).filter(Boolean);
    if (rel.length) {
      const d = document.createElement('div');
      d.className = 'rel';
      d.innerHTML = `<b>관련 프로젝트</b><div>${rel.join('')}</div>`;
      box.append(d);
    }
    const src = document.createElement('p');
    src.className = 'a-src';
    src.textContent = '답변은 이달님의 포트폴리오 기록을 바탕으로 만들어져요.';
    wrap.append(src);
  }
  const q0 = new URLSearchParams(location.search).get('q');
  if (log && q0) ask(q0.slice(0, 300));
})();
