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
| `scripts/build-site.mjs` | 방문자용 사이트 생성. 화면 디자인은 임시이며, 홈페이지 디자인이 나오면 이 파일의 템플릿을 교체 |
| `supabase/schema.sql` | 표·권한·이미지 저장소 설정 |
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
