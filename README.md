# leedalnim 포트폴리오

- 사이트: https://leedalnim.github.io/portfolio/
- 관리자: https://leedalnim.github.io/portfolio/admin/

## 구조

```
관리자 페이지(/admin) ──저장──▶ Supabase (글 + 이미지)
        │
        └─ '사이트에 반영' ─▶ Supabase 함수(publish) ─▶ 깃헙 Actions
                                                      │ Supabase에서 공개 프로젝트를 읽어
                                                      │ 이미지 압축(WebP) + 정적 페이지 생성
                                                      ▼
방문자 ◀────────────────────────────────── 깃헙 페이지 (Supabase를 거치지 않음)
```

| 폴더 | 내용 |
| --- | --- |
| `admin/` | 관리자 페이지 (React). Supabase 설정이 없으면 **데모 모드**로 이 브라우저에만 저장 |
| `scripts/build-site.mjs` | 방문자용 사이트 생성 (메인·Projects·상세·About·Ask). 피그마 `web` 페이지 기준 |
| `scripts/sample.json`, `scripts/sample-img/` | 실제 데이터를 넣기 전 화면용 더미 데이터 (얌얌로그만 상세까지 채움) |
| `site/style.css`, `site/app.js` | 사이트 화면과 움직임 (상세 팝업, 블라인드 전환, 필터, 챗봇 화면) |
| `supabase/schema.sql` | 표·권한·이미지 저장소 설정 |
| `supabase/migrations/002_web_redesign.sql` | 웹 개편으로 늘어난 칸, 사이트 설정 표, 챗봇 질문 수 기록 |
| `supabase/functions/ask/` | AI 챗봇 함수 (Gemini) |
| `supabase/functions/publish/` | '사이트에 반영' 버튼이 부르는 함수 |
| `.github/workflows/deploy.yml` | 사이트를 만들어 깃헙 페이지에 배포 |

## 처음 한 번만 하는 설정

### 1. Supabase
1. 새 프로젝트를 만든다.
2. **SQL Editor**에 `supabase/schema.sql` 내용을 붙여넣고 실행한다.
3. **Authentication → Sign In / Providers**에서 새 회원가입 허용을 **끈다**. (꺼 두지 않으면 아무나 가입해 관리자 권한을 얻을 수 있음)
4. **Authentication → Users → Add user**로 관리자 계정(이메일·비밀번호)을 만든다. 자동 확인(Auto confirm)에 체크.
5. **Project Settings → API**에서 프로젝트 주소(URL)와 공개 키(anon 또는 publishable)를 복사해 둔다.

### 2. 깃헙 토큰 (반영 버튼용)
깃헙 **Settings → Developer settings → Fine-grained tokens → Generate new token**
- 저장소: `leedalnim/portfolio`만 선택
- 권한: **Contents: Read and write**, **Actions: Read-only**

### 3. 반영 함수
Supabase **Edge Functions → Deploy a new function**
- 이름: `publish`
- 코드: `supabase/functions/publish/index.ts` 내용을 붙여넣기
- **Secrets**에 `GITHUB_TOKEN` = 2번에서 만든 토큰

### 4. 깃헙 저장소 설정
- **Settings → Pages → Source**: `GitHub Actions`
- **Settings → Secrets and variables → Actions → Variables** 탭에 추가
  - `SUPABASE_URL` = 1-5의 주소
  - `SUPABASE_ANON_KEY` = 1-5의 공개 키

설정 후 **Actions → 사이트 배포 → Run workflow**를 한 번 실행하면 관리자 페이지가 Supabase에 연결된 상태로 올라간다.

### 5. 웹 개편 칸 추가 (한 번)
**SQL Editor**에 `supabase/migrations/002_web_redesign.sql` 내용을 붙여넣고 실행한다.

### 6. AI 챗봇
1. [Google AI Studio](https://aistudio.google.com/)에서 API 키를 만든다. 무료 사용량은 AI Studio의 사용량 화면에서 확인한다.
2. Supabase **Edge Functions → Deploy a new function**
   - 이름: `ask`, 코드: `supabase/functions/ask/index.ts`
   - **Verify JWT는 끈다** (방문자는 로그인하지 않음. 공개 키가 `sb_publishable_`로 시작하면 꼭 꺼야 함)
   - **Secrets**: `GEMINI_API_KEY` = 1번 키
   - 선택: `GEMINI_MODEL` (기본 `gemini-3.5-flash-lite`), `CHAT_SITE_DAILY_LIMIT` (사이트 전체 하루 질문 수, 기본 300)
3. 방문자 한 명당 하루 질문 수, 안내 문구, 자주 묻는 질문은 관리자 **사이트 설정 → AI 챗봇**에서 바꾼다.
4. 키가 없거나 함수가 실패하면 사이트는 자주 묻는 질문으로만 답한다.

### 7. 실제 데이터로 바꾸기
지금 사이트는 `scripts/sample.json` 더미 데이터로 만들어진다. 관리자에서 프로젝트를 채운 뒤
**Settings → Secrets and variables → Actions → Variables**에 `SITE_DATA` = `live`를 추가하고 '사이트에 반영'을 누른다.
(공개 프로젝트가 하나도 없으면 더미 데이터로 돌아간다.)

## 로컬에서 실행

```bash
npm install
npm run dev:admin   # 관리자 페이지 (http://localhost:5173/portfolio/admin/)
npm run build       # dist/ 에 사이트 + 관리자 생성
```

루트에 `.env`를 만들면 로컬 관리자도 Supabase에 연결된다. (`.env`는 저장소에 올라가지 않음)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 이미지
- 관리자에서 올릴 때 브라우저가 폭 2000px 이하 WebP로 먼저 줄인다.
- 배포할 때 960px / 1920px 두 가지로 다시 만들고, 스크롤해서 보일 때만 불러온다.
- 줄인 이미지는 Actions 캐시에 보관해 새로 올린 이미지만 Supabase에서 받는다.
