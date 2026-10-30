import { useRef, useState } from 'react';
import { store, TYPES, KINDS, PLATFORMS, FILTERS, newSection } from './store.js';
import { compressImage, formatBytes } from './image.js';
import { fmtDate, IconPlus, IconImage } from './ui.jsx';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function ProjectEditor({ initial, onBack, onSaved, onDelete, onError }) {
  const [p, setP] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [code, setCode] = useState(null); // 코드로 편집 중인 글 (null이면 화면 편집)
  const [codeErr, setCodeErr] = useState('');

  function openCode() {
    const { id, updated_at, created_at, sort_order, ...rest } = p;
    setCode(JSON.stringify(rest, null, 2));
    setCodeErr('');
  }
  function applyCode() {
    try {
      const o = JSON.parse(code);
      if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('{ } 로 감싼 하나의 프로젝트여야 해요.');
      delete o.id;
      delete o.updated_at;
      delete o.created_at;
      delete o.sort_order;
      if (o.sections !== undefined) {
        if (!Array.isArray(o.sections)) throw new Error('sections는 [ ] 목록이어야 해요.');
        o.sections = o.sections.map((x) => ({
          ...newSection(),
          ...x,
          id: x.id || crypto.randomUUID(),
          images: (x.images || []).map((im) => (typeof im === 'string' ? { path: im, caption: '' } : { caption: '', ...im })),
        }));
      }
      set(o);
      setCode(null);
    } catch (e) {
      setCodeErr('적용하지 못했어요. ' + e.message);
    }
  }

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

  return (
    <section className="page editor">
      <div className="page-head">
        <div>
          <button className="link back" onClick={back}>
            <span aria-hidden="true">←</span> 프로젝트 목록
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
          <button className="btn ghost" onClick={() => (code === null ? openCode() : setCode(null))}>
            {code === null ? '코드로 편집' : '화면으로 편집'}
          </button>
          <button className="btn primary" onClick={save} disabled={saving || code !== null}>
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

      {code !== null ? (
        <div className="card code-card">
          <h2>코드로 편집</h2>
          <p className="muted sm">
            이 프로젝트 전체를 JSON으로 보고 고칠 수 있어요. 다른 곳에서 만든 내용을 통째로 붙여넣어도 돼요. '적용'을 누른 뒤 '저장'해야 저장돼요.
            <br />
            이미지는 이미 올린 이미지 경로나 https 주소를 쓸 수 있어요. 섹션 종류는 <code>"type": "basic"</code>(기본) 또는 <code>"type": "code"</code>(코드 섹션)예요.
          </p>
          <textarea className="code" rows={28} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
          {codeErr && <p className="err sm">{codeErr}</p>}
          <div className="row-end">
            <button className="btn ghost" onClick={() => setCode(null)}>
              취소
            </button>
            <button className="btn primary" onClick={applyCode}>
              적용
            </button>
          </div>
        </div>
      ) : (
      <div className="editor-grid">
        <div className="editor-main">
          <div className="card">
            <h2>기본 정보</h2>
            <p className="muted sm">제목과 주소만 꼭 채우면 돼요. 나머지는 비워두면 상세 페이지에 그 줄이 안 보여요.</p>
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
                <span>요약 (목록 카드·검색 결과에 쓰는 한 줄)</span>
                <textarea id="f-summary" rows={3} value={p.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="줄바꿈 그대로 보여요" />
              </label>
              <label className="field span2">
                <span>오버뷰 (상세 맨 위 OVERVIEW 옆 글)</span>
                <textarea id="f-desc" rows={3} value={p.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="어떤 작업인지 두세 문장" />
              </label>
              <label className="field">
                <span>구분</span>
                <select id="f-kind" value={p.kind || 'WORK'} onChange={(e) => set({ kind: e.target.value })}>
                  {KINDS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>유형</span>
                <select id="f-type" value={p.type || ''} onChange={(e) => set({ type: e.target.value })}>
                  <option value="">선택 안 함</option>
                  {TYPES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>플랫폼</span>
                <select id="f-platform" value={p.platform ?? 'WEB'} onChange={(e) => set({ platform: e.target.value })}>
                  <option value="">선택 안 함</option>
                  {PLATFORMS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>기여도 <em>선택</em></span>
                <input id="f-contrib" value={p.contribution || ''} onChange={(e) => set({ contribution: e.target.value })} placeholder="예: 100%" />
              </label>
              <label className="field">
                <span>클라이언트 <em>선택</em></span>
                <input id="f-client" value={p.client || ''} onChange={(e) => set({ client: e.target.value })} placeholder="예: 서울시" />
              </label>
              <label className="field">
                <span>기간 <em>선택</em></span>
                <input id="f-period" value={p.period || ''} onChange={(e) => set({ period: e.target.value })} placeholder="예: 2025.03 – 2025.06" />
              </label>
              <label className="field span2">
                <span>역할 <em>선택</em></span>
                <textarea id="f-role" rows={2} value={p.role || ''} onChange={(e) => set({ role: e.target.value })} placeholder="예: 기획 · UX/UI 디자인 (줄바꿈 그대로 보여요)" />
              </label>
              <div className="field span2">
                <span>필터 (첫 화면 칩과 프로젝트 목록 필터)</span>
                <div className="checks">
                  {FILTERS.map((f) => {
                    const on = (p.filters || []).includes(f);
                    return (
                      <button key={f} type="button" className={'check' + (on ? ' on' : '')} aria-pressed={on} onClick={() => set({ filters: on ? p.filters.filter((x) => x !== f) : [...(p.filters || []), f] })}>
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="field span2">
                <span>목록 태그 (필터 외에 목록에 더 보일 말)</span>
                <TagInput id="f-extra" value={p.extra_tags || []} onChange={(v) => set({ extra_tags: v })} placeholder="예: INTERACTION · 입력 후 Enter" />
              </div>
              <div className="field span2">
                <span>기술</span>
                <TagInput id="f-tag" value={p.tags} onChange={(v) => set({ tags: v })} placeholder="Figma, React … 입력 후 Enter" />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>썸네일 (정사각)</h2>
            <p className="muted sm">메인 썸네일 벽, Projects 목록, ARCHIVE 미리보기에 쓰여요. 정사각 이미지로 올려 주세요.</p>
            <ImageSlot path={p.thumbnail} onChange={(path) => set({ thumbnail: path })} onError={onError} />
          </div>

          <div className="sections-head">
            <h2>상세 내용</h2>
            <span className="muted sm">기본 섹션은 칸을 채우면 되고, 코드 섹션은 HTML·CSS를 직접 써요. 비운 칸은 안 보여요.</span>
          </div>

          {p.sections.length === 0 && <div className="empty sm">아직 섹션이 없어요. 아래 버튼으로 추가해 주세요.</div>}

          {p.sections.map((s, i) => (
            <div className={'card section' + (s.type === 'code' ? ' is-code' : '')} key={s.id}>
              <div className="section-top">
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                {s.type === 'code' && <span className="kind-badge">코드</span>}
                <input className="l-input" value={s.label || ''} onChange={(e) => setSection(s.id, { label: e.target.value })} placeholder="라벨 (예: 기획)" aria-label="섹션 라벨" />
                <textarea className="h-input" rows={2} value={s.heading || ''} onChange={(e) => setSection(s.id, { heading: e.target.value })} placeholder="섹션 제목 (줄바꿈 그대로 보여요)" />
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
              <textarea rows={3} value={s.body || ''} onChange={(e) => setSection(s.id, { body: e.target.value })} placeholder="설명 (줄바꿈 그대로 보여요)" />
              {s.type === 'code' ? (
                <>
                  <textarea
                    className="code"
                    rows={12}
                    spellCheck={false}
                    value={s.html || ''}
                    onChange={(e) => setSection(s.id, { html: e.target.value })}
                    placeholder={'<div class="scroll-view">\n  <img src="{{1}}" alt="">\n</div>\n<style>\n  .scroll-view { … }\n</style>'}
                  />
                  <p className="muted sm">
                    HTML과 &lt;style&gt;을 쓸 수 있어요. 아래 이미지는 코드에서 <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>처럼 번호로 불러요. 스크립트는 실행되지 않아요.
                  </p>
                  <Gallery section={{ ...s, layout: '3' }} numbered onChange={(v) => setSection(s.id, (sec) => ({ images: typeof v === 'function' ? v(sec.images) : v }))} onError={onError} />
                </>
              ) : (
                <>
                  <Points value={s.points || []} onChange={(v) => setSection(s.id, { points: v })} />
                  <Gallery section={{ ...s, layout: '1' }} onChange={(v) => setSection(s.id, (sec) => ({ images: typeof v === 'function' ? v(sec.images) : v }))} onError={onError} />
                </>
              )}
            </div>
          ))}

          <div className="add-row">
            <button className="btn ghost block add" onClick={() => set({ sections: [...p.sections, newSection()] })}>
              <IconPlus /> 섹션 추가
            </button>
            <button className="btn ghost block add" onClick={() => set({ sections: [...p.sections, { ...newSection(), type: 'code' }] })}>
              <IconPlus /> 코드 섹션 추가
            </button>
          </div>

          <div className="card">
            <h2>세부 스타일 <em className="muted sm">선택</em></h2>
            <p className="muted sm">
              이 프로젝트 상세에만 적용되는 CSS예요. 간격이나 이미지 하나의 크기처럼 칸으로는 안 되는 걸 고칠 때 써요. 예: <code>.dt-sec:nth-of-type(3) .gal {'{ gap: 0 }'}</code>
            </p>
            <textarea className="code" rows={6} spellCheck={false} value={p.custom_css || ''} onChange={(e) => set({ custom_css: e.target.value })} placeholder=".dt-sec:nth-of-type(2) h3 { color: #0a7b45; }" />
          </div>
        </div>

        <aside className="editor-side">
          <div className="card sticky">
            <h2>공개 설정</h2>
            <label className="switch">
              <input id="f-published" type="checkbox" checked={p.published} onChange={(e) => set({ published: e.target.checked })} />
              <span className="track" />
              <span>{p.published ? '공개 — 사이트 목록에 보여요' : '비공개 — 사이트에 안 보여요'}</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={p.show_on_wall !== false} onChange={(e) => set({ show_on_wall: e.target.checked })} />
              <span className="track" />
              <span>첫 화면 썸네일 벽에 보이기</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={p.show_on_archive !== false} onChange={(e) => set({ show_on_archive: e.target.checked })} />
              <span className="track" />
              <span>첫 화면 ARCHIVE 목록에 보이기</span>
            </label>
            <div className="preview">
              <div className="preview-img">{p.thumbnail ? <img src={store.imageUrl(p.thumbnail)} alt="" /> : <IconImage />}</div>
              <span className="chip">{p.kind || 'WORK'}</span>
              <strong>{p.title || '제목'}</strong>
              <span className="muted sm">{p.summary || '한 줄 요약'}</span>
            </div>
            <p className="muted sm">저장 후 상단의 '사이트에 반영'을 눌러야 실제 사이트에 보여요.</p>
            {dirty && <p className="dirty">저장하지 않은 변경이 있어요</p>}
          </div>
        </aside>
      </div>
      )}
    </section>
  );
}

function Points({ value, onChange }) {
  const upd = (i, k, v) => onChange(value.map((x, j) => (j === i ? (k === 0 ? [v, x[1]] : [x[0], v]) : x)));
  return (
    <div className="points">
      {value.map(([k, v], i) => (
        <div className="pt-row" key={i}>
          <input value={k} onChange={(e) => upd(i, 0, e.target.value)} placeholder="포인트 제목" />
          <textarea rows={2} value={v} onChange={(e) => upd(i, 1, e.target.value)} placeholder="한두 줄 설명" />
          <button className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="포인트 빼기">
            ×
          </button>
        </div>
      ))}
      <button className="btn ghost sm" onClick={() => onChange([...value, ['', '']])}>
        <IconPlus /> 포인트 추가 <span className="muted">(선택, 제목 아래 3칸)</span>
      </button>
    </div>
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

function Gallery({ section, onChange, onError, numbered }) {
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
            {numbered && <span className="fig-n">{`{{${i + 1}}}`}</span>}
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

function TagInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = (v) => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="tags">
      {value.map((t) => (
        <button key={t} type="button" className="tag" onClick={() => onChange(value.filter((x) => x !== t))} title="눌러서 지우기">
          {t} <b>×</b>
        </button>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  );
}
