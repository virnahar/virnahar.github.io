/**
 * IntersectionObserver-driven scroll reveals (Apple-like fade + lift).
 * Respects prefers-reduced-motion. Call refreshScrollReveal after Alpine adds nodes.
 */

const IN = 'scroll-reveal--in';
const SEL = '.scroll-reveal';

/** @type {IntersectionObserver | null} */
let io = null;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * @param {Element} el
 */
function onIntersect(el) {
  el.classList.add(IN);
  el.dispatchEvent(new CustomEvent('scroll-reveal-in', { bubbles: true }));
  io?.unobserve(el);
}

/**
 * Mark an element as already in viewport if its rect intersects the viewport now.
 * IntersectionObserver can be flaky when an element transitions from
 * `display: none` (Alpine x-show=false) to `display: block` while the element
 * is already inside the viewport — the observer may not fire "intersecting"
 * again. This sync check covers that race.
 * @param {Element} el
 */
function maybeTriggerNow(el) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false; // still display:none
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const inView =
    r.top < vh * 1.05 && r.bottom > -vh * 0.05 &&
    r.left < vw * 1.05 && r.right > -vw * 0.05;
  if (inView) {
    el.classList.add(IN);
    el.dispatchEvent(new CustomEvent('scroll-reveal-in', { bubbles: true }));
    io?.unobserve(el);
    return true;
  }
  return false;
}

/**
 * @param {ParentNode} root
 */
export function initScrollReveal(root = document.body) {
  if (prefersReducedMotion()) {
    root.querySelectorAll(SEL).forEach((el) => {
      el.classList.add(IN);
      el.dispatchEvent(new CustomEvent('scroll-reveal-in', { bubbles: true }));
    });
    return;
  }

  if (io) io.disconnect();

  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onIntersect(/** @type {Element} */ (e.target));
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
  );

  root.querySelectorAll(SEL).forEach((el) => {
    if (el.classList.contains(IN)) return;
    if (maybeTriggerNow(el)) return;
    io?.observe(el);
  });
}

/**
 * Observe newly-rendered nodes (e.g. after file upload).
 * @param {ParentNode} root
 */
export function refreshScrollReveal(root = document.body) {
  if (prefersReducedMotion()) {
    root.querySelectorAll(SEL).forEach((el) => {
      el.classList.add(IN);
      el.dispatchEvent(new CustomEvent('scroll-reveal-in', { bubbles: true }));
    });
    return;
  }
  if (!io) {
    initScrollReveal(root);
    return;
  }
  root.querySelectorAll(SEL).forEach((el) => {
    if (el.classList.contains(IN)) return;
    if (maybeTriggerNow(el)) return;
    io.observe(el);
  });
}
