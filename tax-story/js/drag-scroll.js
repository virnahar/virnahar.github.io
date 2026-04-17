/**
 * drag-scroll.js — tiny mouse-drag-to-scroll enhancement for horizontally
 * scrolling containers.
 *
 * The target element must already be a horizontal scroller (e.g. has
 * `overflow-x: auto`). This module adds:
 *   • Click-and-drag with the mouse → scrolls the container.
 *   • Release with velocity → inertia (scroll keeps going, exponential decay).
 *   • `cursor: grab` / `cursor: grabbing` affordance via class toggles.
 *   • Click suppression if the pointer moved > 8px (so card clicks don't fire
 *     after a drag).
 *   • Pass-through on interactive children (<button>, <a>, etc.) and on
 *     touch pointers (native touch scroll handles mobile).
 *
 * Native scroll-snap keeps working — drag is delta-applied to scrollLeft.
 *
 * @typedef {Object} DragScrollController
 * @property {() => void} destroy
 */

const MOUNTED = /** @type {WeakMap<HTMLElement, DragScrollController>} */ (new WeakMap());
const INTERACTIVE = /^(button|a|input|textarea|select|label)$/i;
const DRAG_THRESHOLD = 8;  // px moved before we call it a drag
const DECAY = 0.92;        // per-frame velocity decay (≈ 140ms half-life @ 60fps)
const MIN_VELOCITY = 0.4;  // px/frame — stop momentum below this

/**
 * Mount drag-to-scroll on a track. Idempotent (re-mount returns same ctl).
 * @param {HTMLElement} track
 * @returns {DragScrollController}
 */
export function mountDragScroll(track) {
  if (!track) return { destroy: () => {} };
  const existing = MOUNTED.get(track);
  if (existing) return existing;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  track.classList.add('drag-scroll', 'drag-scroll--grab');

  /** @type {null | { id: number, startX: number, startScroll: number, lastX: number, lastT: number, velocity: number, moved: number }} */
  let drag = null;
  let rafId = 0;
  let momentum = 0;

  /** @param {Element|null} t */
  const isInteractive = (t) => {
    while (t && t !== track) {
      const el = /** @type {HTMLElement} */ (t);
      if (INTERACTIVE.test(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.dataset?.noDrag != null) return true;
      t = el.parentNode;
    }
    return false;
  };

  const cancelMomentum = () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    momentum = 0;
  };

  const onDown = (e) => {
    if (e.pointerType === 'touch') return;              // native touch scroll wins
    if (e.button !== 0) return;                         // left button only
    if (isInteractive(e.target)) return;
    cancelMomentum();
    track.setPointerCapture(e.pointerId);
    drag = {
      id: e.pointerId,
      startX: e.clientX,
      startScroll: track.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
      moved: 0,
    };
    track.classList.add('drag-scroll--grabbing');
    track.classList.remove('drag-scroll--grab');
    // Pause scroll-snap while dragging — fights with manual scrollLeft.
    track.style.scrollSnapType = 'none';
  };

  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.lastX;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    drag.velocity = (dx / dt) * 16;                     // px per 60fps frame
    drag.lastX = e.clientX;
    drag.lastT = now;
    track.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
    drag.moved = Math.abs(e.clientX - drag.startX);
    e.preventDefault();
  };

  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    track.classList.remove('drag-scroll--grabbing');
    track.classList.add('drag-scroll--grab');
    // Restore scroll-snap after a tick so inertia doesn't fight the snap
    // while decaying. Once momentum is done, snap engages naturally.
    const wasMoved = drag.moved;
    const v = drag.velocity;
    drag = null;
    if (wasMoved > DRAG_THRESHOLD) {
      if (reduced || Math.abs(v) < MIN_VELOCITY) {
        track.style.scrollSnapType = '';
      } else {
        momentum = -v;
        const tick = () => {
          if (!momentum) return;
          track.scrollLeft += momentum;
          momentum *= DECAY;
          if (Math.abs(momentum) < MIN_VELOCITY) {
            momentum = 0;
            track.style.scrollSnapType = '';
            return;
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      }
      // Suppress the synthetic click at the end of a drag.
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        track.removeEventListener('click', swallow, true);
      };
      track.addEventListener('click', swallow, { capture: true, once: true });
    } else {
      // Not a drag — snap back immediately.
      track.style.scrollSnapType = '';
    }
  };

  const onCancel = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    track.classList.remove('drag-scroll--grabbing');
    track.classList.add('drag-scroll--grab');
    track.style.scrollSnapType = '';
  };

  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('pointercancel', onCancel);

  const controller = {
    destroy() {
      cancelMomentum();
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onCancel);
      track.classList.remove('drag-scroll', 'drag-scroll--grab', 'drag-scroll--grabbing');
      track.style.scrollSnapType = '';
      MOUNTED.delete(track);
    },
  };
  MOUNTED.set(track, controller);
  return controller;
}
