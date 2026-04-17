/**
 * Shared motion helpers — count-ups, easing, reduced-motion guard.
 * @typedef {{ type: 'nOfM'; n: number; m: number }} RollNOfM
 * @typedef {{ type: 'int'; n: number }} RollInt
 * @typedef {{ type: 'percent'; v: number; decimals?: number }} RollPercent
 * @typedef {{ type: 'inr'; n: number }} RollInr
 * @typedef {{ type: 'percentInt'; n: number }} RollPercentInt
 * @typedef {RollNOfM | RollInt | RollPercent | RollInr | RollPercentInt} GlanceRollSpec
 */

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Coalesce rapid events so callback runs at most once per frame.
 * @template {(...args: any[]) => void} T
 * @param {T} fn
 * @returns {T}
 */
export function rafThrottle(fn) {
  let raf = 0;
  return /** @type {T} */ ((...args) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      fn(...args);
      raf = 0;
    });
  });
}

/**
 * @param {number} t 0..1
 */
export function easeOutQuart(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 4;
}

/**
 * @param {GlanceRollSpec | null | undefined} roll
 * @param {number} progress 0..1 (linear; easing applied inside)
 * @param {(n: number) => string} formatInrCompact
 * @returns {string}
 */
export function formatRollFrame(roll, progress, formatInrCompact) {
  if (!roll) return '';
  const e = easeOutQuart(progress);
  if (roll.type === 'nOfM') {
    return `${Math.round(roll.n * e)} of ${roll.m}`;
  }
  if (roll.type === 'int') {
    return `${Math.round(roll.n * e)}`;
  }
  if (roll.type === 'percent') {
    const dec = roll.decimals ?? 1;
    const v = roll.v * e;
    const sign = roll.v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(dec)}%`;
  }
  if (roll.type === 'inr') {
    return formatInrCompact(Math.max(0, Math.round(roll.n * e)));
  }
  if (roll.type === 'percentInt') {
    return `${Math.round(roll.n * e)}%`;
  }
  return '';
}

/**
 * @param {number} clientX
 * @param {number} clientY
 */
export function setPointerCssVars(clientX, clientY) {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  const x = clientX / w;
  const y = clientY / h;
  document.documentElement.style.setProperty('--ptr-x', String(x));
  document.documentElement.style.setProperty('--ptr-y', String(y));
}
