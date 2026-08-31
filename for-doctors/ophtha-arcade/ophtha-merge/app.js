import './app-core.js';
import { parseFormattedInteger } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INTERACTIVE_SELECTOR = 'button,a,input,select,textarea,label';
const SWIPE_HINT_KEY = 'ophthaMergeSwipeHintSeenV1';
const isEnglish = String(document.documentElement.lang || '').toLowerCase().startsWith('en');
const SWIPE_GUIDANCE = isEnglish
  ? 'Swipes inside the board move tiles. To scroll the page, start the gesture outside the game area.'
  : 'Свайпы внутри поля управляют плитками. Чтобы прокрутить страницу, начните жест за пределами игровой зоны.';
const SWIPE_HINT_LINE = isEnglish
  ? '← ↑ → ↓ Swipe inside the game area · scroll outside'
  : '← ↑ → ↓ Свайпайте внутри игровой зоны · прокручивайте страницу снаружи';

const ICON_SHAPES = {
  1: [
    ['path', { d: 'M24 5C18 13 13 19 13 27a11 11 0 0 0 22 0C35 19 30 13 24 5Z' }],
    ['path', { d: 'M18 29c1.2 3.2 3.4 4.8 6.6 5.1' }]
  ],
  2: [
    ['ellipse', { cx: '24', cy: '24', rx: '15', ry: '8.5' }],
    ['path', { d: 'M12 24c3.8-3.6 7.8-5.4 12-5.4S32.2 20.4 36 24c-3.8 3.6-7.8 5.4-12 5.4S15.8 27.6 12 24Z' }]
  ],
  3: [
    ['path', { d: 'M8 29c8-12 24-12 32 0' }],
    ['path', { d: 'M11 33c7-8 19-8 26 0' }],
    ['path', { d: 'M14 37c5-4.8 15-4.8 20 0' }]
  ],
  4: [
    ['circle', { cx: '24', cy: '24', r: '14' }],
    ['circle', { cx: '24', cy: '24', r: '6' }],
    ['path', { d: 'M24 10v5M24 33v5M10 24h5M33 24h5M14.1 14.1l3.5 3.5M30.4 30.4l3.5 3.5M33.9 14.1l-3.5 3.5M17.6 30.4l-3.5 3.5' }]
  ],
  5: [
    ['path', { d: 'M8 31c6-2 9-8 15-8 5 0 7 5 11 5 2.7 0 4.6-1 6-2.2' }],
    ['path', { d: 'M8 36c6-2 10-6 15-6 5 0 7 4 11 4 2.5 0 4.4-.8 6-2' }],
    ['circle', { cx: '16', cy: '19', r: '2.2' }],
    ['circle', { cx: '23', cy: '15', r: '1.6' }],
    ['circle', { cx: '31', cy: '19', r: '2' }]
  ],
  6: [
    ['ellipse', { cx: '24', cy: '24', rx: '10', ry: '14' }],
    ['path', { d: 'M14 17C8 15 6 10 6 7M14 31c-6 2-8 7-8 10M34 17c6-2 8-7 8-10M34 31c6 2 8 7 8 10' }]
  ],
  7: [
    ['path', { d: 'M8 12h32M8 18h32M8 24h32M8 30h32M8 36h32' }],
    ['path', { d: 'M9 31c5-1 7-9 12-9 4.5 0 5.5 8 10 8 3 0 5-3 8-7' }]
  ],
  8: [
    ['path', { d: 'M24 6v9M24 33v9M6 24h9M33 24h9M11.3 11.3l6.3 6.3M30.4 30.4l6.3 6.3M36.7 11.3l-6.3 6.3M17.6 30.4l-6.3 6.3' }],
    ['circle', { cx: '24', cy: '24', r: '5.5' }]
  ],
  9: [
    ['path', { d: 'M18 8h12v7H18zM20 15v8l-6 7v8h20v-8l-6-7v-8M15 38h20' }],
    ['path', { d: 'M18 28h12M14 33h20' }]
  ],
  10: [
    ['path', { d: 'M24 5l6 12 13 2-9.5 9 2.3 13L24 35l-11.8 6 2.3-13L5 19l13-2L24 5Z' }],
    ['circle', { cx: '24', cy: '24', r: '4' }]
  ]
};

function addShape(svg, [tag, attrs]) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  svg.append(node);
}

function createTileIcon(level) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('ophtha-merge-tile-icon');
  const iconLevel = Math.min(10, Math.max(1, Number(level) || 1));
  (ICON_SHAPES[iconLevel] || ICON_SHAPES[10]).forEach((shape) => addShape(svg, shape));
  return svg;
}

function tileLevel(tile) {
  const value = parseFormattedInteger(tile.querySelector('.ophtha-merge-tile-number')?.textContent, 2);
  return Math.max(1, Math.round(Math.log2(value)));
}

function upgradeTileIcons(root = document) {
  root.querySelectorAll('.ophtha-merge-tile').forEach((tile) => {
    const mark = tile.querySelector('.ophtha-merge-tile-mark');
    if (!mark || mark.dataset.iconReady === 'true') return;
    mark.replaceChildren(createTileIcon(tileLevel(tile)));
    mark.dataset.iconReady = 'true';
  });
}

const board = document.querySelector('#game-board');
const boardWrap = document.querySelector('#game-play-zone');
const swipeHint = boardWrap?.nextElementSibling?.classList.contains('ophtha-merge-swipe-hint')
  ? boardWrap.nextElementSibling
  : null;
let playZone = boardWrap;
let touchTip = null;

if (boardWrap?.parentElement) {
  playZone = document.createElement('div');
  playZone.classList.add('ophtha-merge-touch-zone');
  playZone.id = 'game-play-zone';
  boardWrap.removeAttribute('id');
  boardWrap.parentElement.insertBefore(playZone, boardWrap);
  playZone.append(boardWrap);
  if (swipeHint) playZone.append(swipeHint);
} else {
  playZone?.classList.add('ophtha-merge-touch-zone');
}

if (swipeHint) swipeHint.textContent = SWIPE_HINT_LINE;

if (playZone) {
  touchTip = document.createElement('div');
  touchTip.className = 'ophtha-merge-touch-tip';
  touchTip.setAttribute('role', 'status');
  touchTip.setAttribute('aria-live', 'polite');
  touchTip.textContent = SWIPE_GUIDANCE;
  playZone.append(touchTip);
}

upgradeTileIcons(board || document);

if (board) {
  const iconObserver = new MutationObserver(() => upgradeTileIcons(board));
  iconObserver.observe(board, { childList: true, subtree: true });
}

let gesture = null;
let touchGesture = null;
let hintTimer = null;

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function setPlayZoneActive(active) {
  playZone?.classList.toggle('is-touch-active', Boolean(active));
}

function showSwipeGuidanceOnce() {
  if (!touchTip) return;
  let seen = false;
  try { seen = localStorage.getItem(SWIPE_HINT_KEY) === '1'; } catch {}
  if (seen) return;
  touchTip.classList.add('is-visible');
  try { localStorage.setItem(SWIPE_HINT_KEY, '1'); } catch {}
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => touchTip?.classList.remove('is-visible'), 3600);
}

function releaseGesture(pointerId) {
  if (!playZone) return;
  try {
    if (playZone.hasPointerCapture?.(pointerId)) playZone.releasePointerCapture(pointerId);
  } catch {}
}

function dispatchSwipe(dx, dy) {
  if (!board || Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  const key = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
    : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
  board.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function onPointerDown(event) {
  if (!playZone || !board || isInteractiveTarget(event.target)) return;
  gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  setPlayZoneActive(true);
  if (event.pointerType === 'touch') showSwipeGuidanceOnce();
  try { playZone.setPointerCapture(event.pointerId); } catch {}
  event.preventDefault();
  event.stopPropagation();
}

function onPointerMove(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
}

function onPointerUp(event) {
  if (!gesture || event.pointerId !== gesture.pointerId || !board) return;
  event.preventDefault();
  event.stopPropagation();
  const current = gesture;
  gesture = null;
  releaseGesture(event.pointerId);
  setPlayZoneActive(false);
  dispatchSwipe(event.clientX - current.x, event.clientY - current.y);
}

function onPointerCancel(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  gesture = null;
  releaseGesture(event.pointerId);
  setPlayZoneActive(false);
}

function trackedTouch(list, identifier) {
  return Array.from(list || []).find((touch) => touch.identifier === identifier) || null;
}

function onTouchStart(event) {
  if (!playZone || !board || isInteractiveTarget(event.target) || event.touches.length !== 1) return;
  const touch = event.changedTouches[0] || event.touches[0];
  touchGesture = {
    identifier: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    pointerSupported: 'PointerEvent' in window
  };
  setPlayZoneActive(true);
  showSwipeGuidanceOnce();
}

function onTouchMove(event) {
  if (!touchGesture) return;
  const touch = trackedTouch(event.touches, touchGesture.identifier);
  if (!touch) return;
  event.preventDefault();
  event.stopPropagation();
}

function onTouchEnd(event) {
  if (!touchGesture) return;
  const touch = trackedTouch(event.changedTouches, touchGesture.identifier);
  const current = touchGesture;
  touchGesture = null;
  setPlayZoneActive(false);
  if (!touch) return;
  event.preventDefault();
  event.stopPropagation();
  if (!current.pointerSupported) dispatchSwipe(touch.clientX - current.x, touch.clientY - current.y);
}

function onTouchCancel(event) {
  if (!touchGesture) return;
  touchGesture = null;
  setPlayZoneActive(false);
  event.preventDefault();
  event.stopPropagation();
}

if (playZone) {
  playZone.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false });
  playZone.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  playZone.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
  playZone.addEventListener('pointercancel', onPointerCancel, { capture: true, passive: false });
  playZone.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
  playZone.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  playZone.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  playZone.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: false });
}
