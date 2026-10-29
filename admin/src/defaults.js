// 사이트 설정 기본값. 관리자 '사이트 설정'에서 바꾸면 이 값 대신 저장된 값이 쓰인다.
// 사이트를 만드는 스크립트(scripts/build-site.mjs)도 이 파일을 같이 쓴다.
export const DEFAULT_SETTINGS = {
  hero: {
    intro_title: '의도를 읽어 문제를 해결하는\nUI/UX 디자이너 이달님입니다.',
    intro_sub: '궁금한 점은 AI에게 먼저 물어보셔도 돼요.\n제 작업 기록을 바탕으로 답해 드려요.',
    wall_note: '디자인은 사용자가\n만나는 가장 쉬운\n언어라고 생각합니다.',
    wall_note2: '공공기관과 문화재단의\n웹을 주로 만들어\n왔습니다.',
    wall_year: '2026\n이달님',
  },
  about: {
    title: '안녕하세요.\n디자이너 이달님입니다.',
    body:
      '이벤트·프로모션 디자인으로 시작해 공공기관, 사기업, 의학학회 등 다양한 클라이언트와 일해왔습니다. 제안시안부터 구축·운영 디자인까지, 주어진 시간 안에서 결과물로 증명해왔습니다.\n\nAI 툴을 적극적으로 활용해 불필요한 과정은 덜고, 반복 작업은 스킬로 만들어 핵심에 더 집중할 수 있는 방식으로 일하고 있습니다.',
    how: [
      { chip: 'UX DESIGN', title: '의도를 읽는 디자인', desc: '요청 뒤에 있는 진짜 목적을 먼저 읽고, 구조와 흐름부터 바로잡습니다.' },
      { chip: 'VISUAL DESIGN', title: '끝까지 다듬는 완성도', desc: '정해진 틀 안에서도 보기 좋고 쓰기 편한 화면으로 마무리합니다.' },
      { chip: 'AI WORKFLOW', title: '작업 범위를 넓히는 방식', desc: '반복 작업은 스킬로 만들고, 구현까지 AI와 함께 넓혀 갑니다.' },
      { chip: 'SOLO BUILD', title: '혼자 끝까지 만드는 힘', desc: '불편을 발견하면 기획부터 디자인, 구현까지 직접 완성합니다.' },
    ],
    experience: [
      { period: '2020.02 – 현재', place: '이노디스', role: 'UX/UI 선임 디자이너 · 서울', note: '6년 9개월' },
      { period: '2018.10 – 2019.07', place: '어니컴', role: 'IT 솔루션사업부 대리 · 서울', note: '10개월' },
      { period: '2016.01 – 2018.03', place: '엠투커뮤니티', role: '디자인팀 대리 · 서울', note: '2년 3개월' },
      { period: '2013.01 – 2015.08', place: '웹브라이트', role: '디자인팀 대리 · 서울', note: '2년 8개월' },
    ],
    education: [
      { period: '2015.10 – 2017.02', place: '학점은행제', role: '시각디자인 전공', note: '3.5 / 4.5' },
      { period: '2011.02 – 2013.02', place: '명지전문대학', role: '커뮤니케이션 디자인과', note: '4.11 / 4.5' },
    ],
    skills: ['Figma', 'Photoshop', 'Illustrator', 'VSCode', 'Claude', 'Codex'],
    certificates: [
      { period: '2015.12', place: '시각디자인 산업기사', role: '자격증', note: '' },
      { period: '2012.10', place: 'GTQ 포토샵 1급', role: '자격증', note: '' },
      { period: '2011.10', place: '컴퓨터그래픽스 운용기능사', role: '자격증', note: '' },
    ],
    pdf_title: 'PDF 포트폴리오 다운로드',
    pdf_note: '더 자세한 이야기는\nPDF 포트폴리오에 담았어요.',
    ask_suggestions: ['어떤 회사에서 일했나요?', 'AI는 어떻게 쓰나요?'],
  },
  contact: { email: '' },
  pdf: { path: null, url: '' },
  chat: {
    enabled: true,
    title: 'ASK DALNIM',
    subtitle: '이달님의 작업과 일하는 방식에 대해 물어보세요. 포트폴리오 기록을 바탕으로 답해요.',
    placeholder: '이달님의 작업에 대해 무엇이든 물어보세요',
    suggestions: ['디자인 시스템은 어떻게 만들었나요?', 'AI는 작업에 어떻게 쓰나요?', '공공기관 프로젝트 경험이 궁금해요'],
    notice: '개인정보는 입력하지 마세요. 이달님의 개인정보와 작업 과정의 세부 내용은 답변하지 않아요.',
    fallback: '그 부분은 포트폴리오에 담지 않았어요. 자세한 이야기는 면접에서 직접 나누고 싶어요.',
    limit_message: '오늘은 질문을 모두 받았어요. 내일 다시 물어봐 주세요. 그동안 PDF 포트폴리오도 함께 봐 주세요.',
    daily_limit: 10,
    extra_context: '',
    faq: [
      {
        keywords: '연락처, 이메일, 전화, 연락, 주소',
        answer: '개인적인 정보는 답변하지 않아요. 연락이 필요하시면 이력서에 있는 연락처를 이용해 주세요.',
        related: '',
      },
      {
        keywords: 'AI는, AI를, AI 활용, 인공지능, 클로드, Claude, 작업에 어떻게',
        answer:
          '반복되는 작업은 스킬로 만들어 두고, 불필요한 과정은 AI 툴로 덜어내는 방식으로 일하고 있어요. 개인 프로젝트 얌얌로그에서는 디자인 가이드를 직접 정한 뒤, 그 가이드를 AI에게 넘겨 모든 화면을 같은 규칙으로 구현했어요.',
        related: 'yamyamlog',
      },
      {
        keywords: '경력, 연차, 회사, 어디서 일',
        answer: '2013년부터 웹 디자인을 해 왔고, 2020년부터 이노디스에서 UX/UI 선임 디자이너로 일하고 있어요. 공공기관과 문화예술 기관의 웹사이트를 주로 만들어 왔어요.',
        related: '',
      },
    ],
  },
};

// 첫 화면 칩 이름과 짧은 키 (주소 ?f= 에 쓰임)
export const FILTER_KEYS = {
  'UX DESIGN': 'ux',
  'VISUAL DESIGN': 'visual',
  'AI WORKFLOW': 'ai',
  'SOLO BUILD': 'solo',
};
