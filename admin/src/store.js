// 관리자 데이터 저장소.
// Supabase 주소·키가 설정돼 있으면 Supabase를, 없으면 이 브라우저에만 저장되는 데모 모드를 쓴다.
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const BUCKET = 'portfolio';
export const isDemo = !URL_ || !KEY;

export const CATEGORIES = ['디자인 시스템', 'AI', '경험의 폭', '문제 해결', '일상'];
export const TYPES = ['구축', '고도화', '개편', '제안', '개인 프로젝트'];

export function emptyProject() {
  return {
    id: null,
    slug: '',
    title: '',
    summary: '',
    category: CATEGORIES[0],
    client: '',
    role: '',
    period: '',
    type: TYPES[0],
    tags: [],
    thumbnail: null,
    sections: [],
    published: false,
    sort_order: 0,
    updated_at: null,
  };
}

export function newSection() {
  return { id: crypto.randomUUID(), heading: '', body: '', layout: '1', images: [] };
}

/* ---------------- Supabase ---------------- */
function supabaseStore() {
  const sb = createClient(URL_, KEY);
  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession();
      return data.session?.user ?? null;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error('이메일 또는 비밀번호가 맞지 않아요.');
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async list() {
      const { data, error } = await sb.from('projects').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    async save(p) {
      const row = { ...p, updated_at: new Date().toISOString() };
      if (!row.id) delete row.id;
      const { data, error } = await sb.from('projects').upsert(row).select().single();
      if (error) throw new Error(error.code === '23505' ? '같은 주소(slug)를 쓰는 프로젝트가 이미 있어요.' : error.message);
      return data;
    },
    async remove(id) {
      const { error } = await sb.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    async reorder(ids) {
      await Promise.all(ids.map((id, i) => sb.from('projects').update({ sort_order: i }).eq('id', id)));
    },
    async upload(blob, name) {
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${name}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      return path;
    },
    imageUrl(path) {
      if (!path) return '';
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async publish() {
      const { data, error } = await sb.functions.invoke('publish', { method: 'POST' });
      if (error) throw new Error('반영 요청에 실패했어요. 반영 함수 설정을 확인해 주세요.');
      return data;
    },
    async publishStatus() {
      const { data, error } = await sb.functions.invoke('publish', { method: 'GET' });
      if (error) return null;
      return data;
    },
  };
}

/* ---------------- 데모 (이 브라우저에만 저장) ---------------- */
function demoStore() {
  const KEY_P = 'pf-demo-projects';
  const KEY_I = 'pf-demo-images';
  const KEY_U = 'pf-demo-user';
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  let listeners = [];
  const memImages = {};
  return {
    mode: 'demo',
    async getUser() {
      return read(KEY_U, null);
    },
    onAuth(cb) {
      listeners.push(cb);
      return () => (listeners = listeners.filter((l) => l !== cb));
    },
    async signIn(email) {
      const u = { email: email || 'demo@local' };
      write(KEY_U, u);
      listeners.forEach((l) => l(u));
    },
    async signOut() {
      try {
        localStorage.removeItem(KEY_U);
      } catch {}
      listeners.forEach((l) => l(null));
    },
    async list() {
      return read(KEY_P, []).sort((a, b) => a.sort_order - b.sort_order);
    },
    async save(p) {
      const all = read(KEY_P, []);
      if (p.slug && all.some((x) => x.slug === p.slug && x.id !== p.id)) throw new Error('같은 주소(slug)를 쓰는 프로젝트가 이미 있어요.');
      const row = { ...p, id: p.id || crypto.randomUUID(), updated_at: new Date().toISOString() };
      if (!p.id) row.sort_order = all.length;
      const next = p.id ? all.map((x) => (x.id === p.id ? row : x)) : [...all, row];
      write(KEY_P, next);
      return row;
    },
    async remove(id) {
      write(KEY_P, read(KEY_P, []).filter((x) => x.id !== id));
    },
    async reorder(ids) {
      const all = read(KEY_P, []);
      write(KEY_P, all.map((x) => ({ ...x, sort_order: ids.indexOf(x.id) })));
    },
    async upload(blob) {
      const path = 'demo/' + crypto.randomUUID();
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(blob);
      });
      const imgs = read(KEY_I, {});
      imgs[path] = dataUrl;
      if (!write(KEY_I, imgs)) memImages[path] = dataUrl; // 브라우저 저장 공간이 차면 새로고침 전까지만 유지
      return path;
    },
    imageUrl(path) {
      if (!path) return '';
      return memImages[path] || read(KEY_I, {})[path] || '';
    },
    async publish() {
      await new Promise((r) => setTimeout(r, 900));
      return { ok: true, demo: true };
    },
    async publishStatus() {
      return null;
    },
  };
}

export const store = isDemo ? demoStore() : supabaseStore();
