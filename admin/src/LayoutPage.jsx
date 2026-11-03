// 첫 화면 배치: 썸네일 벽 12자리와 ARCHIVE 10줄의 순서를 한 화면에서 정한다
import { useMemo, useState } from 'react';
import { store } from './store.js';

// 사이트 메인 벽과 같은 자리 (1920 × 768 기준, x, y, 크기)
const SLOTS = [
  [0, 0, 384], [384, 0, 192], [576, 192, 192], [768, 0, 384],
  [1152, 0, 192], [1344, 0, 384], [1728, 192, 192], [192, 384, 384],
  [576, 384, 192], [960, 384, 384], [1344, 576, 192], [1536, 384, 384],
];
const ARC_MAX = 10;

function initWall(list) {
  const slots = Array(SLOTS.length).fill(null);
  const on = list.filter((p) => p.published && p.show_on_wall !== false && p.thumbnail);
  const rest = [];
  for (const p of [...on].sort((a, b) => (a.wall_order ?? 99) - (b.wall_order ?? 99))) {
    const i = (p.wall_order ?? 0) - 1;
    if (i >= 0 && i < SLOTS.length && !slots[i]) slots[i] = p.id;
    else rest.push(p.id);
  }
  for (const id of rest) { const i = slots.indexOf(null); if (i >= 0) slots[i] = id; }
  return slots;
}

export default function LayoutPage({ projects, onSaved, onError }) {
  const pub = useMemo(() => projects.filter((p) => p.published), [projects]);
  const byId = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const [wall, setWall] = useState(() => initWall(projects));
  const [arc, setArc] = useState(() => pub.filter((p) => p.show_on_archive !== false).sort((a, b) => a.sort_order - b.sort_order).map((p) => p.id));
  const [pick, setPick] = useState(null); // {from:'slot', i} | {from:'pool', id}
  const [arcDrag, setArcDrag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const wallPool = pub.filter((p) => !wall.includes(p.id));
  const arcPool = pub.filter((p) => !arc.includes(p.id));

  function put(src, i) {
    setWall((w) => {
      const n = [...w];
      if (src.from === 'slot') { if (src.i === i) return w; [n[src.i], n[i]] = [n[i], n[src.i]]; }
      else { const p = byId[src.id]; if (!p?.thumbnail) return w; n[i] = src.id; }
      return n;
    });
    setDirty(true);
    setPick(null);
  }
  function clearSlot(i) { setWall((w) => w.map((x, k) => (k === i ? null : x))); setDirty(true); setPick(null); }
  function toPool(src) { if (src?.from === 'slot') clearSlot(src.i); }
  const readSrc = (e) => { try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; } };
  const drag = (src) => ({ draggable: true, onDragStart: (e) => { e.dataTransfer.setData('text/plain', JSON.stringify(src)); e.dataTransfer.effectAllowed = 'move'; } });

  function moveArc(id, to) {
    setArc((a) => { const n = a.filter((x) => x !== id); n.splice(to, 0, id); return n; });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      // ARCHIVE 순서: 아카이브에 든 프로젝트들이 원래 차지하던 순번 자리를 새 순서대로 나눠 갖는다 (나머지 프로젝트 순서는 그대로)
      const all = [...projects].sort((a, b) => a.sort_order - b.sort_order);
      const seats = all.map((p, k) => (arc.includes(p.id) ? k : -1)).filter((k) => k >= 0);
      const arcSet = new Set(arc);
      const order = all.map((p) => p.id);
      const leftover = order.filter((id) => !arcSet.has(id));
      const merged = [];
      let ai = 0, li = 0;
      for (let k = 0; k < order.length; k++) merged.push(seats.includes(k) ? arc[ai++] : leftover[li++]);
      while (ai < arc.length) merged.push(arc[ai++]);
      const changed = [];
      for (const p of projects) {
        const wi = wall.indexOf(p.id);
        const next = {
          show_on_wall: wi >= 0 ? true : p.published && p.thumbnail ? false : p.show_on_wall,
          wall_order: wi >= 0 ? wi + 1 : null,
          show_on_archive: p.published ? arcSet.has(p.id) : p.show_on_archive,
          sort_order: merged.indexOf(p.id),
        };
        if (Object.keys(next).some((k) => (next[k] ?? null) !== (p[k] ?? null))) changed.push({ ...p, ...next });
      }
      const saved = [];
      for (const row of changed) saved.push(await store.save(row));
      onSaved(saved);
      setDirty(false);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const empty = wall.filter((x) => !x).length;
  const thumb = (p) => (p?.thumbnail ? <img src={store.imageUrl(p.thumbnail)} alt="" draggable={false} /> : null);

  return (
    <div className="page lay">
      <div className="page-head">
        <div>
          <h1>첫 화면 배치</h1>
          <p className="muted sm">썸네일 벽 자리와 ARCHIVE 순서를 여기서 정해요. 저장한 뒤 '사이트에 반영'을 누르면 사이트에 보여요.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={!dirty || saving}>{saving ? '저장 중…' : dirty ? '저장' : '저장됨'}</button>
      </div>

      <section className="st-box">
        <div className="st-head">
          <h2>썸네일 벽 <span className="muted sm">{SLOTS.length - empty} / {SLOTS.length}자리</span></h2>
          <span className="muted sm">끌어서 자리를 바꾸거나, 아래 목록에서 끌어다 넣어요. 클릭으로 하나 고른 뒤 자리를 눌러도 돼요.</span>
        </div>
        <div className="lay-wall">
          {SLOTS.map(([x, y, s], i) => {
            const p = byId[wall[i]];
            const on = pick?.from === 'slot' && pick.i === i;
            return (
              <div
                key={i}
                className={'lay-slot' + (p ? '' : ' empty') + (on ? ' on' : '')}
                style={{ left: (x / 1920) * 100 + '%', top: (y / 768) * 100 + '%', width: (s / 1920) * 100 + '%', height: (s / 768) * 100 + '%' }}
                {...(p ? drag({ from: 'slot', i }) : {})}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const src = readSrc(e); if (src) put(src, i); }}
                onClick={() => (pick ? put(pick, i) : p && setPick({ from: 'slot', i }))}
                title={p ? p.title : '빈 자리'}
              >
                {thumb(p)}
                <b className="lay-no">{i + 1}</b>
                {p ? <span className="lay-name">{p.title}</span> : <span className="lay-empty">비어 있음</span>}
                {p && <button className="lay-x" aria-label="벽에서 빼기" onClick={(e) => { e.stopPropagation(); clearSlot(i); }}>✕</button>}
              </div>
            );
          })}
        </div>
        {empty > 0 && <p className="lay-warn">빈 자리가 {empty}개 있어요. 사이트에서는 그 자리가 비어 보여요.</p>}
        <h3 className="lay-sub">벽에 없는 프로젝트</h3>
        <div className="lay-pool" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); toPool(readSrc(e)); }}>
          {wallPool.map((p) => (
            <button
              key={p.id}
              className={'lay-chip' + (pick?.from === 'pool' && pick.id === p.id ? ' on' : '') + (p.thumbnail ? '' : ' off')}
              {...(p.thumbnail ? drag({ from: 'pool', id: p.id }) : {})}
              onClick={() => p.thumbnail && setPick(pick?.id === p.id ? null : { from: 'pool', id: p.id })}
              title={p.thumbnail ? '' : '썸네일이 없어서 벽에 넣을 수 없어요'}
            >
              <span className="lay-ct">{thumb(p)}</span>
              {p.title}
              {!p.thumbnail && <em>썸네일 없음</em>}
            </button>
          ))}
          {!wallPool.length && <span className="muted sm">공개된 프로젝트가 모두 벽에 있어요.</span>}
        </div>
      </section>

      <section className="st-box">
        <div className="st-head">
          <h2>ARCHIVE <span className="muted sm">위에서 {ARC_MAX}줄까지 보여요</span></h2>
          <span className="muted sm">끌어서 순서를 바꿔요. 프로젝트 목록 순서도 같이 바뀌어요.</span>
        </div>
        <ol className="lay-arc">
          {arc.map((id, k) => {
            const p = byId[id];
            return (
              <li
                key={id}
                className={(k >= ARC_MAX ? 'over' : '') + (arcDrag === id ? ' dragging' : '')}
                draggable
                onDragStart={() => setArcDrag(id)}
                onDragEnd={() => setArcDrag(null)}
                onDragOver={(e) => { e.preventDefault(); if (arcDrag && arcDrag !== id) moveArc(arcDrag, k); }}
              >
                <span className="lay-grip" aria-hidden="true">⋮⋮</span>
                <b>{k + 1}</b>
                <span className="lay-ct">{thumb(p)}</span>
                <span className="lay-t">{p?.title}</span>
                {k === ARC_MAX && <em>여기부터 안 보여요</em>}
                <button className="link sm" onClick={() => { setArc((a) => a.filter((x) => x !== id)); setDirty(true); }}>빼기</button>
              </li>
            );
          })}
        </ol>
        {arcPool.length > 0 && (
          <>
            <h3 className="lay-sub">ARCHIVE에 없는 프로젝트</h3>
            <div className="lay-pool">
              {arcPool.map((p) => (
                <button key={p.id} className="lay-chip" onClick={() => { setArc((a) => [...a, p.id]); setDirty(true); }}>
                  <span className="lay-ct">{thumb(p)}</span>
                  {p.title}
                  <em>+ 추가</em>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      {pick && <div className="lay-tip">{pick.from === 'pool' ? `'${byId[pick.id]?.title}'을(를) 넣을 자리를 눌러 주세요` : '바꿀 자리를 눌러 주세요'} <button className="link sm" onClick={() => setPick(null)}>취소</button></div>}
    </div>
  );
}
