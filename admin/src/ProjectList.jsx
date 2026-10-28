import { useState } from 'react';
import { store } from './store.js';
import { fmtDate, IconPlus, IconDrag, IconImage } from './ui.jsx';

export default function ProjectList({ projects, loading, onNew, onEdit, onToggle, onReorder, categories }) {
  const [filter, setFilter] = useState('전체');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const shown = filter === '전체' ? projects : projects.filter((p) => p.category === filter);
  const canDrag = filter === '전체';

  function drop(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(dragId);
    ids.splice(from, 1);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    onReorder(ids);
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>프로젝트</h1>
          <p className="muted">
            공개 {projects.filter((p) => p.published).length} · 비공개 {projects.filter((p) => !p.published).length}
          </p>
        </div>
        <button className="btn primary" onClick={onNew}>
          <IconPlus /> 새 프로젝트
        </button>
      </div>

      <div className="tabs" role="tablist">
        {['전체', ...categories].map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} className={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>
            {c}
            <em>{c === '전체' ? projects.length : projects.filter((p) => p.category === c).length}</em>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">불러오는 중…</div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <IconImage />
          <strong>{projects.length ? '이 챕터에 등록된 프로젝트가 없어요.' : '아직 등록한 프로젝트가 없어요.'}</strong>
          <span className="muted">'새 프로젝트'를 눌러 첫 프로젝트를 등록해 보세요.</span>
        </div>
      ) : (
        <ul className="rows">
          {shown.map((p) => (
            <li
              key={p.id}
              className={'row' + (overId === p.id ? ' over' : '') + (dragId === p.id ? ' dragging' : '')}
              draggable={canDrag}
              onDragStart={() => setDragId(p.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                setOverId(p.id);
              }}
              onDrop={() => drop(p.id)}
            >
              <span className={'grip' + (canDrag ? '' : ' off')} title={canDrag ? '끌어서 순서 바꾸기' : '전체 탭에서 순서를 바꿀 수 있어요'}>
                <IconDrag />
              </span>
              <div className="thumb">{p.thumbnail ? <img src={store.imageUrl(p.thumbnail)} alt="" /> : <IconImage />}</div>
              <button className="row-main" onClick={() => onEdit(p)}>
                <strong>{p.title || '제목 없음'}</strong>
                <span className="muted">{p.summary || '한 줄 요약이 비어 있어요'}</span>
              </button>
              <span className="chip">{p.category}</span>
              <span className="muted sm">{p.type}</span>
              <span className="muted sm nowrap">{fmtDate(p.updated_at)}</span>
              <button className={'pill ' + (p.published ? 'pub' : 'priv')} onClick={() => onToggle(p)} title="눌러서 공개 상태 바꾸기">
                {p.published ? '공개' : '비공개'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
