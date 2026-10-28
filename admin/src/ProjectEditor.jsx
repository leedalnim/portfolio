import { useRef, useState } from 'react';
import { store, CATEGORIES, TYPES, newSection } from './store.js';
import { compressImage, formatBytes } from './image.js';
import { fmtDate, IconPlus, IconImage } from './ui.jsx';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function ProjectEditor({ initial, onBack, onSaved, onDelete, onError }) {
  const [p, setP] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const set = (patch) => {
    setP((x) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const setSection = (id, patch) => {
    setP((x) => ({ ...x, sections: x.sections.map((s) => (s.id === id ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s)) }));
    setDirty(true);
  };
  const moveSection = (i, d) => {
    const arr = [...p.sections];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ sections: arr });
  };

  const errors = [];
  if (!p.title.trim()) errors.push('제목');
  if (!SLUG_RE.test(p.slug)) errors.push('주소');

  async function save() {
    if (errors.length) {
      onError(errors.join(', ') + '을(를) 확인해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const saved = await store.save(p);
      setP(saved);
      setDirty(false);
      onSaved(saved);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty) setLeaving(true);
    else onBack();
  }

  function addTag(v) {
    const t = v.trim();
    if (!t || p.tags.includes(t)) return;
    set({ tags: [...p.tags, t] });
  }

  return (
    <section className="page editor">
      <div className="page-head">
        <div>
          <button className="link back" onClick={back}>
            ‹ 프로젝트 목록
          </button>
          <h1>{p.title || (p.id ? '제목 없음' : '새 프로젝트')}</h1>
          <p className="muted">{p.updated_at ? '마지막 저장 ' + fmtDate(p.updated_at) : '아직 저장하지 않았어요'}</p>
        </div>
        <div className="head-actions">
          {p.id &&
            (confirmDel ? (
              <>
                <span className="muted sm">삭제하면 되돌릴 수 없어요.</span>
                <button className="btn danger" onClick={() => onDelete(p.id)}>
                  삭제
                </button>
                <button className="btn ghost" onClick={() => setConfirmDel(false)}>
                  취소
                </button>
              </>
            ) : (
              <button className="btn ghost" onClick={() => setConfirmDel(true)}>
                삭제
              </button>
            ))}
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {leaving && (
        <div className="notice">
          저장하지 않은 변경이 있어요.
          <span className="spacer" />
          <button className="btn ghost sm" onClick={onBack}>
            저장하지 않고 나가기
          </button>
          <button className="btn primary sm" onClick={save}>
            저장
          </button>
        </div>
      )}

      <div className="editor-grid">
        <div className="editor-main">
          <div className="card">
            <h2>기본 정보</h2>
            <div className="grid2">
              <label className="field span2">
                <span>
                  제목 <i>*</i>
                </span>
                <input id="f-title" value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="예: 청년몽땅정보통 메인 개편" />
              </label>
              <label className="field span2">
                <span>
                  주소 <i>*</i>
                </span>
                <div className="affix">
                  <em>/projects/</em>
                  <input
                    id="f-slug"
                    value={p.slug}
                    onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="youth-main"
                  />
                </div>
                <small className={p.slug && !SLUG_RE.test(p.slug) ? 'err' : 'muted'}>영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요.</small>
              </label>
              <label className="field span2">
                <span>한 줄 요약</span>
                <input id="f-summary" value={p.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="목록과 상세 맨 위에 보이는 문장" />
              </label>
              <label className="field">
                <span>챕터</span>
                <select id="f-category" value={p.category} onChange={(e) => set({ category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>유형</span>
                <select id="f-type" value={p.type} onChange={(e) => set({ type: e.target.value })}>
                  {TYPES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>클라이언트</span>
                <input id="f-client" value={p.client} onChange={(e) => set({ client: e.target.value })} placeholder="예: 서울시" />
              </label>
              <label className="field">
                <span>기간</span>
                <input id="f-period" value={p.period} onChange={(e) => set({ period: e.target.value })} placeholder="예: 2025.03 – 2025.06" />
              </label>
              <label className="field span2">
                <span>역할</span>
                <input id="f-role" value={p.role} onChange={(e) => set({ role: e.target.value })} placeholder="예: UI/UX 디자인 · AI 퍼블리싱" />
              </label>
              <div className="field span2">
                <span>태그</span>
                <div className="tags">
                  {p.tags.map((t) => (
                    <button key={t} className="tag" onClick={() => set({ tags: p.tags.filter((x) => x !== t) })} title="눌러서 지우기">
                      {t} <b>×</b>
                    </button>
                  ))}
                  <input
                    id="f-tag"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag(tagDraft);
                        setTagDraft('');
                      }
                    }}
                    onBlur={() => {
                      addTag(tagDraft);
                      setTagDraft('');
                    }}
                    placeholder={p.tags.length ? '' : 'Figma, React … 입력 후 Enter'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>대표 이미지</h2>
            <p className="muted sm">목록 카드와 상세 맨 위에 쓰여요. 가로로 긴 이미지가 잘 어울려요.</p>
            <ImageSlot path={p.thumbnail} onChange={(path) => set({ thumbnail: path })} onError={onError} />
          </div>

          <div className="sections-head">
            <h2>상세 내용</h2>
            <span className="muted sm">섹션마다 제목, 설명, 이미지 묶음을 넣을 수 있어요.</span>
          </div>

          {p.sections.length === 0 && <div className="empty sm">아직 섹션이 없어요. 아래 버튼으로 추가해 주세요.</div>}

          {p.sections.map((s, i) => (
            <div className="card section" key={s.id}>
              <div className="section-top">
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <input className="h-input" value={s.heading} onChange={(e) => setSection(s.id, { heading: e.target.value })} placeholder="섹션 제목 (예: 필터 영역 개선)" />
                <div className="section-tools">
                  <button className="icon-btn" onClick={() => moveSection(i, -1)} disabled={i === 0} aria-label="위로">
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => moveSection(i, 1)} disabled={i === p.sections.length - 1} aria-label="아래로">
                    ↓
                  </button>
                  <button className="icon-btn" onClick={() => set({ sections: p.sections.filter((x) => x.id !== s.id) })} aria-label="섹션 삭제">
                    ×
                  </button>
                </div>
              </div>
              <textarea rows={3} value={s.body} onChange={(e) => setSection(s.id, { body: e.target.value })} placeholder="설명 (줄바꿈 그대로 보여요)" />
              <div className="layout-pick">
                <span className="muted sm">이미지 배치</span>
                <div className="seg">
                  {[
                    ['1', '1열'],
                    ['2', '2열'],
                    ['3', '3열'],
                  ].map(([v, l]) => (
                    <button key={v} className={s.layout === v ? 'on' : ''} onClick={() => setSection(s.id, { layout: v })}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Gallery section={s} onChange={(v) => setSection(s.id, (sec) => ({ images: typeof v === 'function' ? v(sec.images) : v }))} onError={onError} />
            </div>
          ))}

          <button className="btn ghost block add" onClick={() => set({ sections: [...p.sections, newSection()] })}>
            <IconPlus /> 섹션 추가
          </button>
        </div>

        <aside className="editor-side">
          <div className="card sticky">
            <h2>공개 설정</h2>
            <label className="switch">
              <input id="f-published" type="checkbox" checked={p.published} onChange={(e) => set({ published: e.target.checked })} />
              <span className="track" />
              <span>{p.published ? '공개 — 사이트 목록에 보여요' : '비공개 — 사이트에 안 보여요'}</span>
            </label>
            <div className="preview">
              <div className="preview-img">{p.thumbnail ? <img src={store.imageUrl(p.thumbnail)} alt="" /> : <IconImage />}</div>
              <span className="chip">{p.category}</span>
              <strong>{p.title || '제목'}</strong>
              <span className="muted sm">{p.summary || '한 줄 요약'}</span>
            </div>
            <p className="muted sm">저장 후 상단의 '사이트에 반영'을 눌러야 실제 사이트에 보여요.</p>
            {dirty && <p className="dirty">저장하지 않은 변경이 있어요</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function useUploader(onError) {
  const [busy, setBusy] = useState(0);
  const [note, setNote] = useState('');
  async function upload(files) {
    const out = [];
    setBusy((b) => b + files.length);
    for (const f of files) {
      try {
        const { blob, name, before, after } = await compressImage(f);
        const path = await store.upload(blob, name);
        out.push(path);
        if (before) setNote(`${formatBytes(before)} → ${formatBytes(after)}로 줄여서 올렸어요`);
      } catch {
        onError(`${f.name}을(를) 올리지 못했어요.`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    return out;
  }
  return { busy, note, upload };
}

function DropZone({ onFiles, busy, multiple, children }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={'drop' + (over ? ' over' : '')}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
        if (files.length) onFiles(files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {busy ? <span>올리는 중… ({busy})</span> : children}
    </div>
  );
}

function ImageSlot({ path, onChange, onError }) {
  const { busy, note, upload } = useUploader(onError);
  return (
    <div className="slot">
      {path ? (
        <div className="slot-img">
          <img src={store.imageUrl(path)} alt="" />
          <button className="btn ghost sm" onClick={() => onChange(null)}>
            빼기
          </button>
        </div>
      ) : (
        <DropZone busy={busy} onFiles={async (f) => onChange((await upload(f.slice(0, 1)))[0] ?? null)}>
          <IconImage />
          <span>이미지를 끌어다 놓거나 눌러서 선택</span>
        </DropZone>
      )}
      {note && <small className="muted">{note}</small>}
    </div>
  );
}

function Gallery({ section, onChange, onError }) {
  const { busy, note, upload } = useUploader(onError);
  const imgs = section.images;
  const move = (i, d) => {
    const a = [...imgs];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  return (
    <div>
      <div className={'gallery cols' + section.layout}>
        {imgs.map((im, i) => (
          <figure key={im.path}>
            <img src={store.imageUrl(im.path)} alt="" />
            <div className="fig-tools">
              <button className="icon-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">
                ←
              </button>
              <button className="icon-btn sm" onClick={() => move(i, 1)} disabled={i === imgs.length - 1} aria-label="뒤로">
                →
              </button>
              <button className="icon-btn sm" onClick={() => onChange(imgs.filter((_, k) => k !== i))} aria-label="이미지 빼기">
                ×
              </button>
            </div>
            <input
              value={im.caption}
              onChange={(e) => onChange(imgs.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
              placeholder="캡션 (선택)"
            />
          </figure>
        ))}
        <DropZone busy={busy} multiple onFiles={async (f) => {
            const added = (await upload(f)).map((path) => ({ path, caption: '' }));
            onChange((prev) => [...prev, ...added]);
          }}>
          <IconPlus />
          <span>이미지 추가</span>
        </DropZone>
      </div>
      {note && <small className="muted">{note}</small>}
    </div>
  );
}
