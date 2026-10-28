import { useState } from 'react';
import { store, isDemo } from './store.js';

export default function Login({ onError, toast }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await store.signIn(email, pw);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <span className="brand-mark lg">L</span>
        <h1>포트폴리오 관리자</h1>
        <p className="muted">{isDemo ? '데모 모드예요. 아무 이메일로나 들어가 볼 수 있어요.' : '등록된 관리자 계정으로 로그인해 주세요.'}</p>
        <label className="field">
          <span>이메일</span>
          <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required={!isDemo} />
        </label>
        {!isDemo && (
          <label className="field">
            <span>비밀번호</span>
            <input id="login-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
        )}
        <button className="btn primary block" disabled={busy}>
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
      {toast && <div className={'toast ' + toast.kind}>{toast.text}</div>}
    </div>
  );
}
