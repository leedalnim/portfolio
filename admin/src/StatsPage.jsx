// 통계: 방문 수, 많이 본 프로젝트, 들어온 경로, 기기, 챗봇 질문
import { useEffect, useMemo, useState } from 'react';
import { store } from './store.js';

const DAY = 864e5;
const kday = (d) => new Date(new Date(d).getTime() + 9 * 36e5).toISOString().slice(0, 10); // 한국 날짜
const fmt = (d) => { const t = new Date(d); return `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };
const REF = { 'linkedin.com': '링크드인', 'jobkorea.co.kr': '잡코리아', 'saramin.co.kr': '사람인', 'wanted.co.kr': '원티드', 'remember.co.kr': '리멤버', 'notion.site': '노션', 'google.com': '구글', 'naver.com': '네이버', 'daum.net': '다음', 'kakao.com': '카카오' };
const refName = (r) => { if (!r) return '직접 방문'; const k = Object.keys(REF).find((x) => r === x || r.endsWith('.' + x)); return k ? REF[k] : r; };

function count(arr, key) {
  const m = new Map();
  for (const x of arr) { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Bars({ list, max }) {
  const top = max || Math.max(1, ...list.map((x) => x[1]));
  return (
    <ul className="st-bars">
      {list.map(([k, v]) => (
        <li key={k}><span className="st-k">{k}</span><span className="st-bar"><i style={{ width: (v / top) * 100 + '%' }} /></span><b>{v}</b></li>
      ))}
      {!list.length && <li className="muted sm">아직 기록이 없어요.</li>}
    </ul>
  );
}

export default function StatsPage({ projects, onError }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    setRows(null);
    Promise.all([store.views(days), store.chats(200)])
      .then(([v, c]) => { setRows(v); setChats(c); })
      .catch((e) => { setRows([]); onError(e.message); });
  }, [days]);

  const s = useMemo(() => {
    if (!rows) return null;
    const now = Date.now();
    const pick = (n) => rows.filter((r) => now - new Date(r.ts) < n * DAY);
    const sum = (list) => ({ v: list.length, u: new Set(list.map((r) => kday(r.ts) + r.visitor)).size });
    const today = rows.filter((r) => kday(r.ts) === kday(now));
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = kday(now - i * DAY);
      const list = rows.filter((r) => kday(r.ts) === d);
      daily.push({ d, v: list.length, u: new Set(list.map((r) => r.visitor)).size });
    }
    const title = (slug) => projects.find((p) => p.slug === slug)?.title || slug;
    const chatDays = new Map();
    for (const c of chats) if (now - new Date(c.ts) < days * DAY) chatDays.set(kday(c.ts), (chatDays.get(kday(c.ts)) || 0) + 1);
    return {
      today: sum(today), w: sum(pick(7)), all: sum(rows), daily,
      top: count(rows.filter((r) => r.slug), (r) => title(r.slug)).slice(0, 10),
      pages: count(rows, (r) => (r.slug ? null : r.path)).slice(0, 8),
      refs: count(rows, (r) => refName(r.ref)).slice(0, 8),
      dev: count(rows, (r) => (r.device === 'mobile' ? '모바일' : r.device === 'tablet' ? '태블릿' : 'PC')),
      chatTotal: [...chatDays.values()].reduce((a, b) => a + b, 0),
    };
  }, [rows, chats, projects, days]);

  async function del(id) {
    if (!confirm('이 질문 기록을 지울까요?')) return;
    try { await store.removeChat(id); setChats((c) => c.filter((x) => x.id !== id)); } catch (e) { onError(e.message); }
  }

  const maxV = s ? Math.max(1, ...s.daily.map((x) => x.v)) : 1;
  return (
    <div className="page st">
      <div className="page-head">
        <h1>통계</h1>
        <div className="st-range">
          {[7, 30, 90].map((n) => <button key={n} className={'btn sm ' + (days === n ? 'primary' : 'ghost')} onClick={() => setDays(n)}>{n}일</button>)}
        </div>
      </div>
      <p className="muted sm">접속 주소(IP)는 저장하지 않고, 같은 날 같은 방문자는 한 명으로 셉니다. 관리자로 로그인한 브라우저의 방문은 빠집니다.</p>
      {!s ? <p className="muted">불러오는 중…</p> : (
        <>
          <div className="st-cards">
            <div><span>오늘</span><b>{s.today.v}</b><em>방문자 {s.today.u}명</em></div>
            <div><span>최근 7일</span><b>{s.w.v}</b><em>방문자 {s.w.u}명</em></div>
            <div><span>최근 {days}일</span><b>{s.all.v}</b><em>방문자 {s.all.u}명</em></div>
            <div><span>챗봇 질문 ({days}일)</span><b>{s.chatTotal}</b><em>아래에서 내용 확인</em></div>
          </div>
          <section className="st-box">
            <h2>날짜별 조회수</h2>
            <div className="st-chart">
              {s.daily.map((x) => (
                <div key={x.d} title={`${x.d} · 조회 ${x.v} · 방문자 ${x.u}`}><i style={{ height: (x.v / maxV) * 100 + '%' }} /><span>{days <= 30 || x.d.endsWith('01') ? x.d.slice(8) : ''}</span></div>
              ))}
            </div>
          </section>
          <div className="st-grid">
            <section className="st-box"><h2>많이 본 프로젝트</h2><Bars list={s.top} /></section>
            <section className="st-box"><h2>들어온 경로</h2><Bars list={s.refs} /></section>
            <section className="st-box"><h2>페이지</h2><Bars list={s.pages} /></section>
            <section className="st-box"><h2>기기</h2><Bars list={s.dev} /></section>
          </div>
          <section className="st-box">
            <h2>챗봇 질문 <span className="muted sm">최근 200개</span></h2>
            <ul className="st-chats">
              {chats.map((c) => (
                <li key={c.id}>
                  <div className="st-q"><b>{c.q}</b><span className="muted sm">{fmt(c.ts)} · {c.source === 'ai' ? 'AI 답변' : c.source === 'junk' ? '장난 질문 안내' : c.source === 'instant' ? '고정 답변' : c.source || ''}</span></div>
                  {c.answer && <p className="sm muted">{c.answer}</p>}
                  <button className="link sm" onClick={() => del(c.id)}>지우기</button>
                </li>
              ))}
              {!chats.length && <li className="muted sm">아직 질문이 없어요.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
