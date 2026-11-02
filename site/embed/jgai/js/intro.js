/* =========================================================
   AI중구 검색 소개 인트로 - 미리보기 동작 스크립트
   - 히어로: 헤드라인 타이핑 + 미리보기 스크롤 확대 (동작설명서 1·3번)
   - 섹션1: 검색바 입력창 타이핑 루프 (7.8초, 시안 331:6440 모션 기준)
   - 섹션3: 다국어 프로모 전환 (2.8초 순환, hero-multilang-animation.html 이식)
   - 우측 목차: 스크롤 위치에 따라 현재 섹션 강조 (히어로/아웃트로에선 숨김)
   문구/속도는 아래 상수만 바꾸면 됩니다.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 0) 히어로 헤드라인 타이핑 (동작설명서 1번) ---------- */
  // 로드 후 한 글자씩 타이핑 → 완성되면 커서 깜빡임 유지. 문구는 HTML 정적 원문을 그대로 읽어 사용.
  var HERO_START_MS = 500; // 타이핑 시작 지연
  var HERO_CHAR_MS  = 85;  // 글자당 간격

  var heroTxtEl = document.getElementById("heroTitleTxt");
  var heroCurEl = document.getElementById("heroCursor");

  if (heroTxtEl && heroCurEl && !reduceMotion) {
    var heroLines = heroTxtEl.innerHTML.split(/<br[^>]*>/i).map(function (s) {
      var d = document.createElement("div");
      d.innerHTML = s;
      return d.textContent;
    });
    var heroTotal = heroLines.join("").length;

    var heroRender = function (count) { // 원문 앞 count 글자까지만 표시
      var html = "";
      var left = count;
      for (var li = 0; li < heroLines.length; li++) {
        var take = Math.min(left, heroLines[li].length);
        html += heroLines[li].slice(0, take);
        left -= take;
        if (left <= 0) break;
        if (li < heroLines.length - 1) html += "<br>";
      }
      heroTxtEl.innerHTML = html;
    };

    heroCurEl.classList.add("is-typing");
    heroRender(0);
    setTimeout(function () {
      var n = 0;
      var iv = setInterval(function () {
        n += 1;
        heroRender(n);
        if (n >= heroTotal) {
          clearInterval(iv);
          heroCurEl.classList.remove("is-typing"); // 완성 → 깜빡임 재개
        }
      }, HERO_CHAR_MS);
    }, HERO_START_MS);
  }

  /* ---------- 0-2) 히어로 스크롤 스왑 (동작설명서 3번) ----------
     .hero(240vh)를 스크롤하는 동안 .hero__track 이 화면에 고정(CSS sticky)되고,
     그 진행도(0~1)에 맞춰 ① 텍스트가 위로 밀려 사라지고 ② 미리보기가 그 자리로 올라오며 확대된다.
     진행도 1에서 고정이 풀려 아래 섹션으로 스크롤이 그대로 이어짐. */
  var HERO_FADE_END  = 0.55; // 텍스트가 완전히 사라지는 진행도
  var HERO_MARGIN_X  = 60;   // 다 커졌을 때 카드 안쪽 좌우 여백
  var HERO_MARGIN_Y  = 50;   // 다 커졌을 때 카드 안쪽 상하 여백

  var heroEl      = document.querySelector(".hero");
  var heroCardEl  = document.querySelector(".hero__card");
  var heroTopEl   = document.getElementById("heroTop");
  var heroPrevEl  = document.getElementById("heroPreview");
  var heroZoomEl  = document.getElementById("heroZoom");
  var heroFrameEl = document.querySelector(".hero__frame");
  var narrow = window.matchMedia && window.matchMedia("(max-width: 1080px)");

  if (heroEl && heroCardEl && heroTopEl && heroPrevEl && heroZoomEl && heroFrameEl && !reduceMotion) {
    var lift = 0;          // 텍스트/미리보기가 올라갈 거리
    var maxScale = 1;      // 미리보기가 카드를 (여백만 남기고) 채우는 배율
    var heroTicking = false;

    var isPinned = function () { return !(narrow && narrow.matches); };

    // 확대 끝 상태 = 흰 프레임이 카드 안에 여백만 남기고 꽉 차며 정중앙 정렬
    // ※ offset* 로 재는 이유 = 등장 애니메이션(heroRise)의 transform 에 영향받지 않는 레이아웃 값이라서
    var measureHero = function () {
      var cardW = heroCardEl.offsetWidth;
      var cardH = heroCardEl.offsetHeight;
      var frameW = heroFrameEl.offsetWidth;
      var frameH = heroFrameEl.offsetHeight;
      if (!cardW || !frameW || !frameH) return;
      var frameInZoom = heroFrameEl.offsetTop;                          // 줌 박스 안 프레임 y (16)
      var zoomInCard = heroPrevEl.offsetTop - heroCardEl.offsetTop;     // 카드 안 줌 박스 y (538)
      maxScale = Math.max(1.02, Math.min(
        (cardW - HERO_MARGIN_X * 2) / frameW,
        (cardH - HERO_MARGIN_Y * 2) / frameH
      ));
      var finalFrameTop = (cardH - frameH * maxScale) / 2;              // 세로 정중앙
      lift = Math.max(0, zoomInCard + frameInZoom * maxScale - finalFrameTop);
    };

    var paintHero = function () {
      if (!isPinned()) {                       // 좁은 화면: CSS 기본값으로 되돌림
        heroTopEl.style.transform = "";
        heroTopEl.style.opacity = "";
        heroZoomEl.style.transform = "";
        return;
      }
      var track = heroEl.offsetHeight - window.innerHeight;
      var p = track > 0 ? -heroEl.getBoundingClientRect().top / track : 0;
      p = Math.min(1, Math.max(0, p));
      var y = -(p * lift);
      // 런타임 동적 값(허용 예외)
      heroTopEl.style.transform = "translateY(" + y.toFixed(1) + "px)";
      heroTopEl.style.opacity = Math.max(0, 1 - p / HERO_FADE_END).toFixed(3);
      heroZoomEl.style.transform =
        "translateY(" + y.toFixed(1) + "px) scale(" + (1 + p * (maxScale - 1)).toFixed(4) + ")";
    };

    var onHeroScroll = function () {
      if (heroTicking) return;
      heroTicking = true;
      requestAnimationFrame(function () { paintHero(); heroTicking = false; });
    };

    measureHero();
    paintHero();
    window.addEventListener("scroll", onHeroScroll, { passive: true });
    window.addEventListener("resize", function () { measureHero(); paintHero(); });
    window.addEventListener("load", function () { measureHero(); paintHero(); });
  }

  /* ---------- 1) 검색바 타이핑 애니메이션 ---------- */
  // 시안 타이밍: 7.8초 루프 / 0~0.7초 placeholder / 이후 글자당 약 0.099초로 타이핑 / 완성 후 유지
  var PLACEHOLDER = "찾지말고 AI에게 직접 물어보세요";
  var QUESTION    = "여권 발급 신청 방법을 알려주세요";
  var LOOP_MS  = 7800;  // 전체 루프
  var START_MS = 700;   // placeholder 표시 시간
  var CHAR_MS  = 99;    // 글자당 타이핑 간격

  var textEl = document.getElementById("sbText");
  var valEl  = document.getElementById("sbVal");

  if (textEl && valEl) {
    var timers = [];
    function clearTimers() {
      timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
      timers = [];
    }
    function setMode(mode) {
      // mode: 'placeholder' | 'typing' | 'typed'
      textEl.classList.toggle("is-placeholder", mode === "placeholder");
      textEl.classList.toggle("is-typed", mode === "typing" || mode === "typed");
      textEl.classList.toggle("is-typing", mode === "typing");
    }

    function runCycle() {
      clearTimers();
      // Phase A: placeholder
      setMode("placeholder");
      valEl.textContent = PLACEHOLDER;

      // Phase B: 타이핑 시작
      timers.push(setTimeout(function () {
        setMode("typing");
        valEl.textContent = "";
        var i = 0;
        var iv = setInterval(function () {
          i += 1;
          valEl.textContent = QUESTION.slice(0, i);
          if (i >= QUESTION.length) {
            clearInterval(iv);
            setMode("typed"); // 완성 후 커서 깜빡이며 유지
          }
        }, CHAR_MS);
        timers.push(iv);
      }, START_MS));
    }

    runCycle();
    setInterval(runCycle, LOOP_MS);
  }

  /* ---------- 2) 섹션3 다국어 프로모 전환 (hero-multilang-animation.html 이식) ---------- */
  // 2.8초마다 KR→EN→CN→VN→RU 순환. EN 카피만 시안(337:11473) 직독 문구 유지,
  // 나머지 언어 문구는 hero-multilang-animation.html 원문 그대로(임의 번역 없음).
  var LANGS = [
    { pill: "검색",
      title: "지금 떠오른 바로 그 궁금증,\n그대로 입력해보세요.",
      sub:   "어시스턴트가 대신 검색하고,\n알기 쉽게 답변해드릴게요." },
    { pill: "Search",
      title: "Got a question on your\nmind?Just type it in.",
      sub:   "The AI assistant will search on your behalf\nand provide easy-to-understand answers." },
    { pill: "搜索",
      title: "现在就把您想到的疑问，\n直接输入吧。",
      sub:   "助手替您搜索，\n并用通俗易懂的方式为您解答。" },
    { pill: "Tìm kiếm",
      title: "Hãy nhập ngay câu hỏi\nbạn vừa nghĩ đến.",
      sub:   "Trợ lý sẽ tìm giúp bạn\nvà trả lời một cách dễ hiểu." },
    { pill: "Поиск",
      title: "Просто введите то, что вам\nинтересно, прямо сейчас.",
      sub:   "Ассистент найдёт информацию\nи ответит простыми словами." }
  ];
  var CYCLE_MS      = 2800; // 언어당 유지 시간
  var FADE_MS       = 300;  // fadeout(0.26s) 후 문구 교체 시점
  var TITLE_STAGGER = 26;   // 타이틀 글자 계단 delay(ms)
  var SUB_STAGGER   = 13;   // 서브 글자 계단 delay(ms)

  var pillEl  = document.getElementById("promoPillTxt");
  var titleEl = document.getElementById("promoTitle");
  var subEl   = document.getElementById("promoSub");
  var langsEl = document.getElementById("promoLangs");
  var indEl   = document.getElementById("promoInd");

  if (pillEl && titleEl && subEl && langsEl && indEl && !reduceMotion) {
    var langTabs = Array.prototype.slice.call(langsEl.querySelectorAll(".promo__lang"));
    var cur = 1; // 정적 초기 상태 = EN

    // 문자열을 글자 단위 span(.ch)으로 분해해 왼쪽부터 계단식 wipe-in ('\n' = 줄바꿈)
    function renderChars(el, str, stagger) {
      el.innerHTML = "";
      var i = 0;
      str.split("").forEach(function (c) {
        if (c === "\n") { el.appendChild(document.createElement("br")); return; }
        var s = document.createElement("span");
        s.className = "ch";
        s.textContent = c === " " ? " " : c;
        s.style.transitionDelay = (i * stagger) + "ms"; // 런타임 동적 값(허용 예외)
        el.appendChild(s);
        i += 1;
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          Array.prototype.forEach.call(el.querySelectorAll(".ch"), function (s) {
            s.classList.add("in");
          });
        });
      });
    }

    function moveInd(i) {
      var t = langTabs[i];
      indEl.style.left = t.offsetLeft + "px";
      indEl.style.width = t.offsetWidth + "px";
    }

    function cycleTo(i) {
      cur = i;
      // 탭 전환(인디케이터 슬라이드 + 활성색)과 텍스트 fadeout을 같은 프레임에 시작 = 싱크
      langTabs.forEach(function (t, k) { t.classList.toggle("promo__lang--on", k === i); });
      moveInd(i);
      pillEl.classList.add("is-out");
      titleEl.classList.add("is-out");
      subEl.classList.add("is-out");
      setTimeout(function () {
        var L = LANGS[cur];
        pillEl.textContent = L.pill;
        pillEl.classList.remove("is-out");
        titleEl.classList.remove("is-out");
        subEl.classList.remove("is-out");
        renderChars(titleEl, L.title, TITLE_STAGGER);
        renderChars(subEl, L.sub, SUB_STAGGER);
      }, FADE_MS);
    }

    langsEl.classList.add("is-anim"); // 정적 --on 배경 → 인디케이터로 교대
    moveInd(cur);
    setInterval(function () { cycleTo((cur + 1) % LANGS.length); }, CYCLE_MS);
  }

  /* ---------- 3) 우측 목차 스크롤 강조 ---------- */
  var tocItems = Array.prototype.slice.call(document.querySelectorAll(".ai-toc__item"));
  var sections = tocItems
    .map(function (a) { return document.getElementById(a.getAttribute("data-target")); })
    .filter(Boolean);

  if (tocItems.length && sections.length && "IntersectionObserver" in window) {
    function activate(id) {
      tocItems.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-target") === id);
      });
    }

    // 목차 클릭 → 해당 섹션이 화면 중앙에 오도록 부드럽게 스크롤 (모션 줄이기 설정이면 즉시 이동)
    tocItems.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.getElementById(a.getAttribute("data-target"));
        if (!target) return;
        e.preventDefault();
        activate(target.id);
        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center"
        });
      });
    });
    var io = new IntersectionObserver(function (entries) {
      // 화면 중앙에 가장 가까운(교차 비율 큰) 섹션을 현재로
      var best = null;
      entries.forEach(function (e) {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
          best = e;
        }
      });
      if (best) activate(best.target.id);
    }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach(function (s) { io.observe(s); });

    // 히어로/아웃트로 구간에서는 목차 숨김 (목차는 4개 기능 섹션 전용)
    var tocNav = document.querySelector(".ai-toc");
    var heroSecEl = document.querySelector(".hero");
    var outroSecEl = document.querySelector(".outro");
    if (tocNav && (heroSecEl || outroSecEl)) {
      var edgeVis = { hero: false, outro: false };
      var ioEdge = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          edgeVis[e.target === heroSecEl ? "hero" : "outro"] = e.isIntersecting;
        });
        tocNav.classList.toggle("is-hidden", edgeVis.hero || edgeVis.outro);
      }, { threshold: 0.2 });
      if (heroSecEl) ioEdge.observe(heroSecEl);
      if (outroSecEl) ioEdge.observe(outroSecEl);
    }
  }
})();
