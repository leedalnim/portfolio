import { useEffect, useState } from 'react';
import { store, isDemo } from './store.js';

// 사이트 설정: 첫 화면 문구, About, PDF, AI 챗봇
export default function SettingsPage({ onSaved, onError }) {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState('home');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    store.getSettings().then(setS).catch((e) => onError(e.message));
  }, []);

  if (!s) return <section className="page"><div className="empty sm">설정을 불러오는 중…</div></section>;

  const set = (group, patch) => {
    setS((x) => ({ ...x, [group]: { ...x[group], ...patch } }));
    setDirty(true);
  };

  async function save() {
    setSaving(true);
    try {
      await store.saveSettings(s);
      setDirty(false);
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPdf(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') return onError('PDF 파일만 올릴 수 있어요.');
    if (isDemo) return onError('데모 모드에서는 PDF를 올릴 수 없어요. 주소를 직접 넣어 주세요.');
    setUploading(true);
    try {
      const path = await store.upload(file, 'portfolio.pdf');
      set('pdf', { path, url: store.imageUrl(path) });
    } catch {
      onError('PDF를 올리지 못했어요.');
    } finally {
      setUploading(false);
    }
  }

  const tabs = [
    ['home', '첫 화면'],
    ['about', 'About'],
    ['pdf', 'PDF · 연락처'],
    ['chat', 'AI 챗봇'],
  ];
  const a = s.about;
  const c = s.chat;

  return (
    <section className="page editor">
      <div className="page-head">
        <div>
          <h1>사이트 설정</h1>
          <p className="muted">프로젝트 밖의 문구와 AI 챗봇 설정이에요. 저장 후 '사이트에 반영'을 눌러야 사이트에 보여요.</p>
        </div>
        <div className="head-actions">
          {dirty && <span className="dirty">저장하지 않은 변경이 있어요</span>}
          <button className="btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      <div className="seg big" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="card">
          <h2>첫 화면</h2>
          <div className="grid2">
            <Text label="소개 제목 (모바일 검색창 아래)" rows={2} value={s.hero.intro_title} onChange={(v) => set('hero', { intro_title: v })} />
            <Text label="소개 보조 문장" rows={2} value={s.hero.intro_sub} onChange={(v) => set('hero', { intro_sub: v })} />
            <Text label="썸네일 벽 문구" rows={3} value={s.hero.wall_note} onChange={(v) => set('hero', { wall_note: v })} />
            <Text label="썸네일 벽 오른쪽 위 (연도·이름)" rows={2} value={s.hero.wall_year} onChange={(v) => set('hero', { wall_year: v })} />
          </div>
        </div>
      )}

      {tab === 'about' && (
        <>
          <div className="card">
            <h2>소개</h2>
            <div className="grid2">
              <Text label="제목" rows={2} value={a.title} onChange={(v) => set('about', { title: v })} span />
              <Text label="본문" rows={6} value={a.body} onChange={(v) => set('about', { body: v })} span />
              <Text label="아래쪽 PDF 안내 문구" rows={2} value={a.pdf_note} onChange={(v) => set('about', { pdf_note: v })} span />
            </div>
          </div>
          <ListCard
            title="HOW I WORK"
            items={a.how}
            onChange={(v) => set('about', { how: v })}
            fields={[
              ['chip', '칩'],
              ['title', '제목'],
              ['desc', '설명', 'wide'],
            ]}
            blank={{ chip: '', title: '', desc: '' }}
          />
          {[
            ['experience', 'EXPERIENCE', ['기간', '회사', '직무·지역', '기간 표시']],
            ['education', 'EDUCATION', ['기간', '학교', '전공', '학점']],
            ['certificates', '자격증', ['취득일', '자격증', '구분', '비고']],
          ].map(([k, t, ls]) => (
            <ListCard
              key={k}
              title={t}
              items={a[k]}
              onChange={(v) => set('about', { [k]: v })}
              fields={[
                ['period', ls[0]],
                ['place', ls[1]],
                ['role', ls[2]],
                ['note', ls[3]],
              ]}
              blank={{ period: '', place: '', role: '', note: '' }}
            />
          ))}
          <div className="card">
            <h2>SKILLS</h2>
            <Text label="쉼표로 구분" rows={1} value={a.skills.join(', ')} onChange={(v) => set('about', { skills: v.split(',').map((x) => x.trim()).filter(Boolean) })} span />
          </div>
        </>
      )}

      {tab === 'pdf' && (
        <div className="card">
          <h2>PDF 포트폴리오</h2>
          <p className="muted sm">메뉴와 About의 'PDF Download' 버튼이 이 파일을 열어요.</p>
          <div className="grid2">
            <label className="field span2">
              <span>PDF 주소</span>
              <input value={s.pdf.url} onChange={(e) => set('pdf', { url: e.target.value, path: null })} placeholder="https:// … 또는 아래에서 파일 올리기" />
            </label>
            <label className="field span2">
              <span>파일 올리기</span>
              <input type="file" accept="application/pdf" disabled={uploading} onChange={(e) => uploadPdf(e.target.files[0])} />
              {uploading && <small className="muted">올리는 중…</small>}
            </label>
          </div>
          <h2 style={{ marginTop: 28 }}>연락처</h2>
          <p className="muted sm">비워 두면 사이트에 보이지 않아요. 챗봇은 연락처를 직접 알려 주지 않아요.</p>
          <label className="field">
            <span>이메일</span>
            <input value={s.contact.email} onChange={(e) => set('contact', { email: e.target.value })} placeholder="비워 두는 중" />
          </label>
        </div>
      )}

      {tab === 'chat' && (
        <>
          <div className="card">
            <h2>AI 챗봇</h2>
            <label className="switch">
              <input type="checkbox" checked={c.enabled} onChange={(e) => set('chat', { enabled: e.target.checked })} />
              <span className="track" />
              <span>{c.enabled ? '켜짐 — AI가 답해요' : '꺼짐 — 아래 자주 묻는 질문으로만 답해요'}</span>
            </label>
            <div className="grid2" style={{ marginTop: 16 }}>
              <Text label="페이지 큰 제목" rows={1} value={c.title} onChange={(v) => set('chat', { title: v })} />
              <label className="field">
                <span>방문자 한 명당 하루 질문 수</span>
                <input type="number" min={1} max={50} value={c.daily_limit} onChange={(e) => set('chat', { daily_limit: Math.max(1, +e.target.value || 1) })} />
              </label>
              <Text label="제목 아래 설명" rows={2} value={c.subtitle} onChange={(v) => set('chat', { subtitle: v })} span />
              <Text label="입력창 안내 문구" rows={1} value={c.placeholder} onChange={(v) => set('chat', { placeholder: v })} span />
              <Text label="추천 질문 (한 줄에 하나)" rows={3} value={c.suggestions.join('\n')} onChange={(v) => set('chat', { suggestions: v.split('\n').map((x) => x.trim()).filter(Boolean) })} span />
              <Text label="입력창 아래 주의 문구" rows={2} value={c.notice} onChange={(v) => set('chat', { notice: v })} span />
              <Text label="답할 수 없을 때" rows={2} value={c.fallback} onChange={(v) => set('chat', { fallback: v })} span />
              <Text label="하루 질문 수를 넘었을 때" rows={2} value={c.limit_message} onChange={(v) => set('chat', { limit_message: v })} span />
              <Text label="AI에게 더 알려 줄 내용 (사이트에는 안 보여요)" rows={5} value={c.extra_context} onChange={(v) => set('chat', { extra_context: v })} span hint="일하는 방식, 면접에서 자주 받는 질문의 답 등. 개인정보는 넣지 마세요." />
            </div>
          </div>
          <ListCard
            title="자주 묻는 질문"
            note="키워드가 질문에 들어 있으면 AI를 부르지 않고 이 답을 바로 보여 줘요. 관련 프로젝트에는 주소(slug)를 넣어요."
            items={c.faq}
            onChange={(v) => set('chat', { faq: v })}
            fields={[
              ['keywords', '키워드 (쉼표로 구분)', 'wide'],
              ['answer', '답변', 'area'],
              ['related', '관련 프로젝트 주소'],
            ]}
            blank={{ keywords: '', answer: '', related: '' }}
          />
        </>
      )}
    </section>
  );
}

function Text({ label, value, onChange, rows = 2, span, hint }) {
  return (
    <label className={'field' + (span ? ' span2' : '')}>
      <span>{label}</span>
      {rows > 1 ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

function ListCard({ title, note, items, onChange, fields, blank }) {
  const edit = (i, patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i, d) => {
    const arr = [...items];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div className="card">
      <h2>{title}</h2>
      {note && <p className="muted sm">{note}</p>}
      <div className="list-edit">
        {items.map((it, i) => (
          <div className="list-row" key={i}>
            <div className="list-fields">
              {fields.map(([k, l, kind]) => (
                <label key={k} className={'field' + (kind ? ' span2' : '')}>
                  <span>{l}</span>
                  {kind === 'area' ? <textarea rows={3} value={it[k] || ''} onChange={(e) => edit(i, { [k]: e.target.value })} /> : <input value={it[k] || ''} onChange={(e) => edit(i, { [k]: e.target.value })} />}
                </label>
              ))}
            </div>
            <div className="section-tools">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="아래로">↓</button>
              <button className="icon-btn" onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label="삭제">×</button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost sm" onClick={() => onChange([...items, { ...blank }])}>+ 추가</button>
    </div>
  );
}
