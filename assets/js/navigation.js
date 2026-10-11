/* =====================================================
   REVEAL (IntersectionObserver)
   ===================================================== */
const items = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${i * 100}ms`;
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

items.forEach(item => observer.observe(item));


/* =====================================================
   FOOTER TABS (SCOPED) — FIX ID DUPLICATI
   ===================================================== */
(() => {
  const footer = document.querySelector(".main-footer");
  if (!footer) return;

  const tabButtons = Array.from(footer.querySelectorAll(".tab-btn"));
  const tabPanels  = Array.from(footer.querySelectorAll(".tab-panel"));
  if (!tabButtons.length || !tabPanels.length) return;

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");

      const id = btn.dataset.tab;               // es: ft-tab-supporto
      const panel = footer.querySelector("#" + id);
      if (panel) panel.classList.add("active");
    });
  });
})();


/* =====================================================
   WaveToGo — WHY US (Premium Section)
   - IntersectionObserver (in-view)
   - Count-up (easeOutCubic)
   - Tabs (ARIA)
   - Steps reveal + progress rail
   - Lightbox gallery (vanilla)
   - prefers-reduced-motion respected
   - IIFE to avoid globals
   ===================================================== */
(() => {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Smooth scroll helper
  function smoothScrollTo(targetSel) {
    const el = $(targetSel);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // =====================================================
  // Count-up: easeOutCubic + decimals support
  // =====================================================
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCount(el) {
    const raw = el.getAttribute("data-count");
    const decimals = Number(el.getAttribute("data-decimals") || "0");
    const end = Number(raw);
    if (!Number.isFinite(end)) return;

    const duration = reduceMotion ? 1 : 900;
    const start = 0;
    const startTime = performance.now();

    function tick(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(p);
      const value = start + (end - start) * eased;

      el.textContent = value.toFixed(decimals);

      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = end.toFixed(decimals);
    }

    requestAnimationFrame(tick);
  }

  // =====================================================
  // Tabs: ARIA + ink indicator
  // =====================================================
  function initTabs(section) {
    const tabButtons = $$(".wtg-tab", section);
    const panels = $$(".wtg-panel", section);
    const ink = $(".wtg-tabs__ink", section);

    if (!tabButtons.length || !panels.length || !ink) return;

    function setInkTo(btn) {
      const idx = tabButtons.indexOf(btn);
      ink.style.transform = `translateX(${idx * 100}%)`;
    }

    function activateTab(btn) {
      tabButtons.forEach(b => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
        b.tabIndex = active ? 0 : -1;
      });

      const controls = btn.getAttribute("aria-controls");
      panels.forEach(p => p.classList.toggle("is-active", p.id === controls));
      setInkTo(btn);

      const panel = $("#" + controls, section);
      if (panel) panel.focus({ preventScroll: true });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => activateTab(btn));
      btn.addEventListener("keydown", (e) => {
        const idx = tabButtons.indexOf(btn);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const nextIdx = e.key === "ArrowRight"
            ? (idx + 1) % tabButtons.length
            : (idx - 1 + tabButtons.length) % tabButtons.length;
          tabButtons[nextIdx].focus();
          activateTab(tabButtons[nextIdx]);
        }
      });
    });

    const initial = $(".wtg-tab.is-active", section) || tabButtons[0];
    setInkTo(initial);
  }

  // =====================================================
  // Steps reveal + progress rail
  // =====================================================
  function initSteps(section) {
    const steps = $$(".wtg-step2", section);
    const fill = $(".wtg-stepsWrap__fill", section);
    if (!steps.length || !fill) return;

    let revealed = 0;

    const revealOne = (idx) => {
      if (idx < 0 || idx >= steps.length) return;
      const step = steps[idx];
      if (step.classList.contains("is-in")) return;

      step.classList.add("is-in");
      revealed += 1;

      const pct = Math.round((revealed / steps.length) * 100);
      fill.style.width = `${pct}%`;
    };

    if (reduceMotion) {
      steps.forEach(s => s.classList.add("is-in"));
      fill.style.width = "100%";
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = steps.indexOf(entry.target);
        revealOne(idx);
      });
    }, { threshold: 0.22 });

    steps.forEach(s => obs.observe(s));
  }

  // =====================================================
  // Lightbox gallery
  // =====================================================
  function initLightbox(section) {
    const items = Array.from(section.querySelectorAll(".wtg-gItem"));
    const lb = document.getElementById("wtgLightbox");
    if (!items.length || !lb) return;

    // sposta lightbox sotto <body>
    if (lb.parentElement !== document.body) {
      document.body.appendChild(lb);
    }

    const img = lb.querySelector(".wtg-lightbox__img");
    const cap = lb.querySelector(".wtg-lightbox__cap");
    const prevBtn = lb.querySelector("[data-prev]");
    const nextBtn = lb.querySelector("[data-next]");
    const closeBtn = lb.querySelector(".wtg-lightbox__close");
    const box = lb.querySelector(".wtg-lightbox__box");

    let idx = 0;
    let lastFocus = null;

    let scrollY = 0;
    function lockScroll() {
      scrollY = window.scrollY || 0;
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      if (sbw > 0) document.body.style.paddingRight = sbw + "px";
      document.body.classList.add("wtg-lb-lock");
      document.body.style.top = `-${scrollY}px`;
    }

    function unlockScroll() {
      document.body.classList.remove("wtg-lb-lock");
      document.body.style.top = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollY);
    }

    function openAt(i) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const full = it.getAttribute("data-full");
      const title = it.getAttribute("data-title") || "";

      lastFocus = document.activeElement;

      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");

      img.src = full || "";
      img.alt = title;
      cap.textContent = title;

      lockScroll();
      closeBtn?.focus({ preventScroll: true });
    }

    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      unlockScroll();
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function prev() { openAt(idx - 1); }
    function next() { openAt(idx + 1); }

    items.forEach((it, i) => it.addEventListener("click", () => openAt(i)));

    closeBtn?.addEventListener("click", (e) => { e.stopPropagation(); close(); });

    lb.addEventListener("click", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (box && !box.contains(e.target)) close();
    });

    box?.addEventListener("click", (e) => e.stopPropagation());

    prevBtn?.addEventListener("click", (e) => { e.stopPropagation(); prev(); });
    nextBtn?.addEventListener("click", (e) => { e.stopPropagation(); next(); });

    window.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });
  }

  // =====================================================
  // Observer: in-view triggers (counts + trust animations)
  // =====================================================
  function initInView(rootSection) {
    const trust = $(".wtg-trustCenter", rootSection);
    const counters = $$(".wtg-count[data-count]", rootSection);

    const runCountsOnce = (() => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        counters.forEach(animateCount);
      };
    })();

    if (reduceMotion) {
      trust?.classList.add("is-inview");
      runCountsOnce();
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (entry.target === trust) trust.classList.add("is-inview");
        runCountsOnce();
      });
    }, { threshold: 0.35 });

    if (trust) obs.observe(trust);
    obs.observe(rootSection);
  }

  // =====================================================
  // Scroll buttons inside cards (data-wtg-scroll)
  // =====================================================
  function initScrollButtons(rootSection) {
    const btns = $$("[data-wtg-scroll]", rootSection);
    btns.forEach(b => {
      b.addEventListener("click", () => {
        const target = b.getAttribute("data-wtg-scroll");
        if (target) smoothScrollTo(target);
      });
    });
  }

  // =====================================================
  // Boot
  // =====================================================
  const section = document.getElementById("wtgWhy");
  if (!section) return;

  initScrollButtons(section);
  initInView(section);

  const tabsSection = section.querySelector(".wtg-tabs");
  if (tabsSection) initTabs(tabsSection);

  const stepsSection = section.querySelector(".wtg-stepsWrap");
  if (stepsSection) initSteps(stepsSection);

  const gallerySection = section.querySelector(".wtg-gallery");
  if (gallerySection) initLightbox(gallerySection);
})();