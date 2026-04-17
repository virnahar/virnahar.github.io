/**
 * Tax Story — Alpine component with tax intelligence engine.
 * No artificial limits on year count; soft UX only for huge batches.
 */
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/+esm';
import Collapse from 'https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.14.3/dist/module.esm.js';
import { createEmptyState } from './model.js';
import { handleFiles } from './upload-handler.js';
import { flattenFilesWithZip } from './zip-utils.js';
import { renderIncomeLineChart, renderItrComparativeCharts, destroyChartOnCanvas, renderRadarChart, renderTaxBreakdownDonut, renderDeductionProgressBars, renderIncomeWaterfallData, renderRegimeComparisonBar } from './charts.js';
import { exportStoryPdf } from './export-pdf.js';
import { formatInrCompact } from './format-inr.js';
import { buildComparativeFromState, formatInrCell as formatInrTableCell } from './itr-comparative.js';
import { buildComparativeNarrative } from './comparative-narrative.js';
import { initScrollReveal, refreshScrollReveal } from './scroll-reveal.js';
import { buildInsightDeck } from './insights-deck.js';
import { formatRollFrame, prefersReducedMotion, rafThrottle, setPointerCssVars } from './motion-ui.js';
import { initHeroThreeScene } from './three-hero.js';
import { friendlyKind, confidenceLabel, sortFilesForDetectTable } from './detect-display.js';
import {
  compareRegimes,
  analyseDeductions,
  calculateNoticeRisk,
  computeEffectiveTaxRate,
  computeIncomeGrowth,
  fmtAmount,
} from './tax-engine.js';
import { buildDemoState } from './demo-data.js';
import { buildReviewCards } from './join-review.js';
import { mountDragScroll } from './drag-scroll.js';
import { observeCountUps, scanCountUps } from './count-up.js';
import { createComparativeTableMixin } from './comparative-table-mixin.js';
import { createIntelligenceActionsMixin } from './intelligence-actions-mixin.js';

Alpine.plugin(Collapse);
Alpine.data('taxStory', () => ({
  ...createComparativeTableMixin(),
  ...createIntelligenceActionsMixin(),
  state: createEmptyState(),
  dragOver: false,
  toast: '',
  ingestBusy: false,
  ingestPhase: '',
  ingestHint: '',
  /** Reactive 0..100 progress for the loading overlay bar */
  ingestProgress: 0,
  guideModalOpen: false,
  aisPdfPassword: '',
  /** PDF password modal state */
  pdfModalOpen: false,
  pdfModalPassword: '',
  pdfModalFileName: '',
  /** Files queued while waiting for password */
  _pendingIngestFiles: /** @type {File[] | null} */ (null),
  /** Upload modal */
  uploadModalOpen: false,
  /** Files-detected modal */
  detectModalOpen: false,
  /** Files staged in modal before user clicks Analyse */
  pendingUploadFiles: /** @type {File[]} */ ([]),
  glanceRoll: /** @type {Record<string, string>} */ ({}),
  railHover: false,
  railPinned: false,
  _glanceRollFrame: 0,
  _quoteIntervalId: 0,
  _ingestHintTimer: 0,
  _ingestHintIdx: 0,
  _ingestHints: [
    'Decrypting patterns across ITR, AIS and TIS records…',
    'Mapping each line item to its correct FY bucket…',
    'Cross-checking deductions and tax payable consistency…',
    'Building a clean narrative from raw portal exports…',
  ],
  _onRevealIn: /** @type {((ev: Event) => void) | null} */ (null),
  _onPtr: /** @type {((ev: PointerEvent) => void) | null} */ (null),
  /** @type {Awaited<ReturnType<typeof buildComparativeFromState>>} */
  comparativeSnap: /** @type {{ yearLabels: string[], displayRows: unknown[], subRows?: Record<string, unknown[]> } | null} */ ({ yearLabels: [], displayRows: [] }),
  comparativeNarrative: '',
  /** @type {Record<string, boolean>} */
  comparativeExpanded: {},
  /** Comparative table UX filters */
  comparativeSearch: '',
  comparativeOnlyChanged: false,
  /** Currently selected FY for detail analysis panels */
  selectedAnalysisFy: '',
  /** Action-center scenario knobs (seeded from selected FY once). */
  scenario80C: 0,
  scenario80D: 0,
  scenarioNps: 0,
  scenarioHra: 0,
  scenarioHomeLoan: 0,
  _scenarioSeedFy: '',
  /** Cached tax engine outputs */
  _regimeCache: /** @type {Record<string, unknown>} */ ({}),
  _riskCache: /** @type {Record<string, unknown>} */ ({}),
  /** Counter for hero rupee animation trigger */
  _heroAnimated: false,
  /** Active severity filter for review cards: 'all' | 'review' | 'watch' | 'info' | 'ok' */
  reviewFilter: 'all',
  /** Active FY filter for review cards: 'all' | a specific FY string like '2024-25' */
  reviewFyFilter: 'all',
  /** Ingest warnings/notes gathered from file parsing */
  _ingestNotices: /** @type {string[]} */ ([]),
  /** Drag-scroll controllers — mounted after data loads. */
  _dragReview: /** @type {{ destroy: () => void } | null} */ (null),
  _dragInsight: /** @type {{ destroy: () => void } | null} */ (null),
  /** Demo mode flag */
  isDemoMode: false,
  /** Quote rotation index */
  currentQuoteIdx: 0,
  /** Quotes for hero rotation */
  _quoteList: [
    { text: 'Every rupee you earned is documented. Every deduction you missed is money left behind.', attr: '— Tax Story' },
    { text: 'Your income arc tells a story. Four years of data reveals patterns no CA will spot.', attr: '— Tax Story' },
    { text: 'The gap between what AIS says and what you filed is where surprises hide. Find them first.', attr: '— Tax Story' },
    { text: 'Old regime or new? The right answer is worth thousands. Yours is calculated right here.', attr: '— Tax Story' },
    { text: 'Your ITR, AIS, and TIS — three documents, one picture. Private, local, instant.', attr: '— Tax Story' },
  ],
  _quoteTransitioning: false,
  /** Track if guide modal was opened from upload modal (to re-open on close) */
  _guideOpenedFromUpload: false,

  init() {
    this._onRevealIn = (ev) => {
      const t = ev.target;
      if (t instanceof Element && t.matches('.glance-strip')) this.triggerGlanceRoll();
    };
    this._onPtr = (ev) => setPointerCssVars(ev.clientX, ev.clientY);

    queueMicrotask(async () => {
      await this.paintCharts();
      await this.refreshComparative();
      requestAnimationFrame(() => {
        const root = this.$root || document.body;
        initScrollReveal(root);
        observeCountUps(root);
        root.addEventListener('scroll-reveal-in', this._onRevealIn);
        window.addEventListener('pointermove', this._onPtr, { passive: true });
        this.$nextTick(() => {
          const strip = root.querySelector?.('.glance-strip');
          if (strip?.classList.contains('scroll-reveal--in')) this.triggerGlanceRoll();
        });
      });
      const reducedMotion = prefersReducedMotion();
      // Init GSAP animations if available
      this._initGsap();
      // Start typewriter effect on hero headline
      this._initTypewriter();
      // Start quote rotation
      this._initQuoteRotation();
      // Custom rupee cursor + rupee trail
      this._initRupeeCursor();
      if (!reducedMotion) this._initCursorTrail();
      // Clean URL + stable hash behavior across refresh/navigation
      this._initUrlState();
      // Scrollspy for story rail active state
      this._initScrollSpy();
      // Apple-style scroll effects
      this._initScrollEffects();
    });
  },

  _initScrollEffects() {
    const reduced = prefersReducedMotion();

    // ── Scroll progress hairline ──────────────────────────────
    const progressEl = document.getElementById('scroll-progress');
    if (progressEl) {
      const updateProgress = rafThrottle(() => {
        const h = document.body.scrollHeight - window.innerHeight;
        progressEl.style.transform = h > 0 ? `scaleX(${window.scrollY / h})` : 'scaleX(0)';
      });
      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    }

    // ── Scroll-linked body depth glow (rAF-throttled) ────────────────────────
    const updateGlow = rafThrottle(() => {
      const total = document.body.scrollHeight - window.innerHeight;
      const pct = total > 0 ? window.scrollY / total : 0;
      const y = 8 + pct * 75;
      const intensity = (0.025 + pct * 0.02).toFixed(3);
      document.documentElement.style.setProperty('--scroll-glow-y', `${y}%`);
      document.documentElement.style.setProperty('--scroll-glow-intensity', intensity);
    });
    window.addEventListener('scroll', updateGlow, { passive: true });
    updateGlow();

    // ── Magnetic CTA buttons ─────────────────────────────────
    if (!reduced) {
      document.querySelectorAll('.btn--primary, .btn--demo').forEach(btn => {
        btn.addEventListener('mousemove', rafThrottle((e) => {
          const r = btn.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
          const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
          btn.style.transform = `translate(${(x * 5).toFixed(1)}px, ${(y * 3).toFixed(1)}px)`;
        }), { passive: true });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = '';
        });
      });
    }

    // ── Hero cursor spotlight (rAF-throttled) ──────────────────────────────────────
    const heroSection = document.getElementById('hero');
    if (heroSection && !reduced) {
      heroSection.addEventListener('mousemove', rafThrottle((e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
        heroSection.style.setProperty('--spotlight-x', x);
        heroSection.style.setProperty('--spotlight-y', y);
      }), { passive: true });
      heroSection.addEventListener('mouseleave', () => {
        heroSection.style.setProperty('--spotlight-x', '50%');
        heroSection.style.setProperty('--spotlight-y', '30%');
      }, { passive: true });
    }

    // ── Card cursor radial glow (rAF-throttled per card) ───────────────────
    const cardSelectors = '.intel-card, .glance-tile, .review-card, .insight-card';
    const setupCardGlow = () => {
      document.querySelectorAll(cardSelectors).forEach(card => {
        if (card.dataset.glowBound) return;
        card.dataset.glowBound = '1';
        card.addEventListener('mousemove', rafThrottle((e) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--card-mx', ((e.clientX - rect.left) / rect.width).toFixed(3));
          card.style.setProperty('--card-my', ((e.clientY - rect.top) / rect.height).toFixed(3));
        }), { passive: true });
        card.addEventListener('mouseleave', () => {
          card.style.setProperty('--card-mx', '0.5');
          card.style.setProperty('--card-my', '0.5');
        }, { passive: true });
      });
    };
    if (!reduced) {
      // Bind immediately + retry for Alpine-rendered cards
      setupCardGlow();
      setTimeout(setupCardGlow, 500);
      setTimeout(setupCardGlow, 1500);
    }
  },

  _initTypewriter() {
    const el = document.getElementById('hero-typewriter');
    const rotEl = document.getElementById('hero-rotating');
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = 'tax story';
      el.classList.add('tw-idle');
      if (rotEl) rotEl.textContent = 'every year, one place.';
      return;
    }

    const phrases = ['tax story', 'income arc', 'filing history'];
    const rotPhrases = ['every year, one place.', 'ITR · AIS · TIS — unified.', 'know before you file.'];
    let idx = 0;
    const full = phrases[0];

    // Type in the initial word letter by letter
    el.textContent = '';
    el.classList.remove('tw-idle');
    let charIdx = 0;

    const typeChar = () => {
      if (charIdx <= full.length) {
        el.textContent = full.slice(0, charIdx);
        charIdx++;
        setTimeout(typeChar, 60);
      } else {
        el.classList.add('tw-idle');
        // After initial type-in, start the cycling loop
        setTimeout(cyclePhrase, 2800);
      }
    };
    setTimeout(typeChar, 500);

    const cyclePhrase = () => {
      idx = (idx + 1) % phrases.length;
      const next = phrases[idx];
      const nextRot = rotPhrases[idx];

      // Fade out rotating subtitle
      if (rotEl) {
        rotEl.classList.add('tw-fade-out');
        setTimeout(() => {
          if (rotEl) { rotEl.textContent = nextRot; rotEl.classList.remove('tw-fade-out'); }
        }, 360);
      }

      // Delete current typewriter text
      el.classList.remove('tw-idle');
      let cur = el.textContent;
      const deleteChar = () => {
        if (cur.length > 0) {
          cur = cur.slice(0, -1);
          el.textContent = cur;
          setTimeout(deleteChar, 38);
        } else {
          // Type new phrase
          let c = 0;
          const typeNext = () => {
            if (c <= next.length) {
              el.textContent = next.slice(0, c);
              c++;
              setTimeout(typeNext, 58);
            } else {
              el.classList.add('tw-idle');
              setTimeout(cyclePhrase, 2800);
            }
          };
          setTimeout(typeNext, 120);
        }
      };
      setTimeout(deleteChar, 200);
    };
  },

  _initQuoteRotation() {
    const quotes = this._quoteList;
    if (!quotes || quotes.length < 2) return;
    if (prefersReducedMotion()) {
      this.currentQuoteIdx = 0;
      return;
    }
    // Clear any previous interval so re-inits don't stack
    if (this._quoteIntervalId) clearInterval(this._quoteIntervalId);
    const rotate = () => {
      this._quoteTransitioning = true;
      setTimeout(() => {
        this.currentQuoteIdx = (this.currentQuoteIdx + 1) % quotes.length;
        this._quoteTransitioning = false;
      }, 450);
    };
    this._quoteIntervalId = setInterval(rotate, 5000);
  },

  _initRupeeCursor() {
    if (!window.matchMedia('(pointer:fine)').matches) return;
    const cursor = document.getElementById('rupee-cursor');
    if (!cursor) return;
    document.body.classList.add('tax-story--rupee-cursor');
    let frame = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    const paint = () => {
      frame = 0;
      cursor.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
    };
    const updateTarget = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', updateTarget, { passive: true });
    window.addEventListener('pointerdown', () => cursor.classList.add('rupee-cursor--active'), { passive: true });
    window.addEventListener('pointerup', () => cursor.classList.remove('rupee-cursor--active'), { passive: true });
    paint();
  },

  _initCursorTrail() {
    const canvas = document.getElementById('cursor-trail-canvas');
    if (!canvas) return;
    if (prefersReducedMotion()) return;

    let lastX = 0, lastY = 0, lastSpawn = 0, lastTs = performance.now();
    let liveCount = 0;
    const MIN_DIST = 8;
    const SPAWN_GAP = 40;

    const createParticle = (x, y, vx = 0, vy = 0) => {
      const el = document.createElement('span');
      const size = 9 + Math.random() * 10;
      const rot = (Math.random() - 0.5) * 90;
      const driftX = (Math.random() - 0.5) * 22 - vx * (0.18 + Math.random() * 0.18);
      const driftY = -(18 + Math.random() * 28) - vy * (0.14 + Math.random() * 0.2);
      const opacity = 0.6 + Math.random() * 0.35;
      const hue = Math.random() > 0.25 ? '212,175,55' : '245,195,85';
      const duration = 620 + Math.random() * 260;
      el.textContent = '₹';
      el.style.cssText = [
        'position:absolute',
        `font-family:'Noto Sans Devanagari','DM Sans',sans-serif`,
        `font-size:${size}px`,
        `font-weight:700`,
        `color:rgba(${hue},${opacity})`,
        `left:${x}px`,
        `top:${y}px`,
        `opacity:1`,
        `transform:translate(-50%,-50%) rotate(${rot}deg) scale(1)`,
        'pointer-events:none',
        'user-select:none',
        `text-shadow:0 0 10px rgba(${hue},0.65),0 0 24px rgba(212,175,55,0.28)`,
        `transition:opacity ${duration}ms cubic-bezier(0.22,0.61,0.36,1),transform ${duration}ms cubic-bezier(0.22,0.61,0.36,1)`,
        'will-change:opacity,transform',
      ].join(';');
      canvas.appendChild(el);
      liveCount += 1;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = '0';
          el.style.transform = `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) rotate(${rot + (Math.random() - 0.5) * 40}deg) scale(0.2)`;
        });
      });
      setTimeout(() => {
        if (el.parentNode) el.remove();
        liveCount = Math.max(0, liveCount - 1);
      }, duration + 120);
    };

    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = Math.max(1, now - lastTs);
      const vx = dx / dt * 16;
      const vy = dy / dt * 16;
      if (dist < MIN_DIST || now - lastSpawn < SPAWN_GAP) return;
      if (liveCount > 110) return;
      lastX = e.clientX;
      lastY = e.clientY;
      lastSpawn = now;
      lastTs = now;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const burst = speed > 32 ? 2 : 1;
      for (let i = 0; i < burst; i += 1) {
        const jitterX = (Math.random() - 0.5) * 12;
        const jitterY = (Math.random() - 0.5) * 8;
        window.setTimeout(() => {
          createParticle(e.clientX + jitterX, e.clientY + jitterY, vx, vy);
        }, i * 16);
      }
    }, { passive: true });
  },

  _initUrlState() {
    const ids = new Set(['main', 'hero', 'arc', 'intelligence', 'itr-comparative', 'insights', 'review', 'export', 'faq', 'learn']);
    const base = () => `${window.location.pathname}${window.location.search}`;
    if (window.location.pathname.endsWith('/index.html')) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/');
      window.history.replaceState(null, '', `${cleanPath}${window.location.search}${window.location.hash}`);
    }
    const goToHash = (hash, scrubInvalid = false) => {
      const id = decodeURIComponent(String(hash || '').replace(/^#/, ''));
      if (!id) return;
      if (!ids.has(id)) {
        if (scrubInvalid) window.history.replaceState(null, '', base());
        return;
      }
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: this._scrollBehavior(), block: 'start' });
    };
    if (window.location.hash) {
      window.setTimeout(() => goToHash(window.location.hash, true), 80);
    }
    window.addEventListener('hashchange', () => goToHash(window.location.hash, true), { passive: true });
    document.addEventListener('click', (ev) => {
      const anchor = ev.target instanceof Element ? ev.target.closest('a[href^="#"]') : null;
      if (!anchor) return;
      if (!anchor.classList.contains('story-rail__item')) return;
      const href = anchor.getAttribute('href') || '';
      const id = decodeURIComponent(href.replace(/^#/, ''));
      if (!id || !ids.has(id)) return;
      const el = document.getElementById(id);
      if (!el) return;
      ev.preventDefault();
      window.history.replaceState(null, '', `${base()}#${id}`);
      el.scrollIntoView({ behavior: this._scrollBehavior(), block: 'start' });
    }, { passive: false });
  },

  _initScrollSpy() {
    // Include 'hero' so the Home link is active while user is in the hero section
    const ids = ['hero', 'arc', 'intelligence', 'itr-comparative', 'insights', 'review', 'export', 'faq', 'learn'];
    const getLink = id => document.querySelector(`.story-rail__item[href="#${id}"]`);

    if (this._scrollSpyHandler) {
      window.removeEventListener('scroll', this._scrollSpyHandler);
      this._scrollSpyHandler = null;
    }

    // Get absolute document top position — always accurate even inside x-show sections
    const getDocTop = el => el.getBoundingClientRect().top + window.scrollY;

    const updateActive = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const triggerPos = scrollY + window.innerHeight * 0.38;
      let activeId = null;

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (window.getComputedStyle(el).display === 'none') continue;
        if (getDocTop(el) <= triggerPos) activeId = id;
      }

      ids.forEach(id => {
        const link = getLink(id);
        if (link) link.classList.toggle('story-rail__item--active', id === activeId);
      });
      // Keep URL stable on normal scroll; only explicit section clicks set hash.
    };

    this._scrollSpyHandler = updateActive;
    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
    [400, 1200, 2500, 4000].forEach(t => setTimeout(updateActive, t));
  },

  _initGsap() {
    if (prefersReducedMotion()) {
      try {
        if (window.ScrollTrigger?.getAll) {
          window.ScrollTrigger.getAll().forEach((t) => t.kill());
        }
      } catch {}
    }
    try {
      if (prefersReducedMotion()) return;
      if (!window.gsap) return;
      const gsap = window.gsap;
      document.body.classList.add('gsap-loaded');

      // Rupee SVG orbit — continuous rotation
      gsap.to('.rupee-orbit', {
        rotation: 360, duration: 28, repeat: -1, ease: 'none',
        svgOrigin: '210 165',
      });

      if (window.ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);

        // Hero visual parallax
        gsap.to('.hero-visual', {
          y: -40, ease: 'none',
          scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 2 },
        });

        // Hero badges stagger entrance
        gsap.fromTo('.hero-badge',
          { y: 16, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.2, ease: 'back.out(1.6)', delay: 0.5 });

        if (document.querySelector('.hero-actions .btn')) {
          gsap.fromTo('.hero-actions .btn',
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, stagger: 0.12, ease: 'power3.out', delay: 0.8 });
        }

        // Hero features stagger
        gsap.from('.hero-feature--reveal', {
          immediateRender: false,
          opacity: 0, x: -18, duration: 0.65, stagger: 0.1, ease: 'power3.out', delay: 0.35,
          scrollTrigger: { trigger: '.hero-features', start: 'top 88%', once: true },
        });

        // Glance tiles — spring scale entrance (retry for Alpine x-for)
        const tryGlanceTiles = () => {
          let attempts = 0;
          const maxAttempts = 25;
          const retry = () => {
            attempts += 1;
            if (attempts > maxAttempts) return;
            setTimeout(run, 400);
          };
          const run = () => {
            if (prefersReducedMotion()) return;
            if (!this.hasRealData()) return;
            const tiles = document.querySelectorAll('.glance-tile');
            if (!tiles.length) { retry(); return; }
            gsap.from(tiles, {
              immediateRender: false,
              scale: 0.85, opacity: 0, y: 28,
              duration: 0.62, stagger: 0.065, ease: 'back.out(1.7)',
              scrollTrigger: { trigger: '.glance-strip', start: 'top 88%', once: true },
            });
          };
          run();
        };
        setTimeout(tryGlanceTiles, 300);

        // ── Global scroll — hero lede and headline sub-elements ─────────────
        gsap.from('.hero-lede-reveal', {
          immediateRender: false,
          opacity: 0, y: 24, duration: 0.85, ease: 'power2.out',
          scrollTrigger: { trigger: '.hero-lede-reveal', start: 'top 90%', once: true },
        });

        // ── Arc bento on first load — scrub-linked subtle parallax ──────────
        gsap.to('.arc-bento', {
          y: -20, ease: 'none',
          scrollTrigger: { trigger: '#arc', start: 'top bottom', end: 'bottom top', scrub: 2.5 },
        });
      }
    } catch { /* gsap not loaded */ }

    // Three.js hero particle field (runs independently of GSAP)
    try {
      const heroCanvas = document.getElementById('hero-three-canvas');
      if (heroCanvas) {
        this._heroThreeCleanup = initHeroThreeScene(heroCanvas);
      }
    } catch { /* three.js not loaded or canvas missing */ }
  },

  /**
   * Set up GSAP scroll animations for elements rendered by Alpine after data loads.
   * Uses data-g-done guards to prevent double-animating on repeated calls.
   * Called from loadDemo() and handleFiles() after state is populated and DOM updated.
   */
  _refreshGsapForData() {
    if (prefersReducedMotion()) return;
    try {
      if (!window.gsap || !window.ScrollTrigger) return;
      const gsap = window.gsap;
      const ST = window.ScrollTrigger;

      // ── Chapter titles — fade + lift ──────────────────────────────────────
      document.querySelectorAll('.chapter__title').forEach(el => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        // Skip if already in viewport — no need to animate what the user can already see
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) return;
        gsap.from(el, {
          immediateRender: false,
          opacity: 0, y: 20, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      // ── Chapter leads — fade + lift ────────────────────────────────────────
      document.querySelectorAll('.chapter__lead').forEach(el => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        // Skip if already in viewport — prevents flash of invisible text on page load
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.88) return;
        gsap.from(el, {
          immediateRender: false,
          opacity: 0, y: 22, duration: 0.88, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      // ── Chapter heading icon wraps — spring drop-in ────────────────────────
      document.querySelectorAll('.chapter-heading__icon-wrap').forEach(el => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        // Skip if already in viewport — avoids rendering element invisible on load
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) return;
        gsap.fromTo(el,
          { scale: 0.45, opacity: 0, rotate: -20, y: -10 },
          { scale: 1, opacity: 1, rotate: 0, y: 0, duration: 0.68, ease: 'back.out(2.2)',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true } }
        );
      });

      // ── Intel cards — spring stagger from below ────────────────────────────
      document.querySelectorAll('.intel-card').forEach((el, i) => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          y: 60, opacity: 0, scale: 0.93,
          duration: 0.75, ease: 'back.out(1.4)',
          delay: Math.min(i * 0.06, 0.36),
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        });
      });

      // ── Glance tiles — animate when data-driven tiles render later ─────────
      const glanceTiles = document.querySelectorAll('.glance-tile');
      if (glanceTiles.length) {
        glanceTiles.forEach((el) => {
          if (el.dataset.gDone) return;
          el.dataset.gDone = '1';
        });
        gsap.from(glanceTiles, {
          immediateRender: false,
          scale: 0.9,
          opacity: 0,
          y: 20,
          duration: 0.55,
          stagger: 0.05,
          ease: 'back.out(1.45)',
          scrollTrigger: { trigger: '.glance-strip', start: 'top 88%', once: true },
        });
      }

      // ── Review/insight carousels use native scroll-snap + drag-scroll.
      // (No per-card GSAP scroll animations to avoid transform conflicts)

      // ── Arc bento sections — stagger from below ────────────────────────────
      document.querySelectorAll('.arc-bento__main, .arc-bento__stats, .arc-bento__years').forEach((el, i) => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          y: 35, opacity: 0,
          duration: 0.78, ease: 'power3.out',
          delay: i * 0.12,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });

      // ── Chart shells — fade + lift stagger ────────────────────────────────
      document.querySelectorAll('.chart-shell').forEach((el, i) => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          y: 38, opacity: 0,
          duration: 0.72, ease: 'power2.out',
          delay: Math.min(i * 0.09, 0.36),
          scrollTrigger: { trigger: el, start: 'top 91%', once: true },
        });
      });

      // ── Comparative narrative — spring from left ───────────────────────────
      document.querySelectorAll('.comparative-narrative').forEach(el => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          opacity: 0, x: -32, duration: 0.72, ease: 'back.out(1.5)',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      // ── Risk gauge — stroke count-up ──────────────────────────────────────
      const riskGauge = document.querySelector('.risk-gauge__fill');
      if (riskGauge && !riskGauge.dataset.gDone) {
        riskGauge.dataset.gDone = '1';
        const target = riskGauge.getAttribute('stroke-dasharray') || '0 157';
        gsap.fromTo(riskGauge,
          { strokeDasharray: '0 157' },
          { immediateRender: false, strokeDasharray: target, duration: 1.5, ease: 'power2.out',
            scrollTrigger: { trigger: riskGauge, start: 'top 85%', once: true } }
        );
      }

      // ── Year chips — pop in stagger ───────────────────────────────────────
      document.querySelectorAll('.year-chip').forEach((el, i) => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          scale: 0.75, opacity: 0, y: 14,
          duration: 0.5, ease: 'back.out(2.2)',
          delay: Math.min(i * 0.045, 0.25),
          scrollTrigger: { trigger: el.parentElement || el, start: 'top 90%', once: true },
        });
      });

      // ── Card stat values in intel section — subtle scale-in ──────────────
      document.querySelectorAll('.intel-card__stat, .regime-row').forEach((el, i) => {
        if (el.dataset.gDone) return;
        el.dataset.gDone = '1';
        gsap.from(el, {
          immediateRender: false,
          opacity: 0, x: -10, duration: 0.5, ease: 'power2.out',
          delay: Math.min(i * 0.04, 0.3),
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        });
      });

      // ── 3D tilt on all card types ─────────────────────────────────────
      this._addCardTilt3D();

      // Refresh all ScrollTriggers after new elements are registered
      ST.refresh();

    } catch { /* gsap not available */ }
  },

  // 3D perspective tilt on hover for cards
  _addCardTilt3D() {
    if (prefersReducedMotion()) return;
    const selectors = '.review-card, .insight-card, .intel-card, .glance-tile';
    document.querySelectorAll(selectors).forEach(el => {
      if (el.dataset.tilt3d) return;
      el.dataset.tilt3d = '1';
      const maxDeg = el.matches('.intel-card') ? 8 : 12;
      const scale = el.matches('.glance-tile') ? 1.02 : 1.03;

      el.addEventListener('mousemove', rafThrottle((e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5);
        const y = ((e.clientY - r.top) / r.height - 0.5);
        el.style.transform = `perspective(700px) rotateX(${(-y * maxDeg).toFixed(2)}deg) rotateY(${(x * maxDeg).toFixed(2)}deg) scale(${scale}) translateZ(6px)`;
      }), { passive: true });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  },

  /** Navigate to a section and optionally set the analysis FY */
  focusFy(fy) {
    if (!fy) return;
    // Set the FY selector
    this.selectedAnalysisFy = fy;
    this._scenarioSeedFy = '';
    // Scroll to intelligence section if it has data
    const itr = this.getItrForFy(fy);
    if (itr?.hasData) {
      const el = document.getElementById('intelligence');
      if (el) el.scrollIntoView({ behavior: this._scrollBehavior(), block: 'start' });
    }
  },

  // ─── Data helpers ──────────────────────────────────────────────────────────

  /** @returns {boolean} */
  hasRealData() {
    return this.state.files.length > 0;
  },

  showExport() {
    return this.hasRealData() && this.fyCount() > 0;
  },

  sortedFyKeys() {
    return Array.from(this.state.years.keys()).sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });
  },

  fysForScrubber() {
    return this.hasRealData() ? this.sortedFyKeys() : [];
  },

  fyCount() {
    return this.state.years.size;
  },

  hasArcGross() {
    if (!this.hasRealData()) return false;
    for (const fy of this.sortedFyKeys()) {
      const g = this.state.years.get(fy)?.itr?.grossIncome;
      if (g != null && Number.isFinite(g) && g > 0) return true;
    }
    return false;
  },

  fileCount() {
    return this.state.files.length;
  },

  reviewCards() {
    return this.state.reviewCards ?? [];
  },

  reviewCardsBySeverity() {
    const cards = this.reviewCards();
    return {
      review: cards.filter((c) => c.severity === 'review'),
      watch: cards.filter((c) => c.severity === 'watch'),
      info: cards.filter((c) => c.severity === 'info'),
      ok: cards.filter((c) => c.severity === 'ok'),
    };
  },

  filteredReviewCards() {
    let cards = this.reviewCards();
    if (this.reviewFilter !== 'all') {
      cards = cards.filter((c) => c.severity === this.reviewFilter);
    }
    if (this.reviewFyFilter && this.reviewFyFilter !== 'all') {
      cards = cards.filter((c) => c.fy === this.reviewFyFilter);
    }
    return cards;
  },

  /** Distinct FYs present in review cards, sorted chronologically. */
  fysWithReviewCards() {
    const set = new Set();
    for (const c of this.reviewCards()) {
      if (c.fy) set.add(c.fy);
    }
    return [...set].sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });
  },

  yearRow(fy) {
    return this.state.years.get(fy);
  },

  showItrComparative() {
    return !!(this.comparativeSnap?.yearLabels?.length >= 1 && this.state.files.length > 0);
  },

  /** @param {'salary' | 'other' | 'cg'} kind */
  comparativeSubRows(kind) {
    const s = this.comparativeSnap;
    if (!s) return [];
    if (kind === 'salary') return s.salarySubRows ?? [];
    if (kind === 'other') return s.otherSubRows ?? [];
    if (kind === 'cg') return s.cgSubRows ?? [];
    return [];
  },

  /** @param {{ bracket?: boolean; values: number[] }} sub @param {number} i */
  formatCompSubCell(sub, i) {
    const v = sub?.values?.[i];
    if (v == null || !Number.isFinite(v)) return '—';
    const s = formatInrTableCell(v);
    if (sub.bracket && v > 0) return `(${s})`;
    return s;
  },

  toggleComparativeRow(id) {
    this.comparativeExpanded = { ...this.comparativeExpanded, [id]: !this.comparativeExpanded[id] };
  },

  isComparativeRowOpen(id) {
    return !!this.comparativeExpanded[id];
  },

  // ─── Tax Intelligence Engine ───────────────────────────────────────────────

  /** Returns the latest FY that has ITR data */
  latestItrFy() {
    const keys = this.sortedFyKeys();
    for (let i = keys.length - 1; i >= 0; i--) {
      const row = this.state.years.get(keys[i]);
      if (row?.itr?.hasData) return keys[i];
    }
    return keys[keys.length - 1] ?? '';
  },

  /** @param {string} fy */
  getItrForFy(fy) {
    return this.state.years.get(fy)?.itr ?? null;
  },

  /**
   * Standard deduction limit for the ITR at this FY.
   * New regime: ₹75k from FY 24-25 onward; ₹50k for FY 23-24; ₹0 earlier.
   * Old regime: ₹50k for FY 18-19 onward.
   * @param {string} fy
   */
  stdDeductionLimitFor(fy) {
    const itr = this.getItrForFy(fy);
    if (!itr?.hasData) return 0;
    const m = String(fy).match(/(\d{4})/);
    const y = m ? parseInt(m[1], 10) : 0;
    if (itr.taxRegimeKey === 'new') {
      if (y >= 2024) return 75000;
      if (y === 2023) return 50000;
      return 0;
    }
    return y >= 2018 ? 50000 : 0;
  },

  /** @param {string} fy */
  getAisForFy(fy) {
    return this.state.years.get(fy)?.ais ?? null;
  },

  /** Tax regime comparison for a given FY */
  regimeComparison(fy) {
    const itr = this.getItrForFy(fy);
    if (!itr?.hasData || !itr.grossIncome) return null;
    const cacheKey = fy + (itr.grossIncome || 0);
    if (this._regimeCache[cacheKey]) return this._regimeCache[cacheKey];
    try {
      const d = itr.deductions ?? {};
      // Prefer explicit Form-16 gross salary; otherwise reconstruct from post-std-deduction salary + std + HRA exempt.
      let grossSalary = itr.grossSalaryIncome;
      if (grossSalary == null || !Number.isFinite(grossSalary) || grossSalary <= 0) {
        const sal = itr.salaryIncome ?? 0;
        const std = d.standardDeduction ?? 0;
        const hraEx = d.hraExemption ?? 0;
        grossSalary = sal + std + hraEx;
      }
      if (grossSalary <= 0) grossSalary = itr.grossIncome ?? 0;
      // Keep regime comparison salary-focused: capital gains are often taxed at
      // special rates and can distort slab-only compare output.
      const nonSalary = (itr.grossIncome ?? 0) - (itr.salaryIncome ?? 0);
      const specialRateCg = Math.max(0, itr.capitalGains?.totalCg ?? 0);
      const other = Math.max(0, nonSalary - specialRateCg);
      const result = compareRegimes(grossSalary, other, {
        sec80C: d.section80C ?? 0,
        sec80D: d.section80D ?? 0,
        hra: d.hraExemption ?? 0,
        nps80CCD: d.npsDeduction ?? 0,
        homeLoan: d.homeLoanInterest ?? 0,
        sec80TTA: d.section80TTA ?? 0,
      }, fy);
      this._regimeCache[cacheKey] = result;
      return result;
    } catch { return null; }
  },

  /** Deduction efficiency analysis for a FY */
  deductionAnalysis(fy) {
    const itr = this.getItrForFy(fy);
    if (!itr?.hasData || !itr.deductions) return null;
    try {
      return analyseDeductions(itr.deductions);
    } catch { return null; }
  },

  /** Notice risk score for a FY */
  noticeRisk(fy) {
    const cacheKey = `${fy}-risk`;
    if (this._riskCache[cacheKey]) return this._riskCache[cacheKey];
    const itr = this.getItrForFy(fy);
    const ais = this.getAisForFy(fy);
    try {
      const result = calculateNoticeRisk(itr, ais, fy);
      this._riskCache[cacheKey] = result;
      return result;
    } catch { return null; }
  },

  /** Overall notice risk across all FYs */
  overallNoticeRisk() {
    let maxScore = 0;
    let worstFy = '';
    for (const fy of this.sortedFyKeys()) {
      const risk = this.noticeRisk(fy);
      if (risk && risk.score > maxScore) {
        maxScore = risk.score;
        worstFy = fy;
      }
    }
    if (!worstFy) return null;
    const risk = this.noticeRisk(worstFy);
    return { ...risk, fy: worstFy };
  },

  /** Effective tax rate for latest ITR FY */
  effectiveTaxRate() {
    const fy = this.latestItrFy();
    const itr = this.getItrForFy(fy);
    if (!itr) return null;
    return computeEffectiveTaxRate(itr);
  },

  /** Income growth over years */
  incomeGrowthSeries() {
    return computeIncomeGrowth(this.state.years);
  },

  /** Formatted INR amount */
  fmtInr(n) {
    return fmtAmount(n);
  },

  /** Total gross income across all ITR FYs */
  totalLifetimeEarnings() {
    let total = 0;
    for (const fy of this.sortedFyKeys()) {
      const g = this.state.years.get(fy)?.itr?.grossIncome;
      if (g != null && Number.isFinite(g)) total += g;
    }
    return total > 0 ? total : null;
  },

  /**
   * Total tax burden across all FYs — uses gross tax liability (before TDS
   * offset). `netTaxPayable` alone misses refund years entirely and understates
   * the true lifetime tax cost. Priority:
   *   1. taxLiability.taxPayable (gross liability)
   *   2. max(netTaxPayable, 0) + tdsTotal  (reconstruct gross from net + TDS)
   *   3. tdsTotal (fallback — at minimum what was withheld)
   */
  totalTaxPaid() {
    let total = 0;
    for (const fy of this.sortedFyKeys()) {
      const itr = this.state.years.get(fy)?.itr;
      if (!itr) continue;
      const gross = itr.taxLiability?.taxPayable;
      if (gross != null && Number.isFinite(gross) && gross > 0) {
        total += gross;
        continue;
      }
      const net = itr.taxLiability?.netTaxPayable ?? 0;
      const tds = itr.tdsTotal ?? 0;
      const reconstruct = Math.max(0, net) + Math.max(0, tds);
      if (reconstruct > 0) total += reconstruct;
    }
    return total > 0 ? total : null;
  },

  /** Full name from the latest ITR that has personal info */
  taxpayerName() {
    for (const fy of this.sortedFyKeys().reverse()) {
      const itr = this.getItrForFy(fy);
      if (itr?.firstName || itr?.surName) {
        const parts = [itr.firstName, itr.surName].filter(Boolean);
        return parts.join(' ').trim();
      }
    }
    return '';
  },

  /** First name only (title-cased) — friendlier for greeting */
  taxpayerFirstName() {
    const full = this.taxpayerName();
    if (!full) return '';
    const first = full.split(/\s+/)[0] || full;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  },

  /**
   * Return an inline SVG logo string for known employer names, or empty
   * string. Used to render a recognisable mark alongside the employer name
   * in the glance tile. Currently ships an Apple silhouette.
   * @param {string} name
   */
  employerLogoSvg(name) {
    if (!name) return '';
    const key = String(name).toLowerCase().trim();
    // Classic Apple silhouette (bitten apple) — iconic + instantly recognisable.
    if (/\bapple\b/.test(key)) {
      return `<svg class="employer-logo employer-logo--apple" viewBox="0 0 17 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13.27 10.29c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.64-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.65.87-.76 0-1.92-.85-3.15-.82-1.62.02-3.12.94-3.95 2.39-1.69 2.93-.43 7.26 1.21 9.63.8 1.16 1.76 2.46 3.01 2.41 1.21-.05 1.67-.78 3.14-.78 1.47 0 1.87.78 3.15.76 1.3-.02 2.13-1.18 2.92-2.35.92-1.35 1.3-2.66 1.32-2.73-.03-.01-2.54-.97-2.57-3.88zM11.17 3.13c.67-.81 1.12-1.94.99-3.06-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.02 2.97 1.08.08 2.18-.55 2.85-1.36z"/></svg>`;
    }
    return '';
  },

  /** Primary employer display name from latest ITR */
  taxpayerEmployer() {
    for (const fy of this.sortedFyKeys().reverse()) {
      const itr = this.getItrForFy(fy);
      if (itr?.employerName) return itr.employerName;
    }
    return '';
  },

  /** Filing city from latest ITR (skips IP addresses and numeric-only values) */
  taxpayerCity() {
    const isValidCity = (s) => s && s.length >= 2 && !/^\d+[\d.]*$/.test(s) && !/^\d{2,3}\.\d/.test(s);
    for (const fy of this.sortedFyKeys().reverse()) {
      const itr = this.getItrForFy(fy);
      if (itr?.city && isValidCity(itr.city)) return itr.city;
    }
    return '';
  },

  /** Tax regime label from latest ITR FY */
  latestTaxRegimeLabel() {
    const fy = this.latestItrFy();
    const itr = this.getItrForFy(fy);
    return itr?.taxRegimeLabel || '';
  },

  /** Short regime label for chips/badges — "Old Regime" or "New Regime" */
  latestRegimeShort() {
    const fy = this.latestItrFy();
    const itr = this.getItrForFy(fy);
    if (!itr?.taxRegimeKey) return '';
    return itr.taxRegimeKey === 'old' ? 'Old Regime' : 'New Regime';
  },

  /** Does any FY have tax engine data? */
  hasTaxIntelligence() {
    if (!this.hasRealData()) return false;
    const fy = this.latestItrFy();
    const itr = this.getItrForFy(fy);
    return !!(itr?.hasData && itr.grossIncome);
  },

  /** Income composition segments for latest FY donut */
  incomeComposition() {
    const fy = this.latestItrFy();
    const itr = this.getItrForFy(fy);
    if (!itr?.hasData) return [];
    const segments = [];
    if ((itr.salaryIncome ?? 0) > 0) segments.push({ label: 'Salary', value: itr.salaryIncome, color: '#d4af37' });
    if ((itr.housePropertyIncome ?? 0) !== 0) segments.push({ label: 'House Property', value: Math.abs(itr.housePropertyIncome ?? 0), color: '#f59e0b' });
    if ((itr.capitalGains?.totalCg ?? 0) > 0) segments.push({ label: 'Capital Gains', value: itr.capitalGains?.totalCg, color: '#a78bfa' });
    if ((itr.dividendIncome ?? 0) > 0) segments.push({ label: 'Dividend', value: itr.dividendIncome, color: '#38bdf8' });
    if ((itr.interestIncome ?? 0) > 0) segments.push({ label: 'Interest', value: itr.interestIncome, color: '#5ead9a' });
    if ((itr.businessIncome ?? 0) > 0) segments.push({ label: 'Business', value: itr.businessIncome, color: '#fb923c' });
    return segments;
  },

  /** AIS category breakdown for latest FY */
  aisBreakdown() {
    const fy = this.latestItrFy();
    const ais = this.getAisForFy(fy);
    if (!ais?.hasData) return [];
    const cats = [
      { label: 'Salary', value: ais.salaryTotal, color: '#d4af37' },
      { label: 'Interest (Savings)', value: ais.interestSavings, color: '#5ead9a' },
      { label: 'Interest (FD/RD)', value: ais.interestFD, color: '#34d399' },
      { label: 'Dividend', value: ais.dividendTotal, color: '#38bdf8' },
      { label: 'Capital Gains (MF)', value: ais.capitalGainsMF, color: '#a78bfa' },
      { label: 'Capital Gains (Equity)', value: ais.capitalGainsEquity, color: '#c4b5fd' },
      { label: 'Rent', value: ais.rentTotal, color: '#f59e0b' },
      { label: 'TDS Credits', value: ais.tdsTotal, color: '#f43f5e' },
    ];
    return cats.filter((c) => (c.value ?? 0) > 0);
  },

  /** FY list that has any ITR data for the selector */
  fyListWithItr() {
    return this.sortedFyKeys().filter((fy) => this.state.years.get(fy)?.itr?.hasData);
  },

  /** Selected FY for analysis (init to latest) */
  getSelectedFy() {
    if (!this.selectedAnalysisFy) {
      this.selectedAnalysisFy = this.latestItrFy();
    }
    return this.selectedAnalysisFy;
  },

  // ─── Glance strip ──────────────────────────────────────────────────────────

  /** @param {{ key: string; value: string }} item */
  glanceDisplay(item) {
    const r = this.glanceRoll[item.key];
    return r != null && r !== '' ? r : item.value;
  },

  triggerGlanceRoll() {
    const stats = this.glanceStats();
    if (!stats.length) {
      this.glanceRoll = {};
      return;
    }
    this._glanceRollFrame += 1;
    const frameId = this._glanceRollFrame;
    if (prefersReducedMotion()) {
      const o = {};
      for (const s of stats) o[s.key] = s.value;
      this.glanceRoll = o;
      return;
    }
    const totalDur = 1680;
    const stagger = 78;
    const start = performance.now();
    const tick = (now) => {
      if (frameId !== this._glanceRollFrame) return;
      const elapsed = now - start;
      const o = {};
      for (let i = 0; i < stats.length; i++) {
        const s = stats[i];
        const delay = i * stagger;
        let t = (elapsed - delay) / totalDur;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        if (!s.roll) {
          o[s.key] = s.value;
          continue;
        }
        o[s.key] = t >= 1 ? s.value : formatRollFrame(s.roll, t, formatInrCompact);
      }
      this.glanceRoll = o;
      if (elapsed < totalDur + stats.length * stagger) {
        requestAnimationFrame(tick);
      } else {
        const fin = {};
        for (const s of stats) fin[s.key] = s.value;
        this.glanceRoll = fin;
      }
    };
    requestAnimationFrame(tick);
  },

  glanceStats() {
    if (!this.hasRealData()) return [];
    const keys = this.sortedFyKeys();
    const rc = this.state.reviewCards ?? [];
    if (!keys.length) {
      return [
        { key: 'files', icon: 'description', label: 'Files loaded', value: String(this.fileCount()), roll: { type: 'int', n: this.fileCount() }, colorClass: 'sky' },
        { key: 'fy', icon: 'calendar_month', label: 'FYs detected', value: '0', roll: { type: 'int', n: 0 }, colorClass: 'purple' },
        { key: 'hint', icon: 'tips_and_updates', label: 'Next step', value: 'Add FY in filenames or check JSON fields', colorClass: 'gold' },
        { key: 'checks', icon: 'policy', label: 'Open checks', value: String(rc.length), roll: { type: 'int', n: rc.length }, colorClass: 'amber' },
        { key: 'pad', icon: 'hourglass_empty', label: 'Arc & chips', value: 'After FY parses', colorClass: 'gold' },
      ];
    }

    let joined = 0;
    const grossSeries = [];
    for (const fy of keys) {
      const y = this.state.years.get(fy);
      const itr = y?.sources?.some((s) => s.kind === 'itr_json' || s.kind === 'itr_xml');
      const ais = y?.sources?.some((s) => s.kind === 'ais_json');
      const tis = y?.sources?.some((s) => s.kind === 'tis_pdf');
      if (itr && ais) joined += 1;
      const g = y?.itr?.grossIncome;
      if (g != null) grossSeries.push(g);
    }

    const lastG = grossSeries.length ? grossSeries[grossSeries.length - 1] : null;
    const prevG = grossSeries.length >= 2 ? grossSeries[grossSeries.length - 2] : null;
    let yoyStr = '—';
    let yoyRoll;
    if (lastG != null && prevG != null && prevG > 0) {
      const yoy = ((lastG - prevG) / prevG) * 100;
      yoyStr = `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`;
      yoyRoll = { type: 'percent', v: yoy, decimals: 1 };
    }

    const lastKey = keys[keys.length - 1];
    const lastRow = this.state.years.get(lastKey);
    let salaryShare = '—';
    let salaryRoll;
    if (lastRow?.itr?.grossIncome > 0 && lastRow?.itr?.salaryIncome != null) {
      const pct = Math.min(100, Math.round((lastRow.itr.salaryIncome / lastRow.itr.grossIncome) * 100));
      salaryShare = `${pct}%`;
      salaryRoll = { type: 'percentInt', n: pct };
    }

    // Short regime display — "Old" or "New" as the main value,
    // with the form label (ITR-1 / ITR-2) in the sub line.
    const regimeKey = lastRow?.itr?.taxRegimeKey;
    const regimeShort = regimeKey === 'new' ? 'New' : regimeKey === 'old' ? 'Old' : '—';
    const regimeSub = lastRow?.itr?.formLabel || '';

    // Effective tax rate
    const eTaxRate = this.effectiveTaxRate();
    const eTaxStr = eTaxRate ? `${eTaxRate.effectiveRate.toFixed(1)}%` : '—';

    // Overall risk — a score of 0 is a valid LOW result, not "missing".
    const oRisk = this.overallNoticeRisk();
    const riskScore = oRisk && Number.isFinite(oRisk.score) ? oRisk.score : null;
    const riskStr = riskScore != null ? `${riskScore}/100` : '—';
    const riskSub = riskScore != null ? (oRisk.band || (riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW')) : '';

    const hasAnyItr = keys.some((fy) => this.state.years.get(fy)?.sources?.some((s) => s.kind === 'itr_json' || s.kind === 'itr_xml'));
    const hasAnyAis = keys.some((fy) => this.state.years.get(fy)?.sources?.some((s) => s.kind === 'ais_json'));

    const stats = [
      { key: 'joined', icon: 'hub', label: 'FYs with ITR + AIS', value: `${joined} of ${keys.length}`, roll: { type: 'nOfM', n: joined, m: keys.length }, colorClass: 'sky' },
      { key: 'latest', icon: 'payments', label: 'Latest FY gross (ITR)', value: lastG != null ? formatInrCompact(lastG) : '—', roll: lastG != null ? { type: 'inr', n: lastG } : undefined, colorClass: 'gold' },
      { key: 'yoy', icon: 'trending_up', label: 'Income growth (YoY)', value: yoyStr, roll: yoyRoll, colorClass: 'gold' },
      { key: 'salary', icon: 'account_balance_wallet', label: 'Salary share of gross', value: salaryShare, roll: salaryRoll, colorClass: 'gold' },
      { key: 'etax', icon: 'receipt_long', label: 'Effective tax rate', value: eTaxStr, colorClass: 'amber' },
      { key: 'regime', icon: 'gavel', label: 'Latest form / regime', value: regimeShort, sub: regimeSub, colorClass: 'purple' },
      { key: 'risk', icon: 'policy', label: 'Filing risk score', value: riskStr, sub: riskSub, colorClass: 'red' },
      { key: 'checks', icon: 'compare_arrows', label: 'Open review checks', value: String(rc.filter((c) => c.severity === 'review' || c.severity === 'watch').length), roll: { type: 'int', n: rc.filter((c) => c.severity === 'review' || c.severity === 'watch').length }, colorClass: 'amber' },
    ];

    if (joined === 0 && hasAnyItr && hasAnyAis) {
      stats.unshift({ key: 'fy-align', icon: 'sync_alt', label: 'ITR & AIS same FY?', value: 'No overlap in this upload', colorClass: 'gold' });
    }

    // ─── Extra meaningful tiles — lifetime & cross-year stats ───────────────
    // Lifetime tax paid
    const lifeTax = this.totalTaxPaid();
    if (lifeTax != null && lifeTax > 0) {
      stats.push({ key: 'lifeTax', icon: 'receipt_long', label: 'Lifetime tax paid', value: formatInrCompact(lifeTax), roll: { type: 'inr', n: lifeTax }, colorClass: 'red' });
    }

    // Lifetime earnings
    const lifeEarn = this.totalLifetimeEarnings();
    if (lifeEarn != null && lifeEarn > 0) {
      stats.push({ key: 'lifeEarn', icon: 'payments', label: 'Lifetime gross earnings', value: formatInrCompact(lifeEarn), roll: { type: 'inr', n: lifeEarn }, colorClass: 'gold' });
    }

    // Biggest tax year
    const big = this.biggestTaxYear();
    if (big) {
      stats.push({ key: 'bigYear', icon: 'trending_up', label: 'Biggest tax year', value: big.fyLabel, sub: formatInrCompact(big.taxPayable), colorClass: 'amber' });
    }

    // Regime switches — only meaningful when >=1 change across years
    let regimeFlips = 0;
    let prevRegime = null;
    for (const fy of keys) {
      const rk = this.state.years.get(fy)?.itr?.taxRegimeKey;
      if (!rk) continue;
      if (prevRegime && rk !== prevRegime) regimeFlips += 1;
      prevRegime = rk;
    }
    if (regimeFlips >= 1) {
      stats.push({ key: 'regimeFlips', icon: 'swap_horiz', label: 'Regime switches', value: String(regimeFlips), sub: regimeFlips === 1 ? 'across your filings' : 'across your filings', roll: { type: 'int', n: regimeFlips }, colorClass: 'purple' });
    }

    // Total refunds across years
    let refundTotal = 0;
    for (const fy of keys) {
      const r = this.state.years.get(fy)?.itr?.taxLiability?.refundDue;
      if (r != null && Number.isFinite(r) && r > 0) refundTotal += r;
    }
    if (refundTotal > 0) {
      stats.push({ key: 'refundTotal', icon: 'account_balance', label: 'Total refunds', value: formatInrCompact(refundTotal), roll: { type: 'inr', n: refundTotal }, colorClass: 'teal' });
    }

    // Capital gains lifetime
    let cgLife = 0;
    for (const fy of keys) {
      const cg = this.state.years.get(fy)?.itr?.capitalGains?.totalCg;
      if (cg != null && Number.isFinite(cg) && cg > 0) cgLife += cg;
    }
    if (cgLife > 0) {
      stats.push({ key: 'cgLife', icon: 'show_chart', label: 'Capital gains total', value: formatInrCompact(cgLife), roll: { type: 'inr', n: cgLife }, colorClass: 'sky' });
    }

    // 80C avg utilisation — only over years filed under old regime
    const CAP_80C = 150000;
    let u80Sum = 0;
    let u80Count = 0;
    for (const fy of keys) {
      const itr = this.state.years.get(fy)?.itr;
      if (!itr || itr.taxRegimeKey !== 'old') continue;
      const amt = itr.deductions?.section80C;
      if (amt == null || !Number.isFinite(amt)) continue;
      u80Sum += Math.min(1, Math.max(0, amt) / CAP_80C);
      u80Count += 1;
    }
    if (u80Count > 0) {
      const avgPct = Math.round((u80Sum / u80Count) * 100);
      stats.push({ key: 'util80c', icon: 'savings', label: '80C avg utilisation', value: `${avgPct}%`, sub: `${u80Count} old-regime ${u80Count === 1 ? 'year' : 'years'}`, roll: { type: 'percentInt', n: avgPct }, colorClass: 'gold' });
    }

    // Prepend employer tile if available — personalised context at a glance
    const emp = this.taxpayerEmployer();
    const city = this.taxpayerCity();
    if (emp) {
      stats.unshift({
        key: 'employer',
        icon: 'business_center',
        label: 'Primary employer',
        value: emp,
        sub: city || '',
        colorClass: 'teal',
        logoSvg: this.employerLogoSvg(emp),
      });
    }

    return stats;
  },

  /** Find FY with the largest gross tax liability (taxPayable) */
  biggestTaxYear() {
    let bestFy = '';
    let bestTax = 0;
    for (const fy of this.sortedFyKeys()) {
      const tp = this.state.years.get(fy)?.itr?.taxLiability?.taxPayable;
      if (tp != null && Number.isFinite(tp) && tp > bestTax) {
        bestTax = tp;
        bestFy = fy;
      }
    }
    if (!bestFy) return null;
    // Convert "2024-25" → "FY 2024-25"
    const fyLabel = /^\d{4}-\d{2}$/.test(bestFy) ? `FY ${bestFy}` : bestFy;
    return { fy: bestFy, fyLabel, taxPayable: bestTax };
  },

  // ─── File table ──────────────────────────────────────────────────────────

  detectTableFiles() {
    return sortFilesForDetectTable(this.state.files);
  },

  /** @param {string} [kind] */
  fileKindLabel(kind) {
    return friendlyKind(kind);
  },

  /** @param {number} [conf] */
  fileConfidenceLabel(conf) {
    return confidenceLabel(conf);
  },

  /** @param {string} [kind] */
  kindPillClass(kind) {
    const k = String(kind || 'unknown').replace(/[^a-z0-9_-]/gi, '') || 'unknown';
    return `pill pill--kind-${k}`;
  },

  pickFiles() {
    this.uploadModalOpen = true;
  },

  openFilePicker() {
    this.$refs.fileInput?.click();
  },

  closeUploadModal() {
    this.uploadModalOpen = false;
    this.pendingUploadFiles = [];
  },

  /** Open the files-detected modal */
  openDetectModal() {
    if (this.fileCount() === 0) return;
    this.detectModalOpen = true;
  },

  /** Close the files-detected modal */
  closeDetectModal() {
    this.detectModalOpen = false;
  },

  /** Check if any flat file list contains a PDF that may need a password */
  _hasPdfFiles(flatFiles) {
    return flatFiles.some(f => f.name?.toLowerCase().endsWith('.pdf'));
  },

  /** Show the PDF password modal and queue the files */
  _showPdfModal(flatFiles) {
    const firstPdf = flatFiles.find(f => f.name?.toLowerCase().endsWith('.pdf'));
    this.pdfModalFileName = firstPdf?.name ?? 'PDF file';
    this.pdfModalPassword = '';
    this._pendingIngestFiles = flatFiles;
    this.uploadModalOpen = false; // Close upload modal before showing PDF modal
    this.pdfModalOpen = true;
  },

  /** Called when user submits password in the modal */
  async submitPdfPassword() {
    this.aisPdfPassword = this.pdfModalPassword;
    this.pdfModalOpen = false;
    const files = this._pendingIngestFiles;
    this._pendingIngestFiles = null;
    if (files) await this._doIngest(files);
  },

  /** Called when user skips password (process without password) */
  async skipPdfPassword() {
    this.aisPdfPassword = '';
    this.pdfModalOpen = false;
    const files = this._pendingIngestFiles;
    this._pendingIngestFiles = null;
    if (files) await this._doIngest(files);
  },

  /** Cancel the modal — discard pending files */
  cancelPdfModal() {
    this.pdfModalOpen = false;
    this._pendingIngestFiles = null;
    this.pdfModalPassword = '';
  },

  closeGuide() {
    const wasFromUpload = this._guideOpenedFromUpload;
    this.guideModalOpen = false;
    this._guideOpenedFromUpload = false;
    // Re-show upload modal if guide was opened from within it
    if (wasFromUpload) {
      this.$nextTick(() => { this.uploadModalOpen = true; });
    }
  },

  /**
   * Mount mouse drag-to-scroll on review + insight carousels. Native touch
   * scrolling and scroll-snap keep working unchanged — this just adds desktop
   * grab-and-drag with inertia. Idempotent: controller keeps a WeakMap.
   */
  _mountCarousels() {
    try {
      const reviewTrack = this.$refs.reviewCarousel;
      if (reviewTrack) {
        this._dragReview?.destroy();
        this._dragReview = mountDragScroll(reviewTrack);
      }
      const insightTrack = this.$refs.insightCarousel;
      if (insightTrack) {
        this._dragInsight?.destroy();
        this._dragInsight = mountDragScroll(insightTrack);
      }
    } catch { /* progressive enhancement — failures must not break UI */ }
  },

  /**
   * Set the ingest phase text and wait `ms` milliseconds, yielding to Alpine
   * so the transition animates. Respects reduced motion (shortens to 60ms).
   * @param {string} phase
   * @param {number} ms
   */
  async _setPhase(phase, ms) {
    this.ingestPhase = phase;
    await this.$nextTick();
    const reduced = prefersReducedMotion();
    await new Promise((r) => setTimeout(r, reduced ? 60 : ms));
  },

  _startIngestHints(mode = 'upload') {
    this._stopIngestHints(false);
    this._ingestHintIdx = 0;
    this._ingestHints = mode === 'demo'
      ? [
          'Loading a realistic synthetic salary journey…',
          'Preparing year-by-year tax intelligence signals…',
          'Generating comparative tables and insight cards…',
          'Rendering your complete story dashboard…',
        ]
      : [
          'Detecting ITR JSON/XML and AIS fingerprints…',
          'Validating records and aligning by FY…',
          'Computing tax risk, deductions and regime outcomes…',
          'Finalising charts, tables and review cards…',
        ];
    this.ingestHint = this._ingestHints[0];
    this._ingestHintTimer = window.setInterval(() => {
      this._ingestHintIdx = (this._ingestHintIdx + 1) % this._ingestHints.length;
      this.ingestHint = this._ingestHints[this._ingestHintIdx];
    }, prefersReducedMotion() ? 2200 : 1600);
  },

  _stopIngestHints(resetText = true) {
    if (this._ingestHintTimer) {
      clearInterval(this._ingestHintTimer);
      this._ingestHintTimer = 0;
    }
    if (resetText) this.ingestHint = '';
  },

  _scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  },

  ingestStageLabel() {
    const p = Math.round(this.ingestProgress ?? 0);
    if (p < 16) return 'Preparing';
    if (p < 36) return 'Classifying';
    if (p < 60) return 'Parsing';
    if (p < 82) return 'Reconciling';
    if (p < 99) return 'Rendering';
    return 'Finalizing';
  },

  ingestStageTone() {
    const p = Math.round(this.ingestProgress ?? 0);
    if (p < 36) return 'gold';
    if (p < 82) return 'teal';
    return 'violet';
  },

  _ingestFloorMs() {
    return prefersReducedMotion() ? 500 : 1200;
  },

  _composeIngestNotice(report, zipWarnings = []) {
    const warns = [];
    if (Array.isArray(zipWarnings) && zipWarnings.length) warns.push(`${zipWarnings.length} ZIP warning${zipWarnings.length === 1 ? '' : 's'}`);
    if (report?.duplicateConflicts) warns.push(`${report.duplicateConflicts} duplicate FY file${report.duplicateConflicts === 1 ? '' : 's'} skipped`);
    if (report?.parseFailures) warns.push(`${report.parseFailures} parse failure${report.parseFailures === 1 ? '' : 's'}`);
    if (!warns.length) return '';
    return `Ingest completed with notices: ${warns.join(' · ')}. Open "Files detected" for details.`;
  },

  /** Load demo mode — replaces state with synthetic realistic Indian taxpayer data */
  async loadDemo() {
    if (this.ingestBusy) return;
    const t0 = performance.now();
    this.ingestBusy = true;
    this.uploadModalOpen = false;
    this.ingestProgress = 0;
    this.ingestPhase = '';
    this._startIngestHints('demo');
    await this.$nextTick();
    this.isDemoMode = true;
    try {
      this.ingestProgress = 8;
      await this._setPhase('Opening sample ITR & AIS exports…', 350);
      this.ingestProgress = 22;
      await this._setPhase('Reading ITR-1 / ITR-2 JSON trees…', 300);
      this.ingestProgress = 34;
      await this._setPhase('Classifying files by portal fingerprints…', 250);

      this.ingestProgress = 50;
      await this._setPhase('Extracting income heads & deductions…', 320);

      // Build demo state now — real work happens behind the rendering phases
      const demo = buildDemoState();
      demo.reviewCards = buildReviewCards(demo);
      this.state = demo;
      this._regimeCache = {};
      this._riskCache = {};
      this.selectedAnalysisFy = this.latestItrFy();
      this._scenarioSeedFy = '';

      this.ingestProgress = 68;
      await this._setPhase('Reconciling AIS categories with ITR schedules…', 300);
      this.ingestProgress = 84;
      await this._setPhase('Calculating regime comparison & notice risk…', 260);
      this.ingestProgress = 96;
      await this._setPhase('Rendering your story dashboard…', 220);

      await this.$nextTick();
      await this.paintCharts();
      await this.refreshComparative();
      this.railPinned = false;
      // Wait for Alpine to render newly shown sections (x-show), THEN
      // wire up scroll-reveal, scrollspy, and GSAP animations
      await this.$nextTick();
      await this.$nextTick(); // second tick ensures x-transition completes display toggle
      refreshScrollReveal(this.$root || document.body);
      this.triggerGlanceRoll();
      this._paintTaxCharts();
      this._initScrollSpy();
      // Additional refresh after layout settles (handles deep x-for cards)
      setTimeout(() => {
        refreshScrollReveal(this.$root || document.body);
        this._refreshGsapForData();
        this._mountCarousels();
        scanCountUps(this.$root || document.body);
      }, 300);
      setTimeout(() => {
        // Scroll so the personalized greeting is at the top — keeps both
        // the greeting AND the glance strip visible below it.
        const greeting = document.querySelector('.hero-greeting');
        if (greeting) greeting.scrollIntoView({ behavior: this._scrollBehavior(), block: 'start' });
      }, 400);
    } finally {
      const minMs = this._ingestFloorMs();
      const maxWait = minMs + 5000; // Hard cap so slow paths never drag forever
      const elapsed = performance.now() - t0;
      const pad = Math.max(0, Math.min(minMs - elapsed, maxWait - elapsed));
      if (pad > 0) await new Promise((r) => setTimeout(r, pad));
      await this._setPhase('Ready.', 180);  // brief "ready" flash
      this.ingestProgress = 100;
      this.ingestBusy = false;
      this.ingestPhase = '';
      this._stopIngestHints();
      // Re-init scrollspy after overlay hides so positions are fresh
      setTimeout(() => this._initScrollSpy(), 100);
    }
  },

  // ─── Upload / ingest ──────────────────────────────────────────────────────

  onPick(ev) {
    if (this.ingestBusy) return;
    const input = ev.target;
    const files = input.files;
    if (!files?.length) return;
    // Append to staged list, dedup by name
    const newFiles = Array.from(files);
    const existingNames = new Set(this.pendingUploadFiles.map((f) => f.name));
    this.pendingUploadFiles = [
      ...this.pendingUploadFiles,
      ...newFiles.filter((f) => !existingNames.has(f.name)),
    ];
    input.value = '';
  },

  onModalDrop(ev) {
    ev.preventDefault();
    this.dragOver = false;
    if (this.ingestBusy) return;
    const dt = ev.dataTransfer;
    if (!dt?.files?.length) return;
    // Append to staged list, dedup by name
    const newFiles = Array.from(dt.files);
    const existingNames = new Set(this.pendingUploadFiles.map((f) => f.name));
    this.pendingUploadFiles = [
      ...this.pendingUploadFiles,
      ...newFiles.filter((f) => !existingNames.has(f.name)),
    ];
  },

  async analyseFiles() {
    if (!this.pendingUploadFiles.length || this.ingestBusy) return;
    const files = this.pendingUploadFiles;
    this.pendingUploadFiles = [];
    await this.ingest(files);
  },

  clearPendingFile(name) {
    this.pendingUploadFiles = this.pendingUploadFiles.filter((f) => f.name !== name);
  },

  async onDrop(ev) {
    ev.preventDefault();
    this.dragOver = false;
    if (this.ingestBusy) return;
    const dt = ev.dataTransfer;
    if (!dt?.files?.length) return;
    await this.ingest(dt.files);
  },

  async ingest(rawList) {
    if (this.ingestBusy) return;
    // A real upload always supersedes demo state — clear demo flag and any
    // stale demo data so real parses don't get merged onto synthetic entries.
    if (this.isDemoMode) {
      this.isDemoMode = false;
      this.state = createEmptyState();
      this._regimeCache = {};
      this._riskCache = {};
      this.comparativeSnap = { yearLabels: [], displayRows: [] };
      this.comparativeNarrative = '';
      this.selectedAnalysisFy = '';
      this._scenarioSeedFy = '';
    }
    // Flatten ZIPs first to check for PDFs before processing
    this.ingestBusy = true;
    this.ingestPhase = 'Preparing files…';
    this._ingestNotices = [];
    let flat;
    let zipWarnings = [];
    try {
      const flatResult = await flattenFilesWithZip(rawList);
      flat = flatResult.files;
      zipWarnings = flatResult.warnings ?? [];
    } catch {
      this.ingestBusy = false;
      this.ingestPhase = '';
      this.toast = 'Could not read files. Please try again.';
      setTimeout(() => (this.toast = ''), 4000);
      return;
    }
    if (!flat.length) {
      this.ingestBusy = false;
      this.ingestPhase = '';
      this.toast = 'No JSON / XML / PDF files found.';
      setTimeout(() => (this.toast = ''), 4000);
      return;
    }
    this._ingestNotices = zipWarnings;
    // If PDFs present and no password yet, show modal and pause
    if (this._hasPdfFiles(flat) && !this.aisPdfPassword) {
      this.ingestBusy = false;
      this.ingestPhase = '';
      this._showPdfModal(flat);
      return;
    }
    await this._doIngest(flat);
  },

  async _doIngest(flat) {
    const t0 = performance.now();
    const n = flat.length;
    this.ingestBusy = true;
    // Close upload modal immediately so the full-screen loading overlay is visible
    this.uploadModalOpen = false;
    this.ingestProgress = 0;
    this.ingestPhase = '';
    this._startIngestHints('upload');
    await this.$nextTick();
    this._regimeCache = {};
    this._riskCache = {};
    const softWarn = n > 120;
    if (softWarn) this.toast = `Analysing ${n} files — this may take a moment.`;
    let ingestReport = { warnings: [], parseFailures: 0, duplicateConflicts: 0 };
    try {
      this.ingestProgress = 12;
      await this._setPhase(`Reading ${n} file${n === 1 ? '' : 's'}…`, 260);
      this.ingestProgress = 26;
      await this._setPhase('Detecting portal fingerprints…', 240);
      this.ingestProgress = 42;
      await this._setPhase('Parsing ITR JSON / XML trees…', 320);

      // Big-work step — handleFiles drives classify/parse/merge. The
      // onProgress hook lets us advance to the "AIS / TIS PDFs" phase while
      // async parsing is still unfolding.
      ingestReport = await handleFiles(
        flat,
        this.state,
        async () => {
          this.ingestProgress = 58;
          this.ingestPhase = 'Parsing AIS / TIS PDFs…';
          await this.$nextTick();
          await this.paintCharts();
          await this.refreshComparative();
        },
        { aisPdfPassword: this.aisPdfPassword }
      );
      const ingestNotice = this._composeIngestNotice(ingestReport, this._ingestNotices);
      if (ingestNotice) {
        this.toast = ingestNotice;
      }
      this.selectedAnalysisFy = this.latestItrFy();
      this._scenarioSeedFy = '';

      this.ingestProgress = 72;
      await this._setPhase('Joining ITR ↔ AIS by financial year…', 260);
      this.ingestProgress = 85;
      await this._setPhase('Computing tax intelligence…', 280);
      this.ingestProgress = 96;
      await this._setPhase('Rendering dashboard…', 220);

      this.railPinned = false;
      await this.$nextTick();
      await this.$nextTick(); // second tick ensures x-transition completes display toggle
      refreshScrollReveal(this.$root || document.body);
      this.triggerGlanceRoll();
      this._paintTaxCharts();
      this._initScrollSpy();
      setTimeout(() => {
        refreshScrollReveal(this.$root || document.body);
        this._refreshGsapForData();
        this._mountCarousels();
        scanCountUps(this.$root || document.body);
      }, 300);
      setTimeout(() => {
        // Scroll so the personalized greeting is at the top — keeps both
        // the greeting AND the glance strip visible below it.
        const greeting = document.querySelector('.hero-greeting');
        if (greeting) greeting.scrollIntoView({ behavior: this._scrollBehavior(), block: 'start' });
      }, 500);
      if (softWarn || ingestReport.parseFailures || ingestReport.duplicateConflicts || this._ingestNotices.length) {
        setTimeout(() => (this.toast = ''), 7000);
      } else {
        this.toast = '';
      }
    } finally {
      const minMs = this._ingestFloorMs();
      const maxWait = minMs + 5000; // Hard cap so slow parses never drag forever
      const elapsed = performance.now() - t0;
      const pad = Math.max(0, Math.min(minMs - elapsed, maxWait - elapsed));
      if (pad > 0) await new Promise((r) => setTimeout(r, pad));
      await this._setPhase('Ready.', 180);  // brief "ready" flash
      this.ingestProgress = 100;
      this.ingestBusy = false;
      this.ingestPhase = '';
      this._stopIngestHints();
      // Clear the cached PDF password so a subsequent upload (possibly for a
      // different PAN) prompts again rather than silently re-using it.
      this.aisPdfPassword = '';
      this._ingestNotices = [];
      // Re-init scrollspy after overlay hides so rail positions are fresh
      setTimeout(() => this._initScrollSpy(), 100);
    }
  },

  // ─── Chart rendering ─────────────────────────────────────────────────────

  async paintCharts() {
    await this.$nextTick();
    const lineCanvas = this.$refs.arcCanvas;
    if (!lineCanvas) return;
    if (!this.hasRealData()) { destroyChartOnCanvas(lineCanvas); return; }
    const keys = this.sortedFyKeys();
    if (!keys.length) { destroyChartOnCanvas(lineCanvas); return; }
    const values = keys.map((k) => {
      const y = this.state.years.get(k);
      const g = y?.itr?.grossIncome;
      return (g != null && Number.isFinite(g) && g > 0) ? g : null;
    });
    if (!values.some((v) => v != null && v > 0)) { destroyChartOnCanvas(lineCanvas); return; }
    await renderIncomeLineChart(lineCanvas, {
      labels: keys,
      values,
      datasetLabel: 'Gross Total Income (ITR) — gaps = FYs without ITR in this upload',
    });
  },

  async _paintTaxCharts() {
    await this.$nextTick();
    const fy = this.getSelectedFy();
    const itr = this.getItrForFy(fy);
    const ais = this.getAisForFy(fy);

    // Risk radar
    const radarCanvas = this.$refs.riskRadarCanvas;
    if (radarCanvas) {
      const risk = this.noticeRisk(fy);
      if (risk && typeof renderRadarChart === 'function') {
        const interestGap = ais && itr ? Math.max(0, (ais.interestTotal ?? 0) - (itr.interestIncome ?? 0)) : 0;
        const divGap = ais && itr ? Math.max(0, (ais.dividendTotal ?? 0) - (itr.dividendIncome ?? 0)) : 0;
        const cgGap = ais && itr ? Math.max(0, (ais.capitalGainsTotal ?? 0) - (itr.capitalGains?.totalCg ?? 0)) : 0;
        const rentGap = ais && itr ? Math.max(0, (ais.rentTotal ?? 0) - (itr.housePropertyIncome ?? 0)) : 0;
        const tdsGap = ais && itr ? Math.abs((ais.tdsTotal ?? 0) - (itr.tdsTotal ?? 0)) : 0;
        renderRadarChart(radarCanvas, {
          labels: ['Interest', 'Dividend', 'Cap Gains', 'Rent/HP', 'TDS'],
          values: [
            Math.min(100, (interestGap / 50000) * 100),
            Math.min(100, (divGap / 10000) * 100),
            Math.min(100, (cgGap / 100000) * 100),
            Math.min(100, (rentGap / 100000) * 100),
            Math.min(100, (tdsGap / 50000) * 100),
          ],
          label: 'AIS vs ITR gap (%)',
        });
      }
    }

    // Tax breakdown donut (selected FY)
    const donutCanvas = this.$refs.taxDonutCanvas;
    if (donutCanvas && itr?.taxLiability && typeof renderTaxBreakdownDonut === 'function') {
      const tl = itr.taxLiability;
      renderTaxBreakdownDonut(donutCanvas, {
        labels: ['Tax payable', 'TDS', 'Education cess', 'Surcharge', 'Refund'],
        values: [
          Math.max(0, (tl.taxPayable ?? 0) - (tl.educationCess ?? 0) - (tl.surcharge ?? 0)),
          itr.tdsTotal ?? 0,
          tl.educationCess ?? 0,
          tl.surcharge ?? 0,
          tl.refundDue ?? 0,
        ],
      });
    }

    // Deduction utilisation progress bars (selected FY)
    const deductContainer = this.$refs.deductPbContainer;
    if (deductContainer && itr?.deductions && typeof renderDeductionProgressBars === 'function') {
      const d = itr.deductions;
      const deductions = [
        { label: 'Section 80C', used: d.section80C ?? 0, limit: 150000 },
        { label: 'Section 80D', used: d.section80D ?? 0, limit: itr.taxRegimeKey === 'new' ? 0 : 75000 },
        { label: 'NPS 80CCD(1B)', used: d.npsDeduction ?? 0, limit: 50000 },
        { label: 'Home loan 24(b)', used: Math.abs(itr.housePropertyIncome ?? 0), limit: 200000 },
        { label: 'Std deduction', used: d.standardDeduction ?? 0, limit: itr.taxRegimeKey === 'new' ? 75000 : 50000 },
        { label: '80TTA (savings int)', used: d.section80TTA ?? 0, limit: 10000 },
      ].filter(x => x.limit > 0);
      renderDeductionProgressBars(deductContainer, deductions);
    }

    // Regime comparison bar (selected FY)
    const regimeCanvas = this.$refs.regimeBarCanvas;
    if (regimeCanvas && itr?.taxLiability && typeof renderRegimeComparisonBar === 'function') {
      const regimeData = this.regimeComparison(fy);
      if (regimeData) {
        renderRegimeComparisonBar(regimeCanvas, {
          oldTax: regimeData.oldRegime?.totalTax ?? 0,
          newTax: regimeData.newRegime?.totalTax ?? 0,
          savings: regimeData.savings ?? 0,
        });
      }
    }

    // Income waterfall (selected FY)
    const waterfallCanvas = this.$refs.waterfallCanvas;
    if (waterfallCanvas && itr && typeof renderIncomeWaterfallData === 'function') {
      const d = itr.deductions ?? {};
      const labels = ['Gross salary'];
      const values = [itr.salaryIncome ?? 0];
      if (itr.housePropertyIncome) {
        labels.push('House property');
        values.push(itr.housePropertyIncome);
      }
      if (itr.interestIncome) {
        labels.push('Interest income');
        values.push(itr.interestIncome);
      }
      if (d.standardDeduction) {
        labels.push('Std deduction');
        values.push(-(d.standardDeduction));
      }
      if (d.section80C) {
        labels.push('80C');
        values.push(-(d.section80C));
      }
      if (d.section80D) {
        labels.push('80D');
        values.push(-(d.section80D));
      }
      if (d.npsDeduction) {
        labels.push('NPS');
        values.push(-(d.npsDeduction));
      }
      labels.push('Taxable income');
      values.push(itr.totalIncome ?? itr.grossIncome);
      renderIncomeWaterfallData(waterfallCanvas, { labels, values });
    }
  },

  async refreshComparative() {
    this.comparativeExpanded = {};
    this.clearComparativeFilters();
    if (!this.hasRealData()) {
      this.comparativeSnap = null;
      this.comparativeNarrative = '';
      await this.$nextTick();
      await this.paintComparativeCharts();
      return;
    }
    const snap = await buildComparativeFromState(this.state);
    this.comparativeSnap = snap ?? { yearLabels: [], displayRows: [] };
    this.comparativeNarrative = snap ? buildComparativeNarrative(snap) : '';
    await this.$nextTick();
    await this.paintComparativeCharts();
    requestAnimationFrame(() => refreshScrollReveal(this.$root || document.body));
  },

  async paintComparativeCharts() {
    await this.$nextTick();
    const bar = this.$refs.compBarCanvas;
    const line = this.$refs.compLineCanvas;
    const pie = this.$refs.compPieCanvas;
    if (!bar || !line || !pie) return;
    const snap = this.comparativeSnap;
    if (!snap?.charts) {
      destroyChartOnCanvas(bar);
      destroyChartOnCanvas(line);
      destroyChartOnCanvas(pie);
      return;
    }
    const { gti, netTax, cumNw, pie: pieData, pieFy } = snap.charts;
    await renderItrComparativeCharts({
      barCanvas: bar, lineCanvas: line, pieCanvas: pie,
      yearLabels: snap.yearLabels, gti, netTax, cumNetWorth: cumNw,
      pie: pieData, pieTitle: `Income mix · FY ${pieFy} (ITR)`,
    });
  },

  insightDeck() {
    if (!this.hasRealData()) return [];
    return buildInsightDeck(this.state);
  },

  buildPdfReportData() {
    const fy = this.getSelectedFy();
    const risk = this.overallNoticeRisk();
    const regime = this.regimeComparison(fy);
    const eff = this.effectiveTaxRate();
    const files = this.detectTableFiles().map((f) => ({
      name: f.name,
      kind: this.fileKindLabel(f.classification.kind),
      fy: f.metadata.fy ?? '—',
      note: f.classification.hint || '',
    }));
    return {
      generatedOn: new Date().toISOString(),
      taxpayerName: this.taxpayerName() || '',
      employer: this.taxpayerEmployer() || '',
      city: this.taxpayerCity() || '',
      fyRange: this.sortedFyKeys(),
      selectedFy: fy,
      totals: {
        lifetimeEarnings: this.totalLifetimeEarnings(),
        totalTaxPaid: this.totalTaxPaid(),
        effectiveTaxRate: eff?.effectiveRate ?? null,
        filingRiskScore: risk?.score ?? null,
        filingRiskLevel: risk?.level ?? null,
      },
      regime: regime ? {
        recommended: regime.recommended,
        savings: regime.savings,
        reason: regime.reason,
        oldTax: regime.oldRegime?.totalTax ?? null,
        newTax: regime.newRegime?.totalTax ?? null,
      } : null,
      actions: this.actionCenterItems(),
      confidence: this.confidenceItems(),
      anomalies: this.anomalyTimeline(),
      reviewCards: this.reviewCards(),
      insights: this.insightDeck(),
      files,
      comparative: this.comparativeSnap ? {
        years: this.comparativeSnap.yearLabels ?? [],
        rows: this.comparativeSnap.displayRows ?? [],
      } : null,
    };
  },

  buildSessionExportData() {
    const serializableFiles = this.state.files.map((f) => {
      const cloned = { ...f };
      if ('blob' in cloned) delete cloned.blob;
      return cloned;
    });
    return {
      schemaVersion: 1,
      app: 'tax-story',
      exportedAt: new Date().toISOString(),
      state: {
        years: Array.from(this.state.years.entries()),
        files: serializableFiles,
        reviewCards: this.state.reviewCards,
      },
      ui: {
        selectedAnalysisFy: this.selectedAnalysisFy || '',
        railPinned: !!this.railPinned,
        isDemoMode: !!this.isDemoMode,
      },
      reportData: this.buildPdfReportData(),
    };
  },

  downloadSessionJson() {
    try {
      const payload = this.buildSessionExportData();
      const body = JSON.stringify(payload, (key, value) => {
        if (value instanceof Blob || value instanceof File) return undefined;
        return value;
      }, 2);
      const blob = new Blob([body], { type: 'application/json' });
      const link = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `tax-story-session-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      this.toast = 'Session JSON exported.';
      setTimeout(() => (this.toast = ''), 2800);
    } catch {
      this.toast = 'Could not export session JSON.';
      setTimeout(() => (this.toast = ''), 3400);
    }
  },

  openSessionJsonImport() {
    if (this.ingestBusy) return;
    this.$refs.sessionJsonInput?.click();
  },

  async onSessionJsonPick(ev) {
    if (this.ingestBusy) return;
    if (this.hasRealData() && !window.confirm('Replace current session with imported JSON?')) return;
    const input = ev.target;
    const file = input?.files?.[0];
    input.value = '';
    if (!file) return;
    const t0 = performance.now();
    this.ingestBusy = true;
    this.uploadModalOpen = false;
    this.ingestProgress = 0;
    this.ingestPhase = '';
    this._startIngestHints('upload');
    await this.$nextTick();
    try {
      this.ingestProgress = 12;
      await this._setPhase('Reading session JSON…', 240);
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format.');
      }
      if (!parsed || parsed.app !== 'tax-story' || parsed.schemaVersion !== 1 || !parsed.state || !Array.isArray(parsed.state.years)) {
        throw new Error('Unsupported Tax Story session file.');
      }
      if (!parsed.state.years.length) throw new Error('Session JSON has no year records.');
      this.ingestProgress = 48;
      await this._setPhase('Restoring years, files, and cards…', 280);
      const yearsMap = new Map(
        parsed.state.years
          .filter((entry) => Array.isArray(entry) && entry.length >= 2)
          .map(([fy, record]) => [String(fy), record])
      );
      this.state = {
        years: yearsMap,
        files: Array.isArray(parsed.state.files) ? parsed.state.files : [],
        reviewCards: Array.isArray(parsed.state.reviewCards) ? parsed.state.reviewCards : [],
      };
      this.isDemoMode = !!parsed.ui?.isDemoMode;
      this.railPinned = !!parsed.ui?.railPinned;
      const importedFy = String(parsed.ui?.selectedAnalysisFy || '');
      this.selectedAnalysisFy = importedFy && yearsMap.has(importedFy) ? importedFy : this.latestItrFy();
      this._scenarioSeedFy = '';
      this._regimeCache = {};
      this._riskCache = {};
      this.ingestProgress = 74;
      await this._setPhase('Rebuilding comparative tables and charts…', 300);
      await this.$nextTick();
      await this.paintCharts();
      await this.refreshComparative();
      this._paintTaxCharts();
      this.ingestProgress = 96;
      await this._setPhase('Rendering restored dashboard…', 220);
      await this.$nextTick();
      refreshScrollReveal(this.$root || document.body);
      this.triggerGlanceRoll();
      this._refreshGsapForData();
      this._mountCarousels();
      scanCountUps(this.$root || document.body);
      this.toast = 'Session imported successfully.';
      setTimeout(() => (this.toast = ''), 3200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not import session JSON.';
      this.toast = msg;
      setTimeout(() => (this.toast = ''), 4200);
    } finally {
      const minMs = this._ingestFloorMs();
      const elapsed = performance.now() - t0;
      const pad = Math.max(0, minMs - elapsed);
      if (pad > 0) await new Promise((r) => setTimeout(r, pad));
      this.ingestProgress = 100;
      await this._setPhase('Ready.', 160);
      this.ingestBusy = false;
      this.ingestPhase = '';
      this._stopIngestHints();
      setTimeout(() => this._initScrollSpy(), 100);
    }
  },

  async downloadPdf() {
    const el = this.$refs.printRoot;
    if (!el) return;
    // Wire the export-pdf progress events into our toast so the user sees
    // phase text + percent during the (sometimes multi-second) capture.
    const onProgress = (ev) => {
      const d = ev.detail || {};
      const pct = typeof d.pct === 'number' ? Math.round(d.pct) : null;
      this.toast = pct != null && d.phase ? `${d.phase} ${pct}%` : (d.phase || 'Generating PDF…');
    };
    document.addEventListener('pdf-export-progress', onProgress);
    this.toast = 'Preparing rich PDF report…';
    try {
      const ok = await exportStoryPdf(el, {
        title: 'Tax-Story',
        taxpayerName: this.taxpayerName() || undefined,
        detailMode: 'structured',
        reportData: this.buildPdfReportData(),
      });
      if (ok) {
        this.toast = 'PDF downloaded.';
        setTimeout(() => (this.toast = ''), 2800);
      } else {
        this.toast = '';
      }
    } finally {
      document.removeEventListener('pdf-export-progress', onProgress);
    }
  },
}));

Alpine.start();
