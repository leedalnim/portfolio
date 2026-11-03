import { useEffect, useMemo, useState } from 'react';
import { store, isDemo, KINDS } from './store.js';
import Login from './Login.jsx';
import ProjectList from './ProjectList.jsx';
import ProjectEditor from './ProjectEditor.jsx';
import SettingsPage from './SettingsPage.jsx';
import StatsPage from './StatsPage.jsx';
import LayoutPage from './LayoutPage.jsx';
import { emptyProject } from './store.js';
import { fmtDate, IconGrid, IconOut, IconUp, IconSet, IconStats, IconLayout } from './ui.jsx';

const LAST_PUB = 'pf-last-published';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('projects');
  const [settingsAt, setSettingsAt] = useState('');
  const [toast, setToast] = useState(null);
  const [pub, setPub] = useState({ state: 'idle', at: readLastPub() });

  useEffect(() => {
    if (user) try { localStorage.setItem('pf-no-track', '1'); } catch {}
  }, [user]);

  useEffect(() => {
    store.getUser().then(setUser);
    return store.onAuth(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    store
      .list()
      .then(setProjects)
      .catch(() => flash('목록을 불러오지 못했어요. 연결 설정을 확인해 주세요.', 'error'))
      .finally(() => setLoading(false));
  }, [user]);

  function flash(text, kind = 'ok') {
    setToast({ text, kind, id: Date.now() });
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // 마지막으로 사이트가 만들어진 시각: 이 브라우저에서 누른 반영 + 깃헙의 최근 성공 배포(자동 배포 포함) 중 늦은 것
  const [lastDeploy, setLastDeploy] = useState('');
  useEffect(() => {
    if (!user) return;
    store.publishStatus().then((run) => run && run.conclusion === 'success' && setLastDeploy(run.created_at)).catch(() => {});
  }, [user, pub.state]);
  const builtAt = [pub.at, lastDeploy].filter(Boolean).sort().pop() || '';
  const pending = useMemo(() => {
    const list = projects.filter((p) => p.updated_at && (!builtAt || p.updated_at > builtAt)).map((p) => ({ name: p.title || '제목 없음', at: p.updated_at }));
    if (settingsAt && (!builtAt || settingsAt > builtAt)) list.push({ name: '사이트 설정', at: settingsAt });
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [projects, settingsAt, builtAt]);
  const needsPublish = pending.length > 0;
  const [showPending, setShowPending] = useState(false);

  async function publish() {
    setPub((p) => ({ ...p, state: 'running' }));
    try {
      await store.publish();
      const at = new Date().toISOString();
      try {
        localStorage.setItem(LAST_PUB, at);
      } catch {}
      setPub({ state: isDemo ? 'idle' : 'building', at });
      flash(isDemo ? '데모 모드라 실제 사이트에는 반영되지 않아요.' : '반영을 요청했어요. 1~2분 뒤 사이트에 보여요.');
    } catch (e) {
      setPub((p) => ({ ...p, state: 'error' }));
      flash(e.message, 'error');
    }
  }

  // 반영을 요청한 뒤에는 깃헙 배포 상태를 확인해 완료·실패를 알려준다
  useEffect(() => {
    if (pub.state !== 'building') return;
    const started = Date.now();
    const t = setInterval(async () => {
      const run = await store.publishStatus();
      if (run && run.status === 'completed' && run.created_at >= new Date(started - 60000).toISOString()) {
        clearInterval(t);
        const ok = run.conclusion === 'success';
        setPub((p) => ({ ...p, state: ok ? 'idle' : 'error' }));
        flash(ok ? '사이트에 반영됐어요.' : '배포가 실패했어요. 깃헙 Actions 기록을 확인해 주세요.', ok ? 'ok' : 'error');
      }
      if (Date.now() - started > 6 * 60 * 1000) {
        clearInterval(t);
        setPub((p) => ({ ...p, state: 'idle' }));
      }
    }, 8000);
    return () => clearInterval(t);
  }, [pub.state]);

  async function onSaved(saved) {
    setProjects((list) => {
      const exists = list.some((p) => p.id === saved.id);
      const next = exists ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved];
      return next.sort((a, b) => a.sort_order - b.sort_order);
    });
    setEditing(saved);
    flash('저장했어요.');
  }

  async function onDelete(id) {
    await store.remove(id);
    setProjects((l) => l.filter((p) => p.id !== id));
    setEditing(null);
    flash('삭제했어요.');
  }

  async function onTogglePublished(p) {
    const saved = await store.save({ ...p, published: !p.published });
    setProjects((l) => l.map((x) => (x.id === saved.id ? saved : x)));
    flash(saved.published ? '공개로 바꿨어요.' : '비공개로 바꿨어요.');
  }

  async function onReorder(ids) {
    setProjects((l) => ids.map((id, i) => ({ ...l.find((p) => p.id === id), sort_order: i })));
    await store.reorder(ids);
  }

  if (user === undefined) return <div className="boot" />;
  if (!user) return <Login onError={(m) => flash(m, 'error')} toast={toast} />;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div>
            <strong>leedalnim</strong>
            <span>포트폴리오 관리자</span>
          </div>
        </div>
        <nav className="side-nav">
          <button className={view === 'projects' && !editing ? 'on' : ''} onClick={() => { setView('projects'); setEditing(null); }}>
            <IconGrid /> 프로젝트
            <em>{projects.length}</em>
          </button>
          <button className={view === 'layout' ? 'on' : ''} onClick={() => { setView('layout'); setEditing(null); }}>
            <IconLayout /> 첫 화면 배치
          </button>
          <button className={view === 'settings' ? 'on' : ''} onClick={() => { setView('settings'); setEditing(null); }}>
            <IconSet /> 사이트 설정
          </button>
          <button className={view === 'stats' ? 'on' : ''} onClick={() => { setView('stats'); setEditing(null); }}>
            <IconStats /> 통계
          </button>
          <a href={import.meta.env.BASE_URL.replace(/admin\/$/, '')} target="_blank" rel="noreferrer">
            <IconOut /> 사이트 보기
          </a>
        </nav>
        <div className="side-foot">
          <span className="who">{user.email}</span>
          <button className="link" onClick={() => store.signOut()}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="main">
        {isDemo && (
          <div className="demo-bar">
            <b>데모 모드</b> 지금은 이 브라우저에만 저장돼요. Supabase를 연결하면 실제 사이트용으로 저장돼요.
          </div>
        )}
        <header className="topbar">
          <div className="pub-state">
            <span className={'dot ' + (pub.state === 'running' || pub.state === 'building' ? 'run' : pub.state === 'error' ? 'err' : needsPublish ? 'warn' : 'ok')} />
            {pub.state === 'running'
              ? '반영 요청 중…'
              : pub.state === 'building'
                ? '사이트를 만드는 중이에요 (1~2분)'
                : pub.state === 'error'
                  ? '마지막 반영이 실패했어요'
              : needsPublish
                ? <>사이트에 반영하지 않은 변경이 {pending.length}건 있어요 <button className="link sm" onClick={() => setShowPending((v) => !v)}>{showPending ? '닫기' : '무엇이 바뀌었나요?'}</button></>
                : pub.at
                  ? '최근 반영 ' + fmtDate(pub.at)
                  : '아직 반영한 적이 없어요'}
            {needsPublish && showPending && (
              <div className="pending-pop">
                <b>반영 대기 중인 변경</b>
                <ul>{pending.map((x, k) => <li key={k}><span>{x.name}</span><em>{fmtDate(x.at)}</em></li>)}</ul>
                <p>마지막 반영 {builtAt ? fmtDate(builtAt) : '없음'} 이후에 저장된 항목이에요. '사이트에 반영'을 누르면 한 번에 반영돼요.</p>
              </div>
            )}
          </div>
          <button className="btn primary" onClick={publish} disabled={pub.state === 'running' || pub.state === 'building'}>
            <IconUp /> 사이트에 반영
          </button>
        </header>

        {view === 'layout' && !loading ? (
          <LayoutPage
            key={projects.length}
            projects={projects}
            onSaved={(rows) => {
              setProjects((l) => l.map((p) => rows.find((r) => r.id === p.id) || p).sort((a, b) => a.sort_order - b.sort_order));
              flash(rows.length ? `${rows.length}개 프로젝트의 배치를 저장했어요.` : '바뀐 게 없어요.');
            }}
            onError={(m) => flash(m, 'error')}
          />
        ) : view === 'stats' ? (
          <StatsPage projects={projects} onError={(m) => flash(m, 'error')} />
        ) : view === 'settings' ? (
          <SettingsPage
            onSaved={() => {
              setSettingsAt(new Date().toISOString());
              flash('설정을 저장했어요.');
            }}
            onError={(m) => flash(m, 'error')}
          />
        ) : editing ? (
          <ProjectEditor
            key={editing.id || 'new'}
            initial={editing}
            onBack={() => setEditing(null)}
            onSaved={onSaved}
            onDelete={onDelete}
            onError={(m) => flash(m, 'error')}
          />
        ) : (
          <ProjectList
            projects={projects}
            loading={loading}
            onNew={() => setEditing({ ...emptyProject(), sort_order: projects.length })}
            onEdit={setEditing}
            onToggle={onTogglePublished}
            onReorder={onReorder}
            categories={KINDS}
          />
        )}
      </main>
      {toast && <div className={'toast ' + toast.kind}>{toast.text}</div>}
    </div>
  );
}

function readLastPub() {
  try {
    return localStorage.getItem(LAST_PUB);
  } catch {
    return null;
  }
}
