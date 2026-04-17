/**
 * Count-up animation module for Tax Story.
 *
 * Animates numeric text from a starting value to a target value with an
 * ease-out quartic curve. Observes `[data-count-to]` elements and plays the
 * tween once when they enter the viewport. Standalone — no imports.
 *
 * @typedef {Object} CountUpOptions
 * @property {number} [duration=1400]
 * @property {(n: number) => string} [formatter]
 * @property {'inr'|'inrCompact'|'percent'|'int'|'nOfM'} [preset]
 * @property {number} [from=0]
 * @property {boolean} [respectReducedMotion=true]
 */

const DEFAULT_DURATION = 1400;

const inrGrouping = (() => {
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  } catch {
    return { format: (n) => String(Math.round(n)) };
  }
})();

const prefersReducedMotion = () => {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
};

// Local compact INR formatter (mirrors js/format-inr.js; intentionally duplicated
// so this module stays self-contained).
function formatInrCompact(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${Math.round(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
}

function formatInr(n) {
  if (!Number.isFinite(n)) return '—';
  return `₹${inrGrouping.format(Math.round(n))}`;
}

function formatPercent(n) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 10) return `${n.toFixed(1)}%`;
  return `${Math.round(n)}%`;
}

function formatInt(n) {
  if (!Number.isFinite(n)) return '—';
  return inrGrouping.format(Math.round(n));
}

function resolveFormatter(preset, custom) {
  if (typeof custom === 'function') return custom;
  switch (preset) {
    case 'inr': return formatInr;
    case 'inrCompact': return formatInrCompact;
    case 'percent': return formatPercent;
    case 'int': return formatInt;
    default:
      return (n) => {
        if (!Number.isFinite(n)) return '—';
        return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      };
  }
}

/**
 * @param {HTMLElement} el
 * @param {number} to
 * @param {CountUpOptions} [opts]
 * @returns {() => void}
 */
export function countUp(el, to, opts = {}) {
  let cancelled = false;
  let rafId = 0;
  const noop = () => {};

  try {
    if (!el || !Number.isFinite(to)) return noop;

    const {
      duration = DEFAULT_DURATION,
      formatter,
      preset,
      from = 0,
      respectReducedMotion = true,
    } = opts;

    const format = resolveFormatter(preset, formatter);
    const smallTarget = Math.abs(to) < 10;
    const largeTarget = Math.abs(to) >= 1_000_000;

    const finalText = format(to);

    if (respectReducedMotion && prefersReducedMotion()) {
      el.textContent = finalText;
      return noop;
    }

    el.classList.add('counting');
    const start = performance.now();
    const delta = to - from;

    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - t, 4);
      const raw = from + delta * eased;

      let text;
      if (largeTarget) {
        text = format(raw);
      } else if (smallTarget) {
        text = format(Math.round(raw));
      } else {
        text = format(raw);
      }
      el.textContent = text;

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
        el.classList.remove('counting');
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try { el.textContent = finalText; el.classList.remove('counting'); } catch {}
    };
  } catch {
    try { el.textContent = resolveFormatter(opts?.preset, opts?.formatter)(to); } catch {}
    return noop;
  }
}

// Parse the data-count-to attribute. Supports plain numbers and JSON for nOfM.
function parseTarget(el) {
  const raw = el.getAttribute('data-count-to');
  if (raw == null || raw === '') return null;
  const preset = el.getAttribute('data-count-preset') || el.getAttribute('data-count-format') || null;

  if (preset === 'nOfM') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Number.isFinite(parsed.n) && Number.isFinite(parsed.m)) {
        return { type: 'nOfM', n: parsed.n, m: parsed.m, preset };
      }
    } catch {}
    return null;
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return { type: 'number', to: n, preset };
}

function runForElement(el) {
  if (!el || el.__countUpDone) return;
  const target = parseTarget(el);
  if (!target) return;
  el.__countUpDone = true;

  if (target.type === 'nOfM') {
    const { n, m } = target;
    const finalText = `${Math.round(n)} of ${Math.round(m)}`;
    if (prefersReducedMotion()) { el.textContent = finalText; return; }
    el.classList.add('counting');
    const start = performance.now();
    const dur = DEFAULT_DURATION;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${Math.round(n * eased)} of ${Math.round(m)}`;
      if (t < 1) requestAnimationFrame(step);
      else { el.textContent = finalText; el.classList.remove('counting'); }
    };
    requestAnimationFrame(step);
    return;
  }

  const duration = Number(el.getAttribute('data-count-duration'));
  countUp(el, target.to, {
    preset: target.preset || undefined,
    duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
  });
}

/**
 * @param {ParentNode} [root=document.body]
 * @param {string} [selector='[data-count-to]']
 */
export function observeCountUps(root = document.body, selector = '[data-count-to]') {
  if (!root) return { disconnect: () => {} };

  try {
    if (root.__countUpObserver) {
      try { root.__countUpObserver.disconnect(); } catch {}
    }

    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: fire everything immediately.
      root.querySelectorAll?.(selector).forEach(runForElement);
      return { disconnect: () => {} };
    }

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          runForElement(entry.target);
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });

    root.querySelectorAll?.(selector).forEach((el) => {
      if (!el.__countUpDone) io.observe(el);
    });

    root.__countUpObserver = io;
    return { disconnect: () => { try { io.disconnect(); } catch {} } };
  } catch {
    return { disconnect: () => {} };
  }
}

/**
 * @param {ParentNode} [root=document.body]
 */
export function scanCountUps(root = document.body) {
  try {
    const io = root?.__countUpObserver;
    const nodes = root?.querySelectorAll?.('[data-count-to]');
    if (!nodes) return;
    nodes.forEach((el) => {
      if (el.__countUpDone) return;
      if (io) io.observe(el);
      else runForElement(el);
    });
  } catch {}
}
