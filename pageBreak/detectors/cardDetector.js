import { ATOMIC_TABLE_HEIGHT_LIMIT, PAGE_ROOT_TYPES } from '../constants.js';
import { parseRgb } from '../domHelpers.js';
import { isCompHeader } from '../componentHelpers.js';
import {
  detectAllTables,
  findTableMatrix,
  visibleChildren,
  isDataCell,
} from './structuralDetector.js';

export const isVisibleContainer = (comp, precomputed) => {
  const el = comp.getEl();
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;

  if (isCompHeader(comp)) return false;

  // 0. IGNORE PAGE ROOT ELEMENTS & WRAPPERS
  const type = comp.get?.('type');
  const id = (typeof comp.getId === 'function' ? comp.getId() : comp.get?.('id')) || '';
  const cls = (
    typeof comp.getAttributes === 'function' ? comp.getAttributes()?.class || '' : ''
  ).toLowerCase();
  if (
    (type && PAGE_ROOT_TYPES.has(type)) ||
    id.includes('visual-page') ||
    cls.includes('visual-page')
  ) {
    return false;
  }

  const elRect = precomputed?.elRect || el.getBoundingClientRect();
  // 1. IGNORE INTERNAL SPACERS
  if (comp.getAttributes?.()['data-editor-spacer'] !== undefined) return false;

  // 2. IGNORE NATIVE TABLE TAGS
  const tag = (comp.get?.('tagName') || el.tagName || '').toLowerCase();
  const tableTags = [
    'table',
    'tbody',
    'thead',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'col',
    'colgroup',
  ];
  if (tableTags.includes(tag)) return false;

  // 3. SYNCHRONIZE ATOMIC LIMIT (600px)
  if (!precomputed?.ignoreHeightLimit && elRect.height > ATOMIC_TABLE_HEIGHT_LIMIT) return false;

  const view = el.ownerDocument?.defaultView || window;
  const s = precomputed?.computedStyle || view.getComputedStyle(el);

  const bgRgb = parseRgb(s.backgroundColor);
  let hasMeaningfulBg = false;
  if (bgRgb && bgRgb.a > 0.08) {
    const { r, g, b } = bgRgb;
    const isNearWhite = r > 240 && g > 240 && b > 240;
    const isNearBlack = r < 15 && g < 15 && b < 15;
    if (!isNearWhite && !isNearBlack) {
      hasMeaningfulBg = true;
    }
  }

  const hasBorder =
    (s.borderTopWidth !== '0px' && s.borderTopStyle !== 'none') ||
    (s.borderBottomWidth !== '0px' && s.borderBottomStyle !== 'none') ||
    (s.borderLeftWidth !== '0px' && s.borderLeftStyle !== 'none') ||
    (s.borderRightWidth !== '0px' && s.borderRightStyle !== 'none');

  const hasShadow = s.boxShadow !== 'none' && s.boxShadow !== '';

  // Check gradient backgrounds — backgroundImage contains 'gradient' for Tailwind bg-gradient-* classes.
  const hasGradientBg = s.backgroundImage !== 'none' && s.backgroundImage.includes('gradient');

  return hasMeaningfulBg || hasGradientBg || hasBorder || hasShadow;
};

const CARD_COLOR = '#8b5cf6'; // Violet for cards

/**
 * detectAllCards(editor)
 * Identifies the ROOTS of atomic cards using the legacy bubble-up logic.
 */
export const detectAllCards = (editor) => {
  if (!editor) return [];
  const comps = editor.Pages.getSelected().getMainComponent().find('*');
  const tableEls = new Set(detectAllTables(editor).map((t) => t.el));

  const results = [];
  const roots = new Set();

  for (const comp of comps) {
    const el = comp.getEl();
    if (!el || tableEls.has(el)) continue;

    // --- LEGACY BUBBLE-UP LOGIC ---
    // If we find a visual container, we climb to find its topmost valid "Atomic" parent.
    if (isVisibleContainer(comp, { ignoreHeightLimit: true })) {
      let currentRoot = comp;
      let climber = comp.parent();

      while (climber) {
        // If parent is also a visible container and within height limits
        if (isVisibleContainer(climber)) {
          const rect = climber.getEl()?.getBoundingClientRect();
          // We follow the shared 600px rule for the final "Atomic" target
          if (rect && rect.height <= ATOMIC_TABLE_HEIGHT_LIMIT) {
            currentRoot = climber;
          }
        }

        const cls = (climber.getAttributes?.().class || '').toLowerCase();
        if (cls.includes('visual-page')) break;
        climber = climber.parent();
      }

      const rootEl = currentRoot.getEl();
      if (rootEl && !roots.has(rootEl)) {
        const rect = rootEl.getBoundingClientRect();
        // A card is only atomic if it strictly fits within the 600px limit
        if (rect && rect.height <= ATOMIC_TABLE_HEIGHT_LIMIT) {
          roots.add(rootEl);
          results.push({ el: rootEl, comp: currentRoot, type: 'Atomic Card' });
        }
      }
    }
  }
  return results;
};

export const clearCardHighlights = (editor) => {
  if (!editor) return;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return;
  frameDoc.querySelectorAll('[data-card-badge]').forEach((b) => b.remove());
  frameDoc.querySelectorAll('[data-card-highlighted]').forEach((el) => {
    el.removeAttribute('data-card-highlighted');
    el.style.outline = '';
  });
};

/**
 * highlightCards(editor)
 */
export const highlightCards = (editor) => {
  if (!editor) return 0;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return 0;

  // 1. CLEAR OLD STATE
  clearCardHighlights(editor);

  const cards = detectAllCards(editor);

  cards.forEach(({ el, type }, idx) => {
    const height = Math.round(el.getBoundingClientRect().height);
    const color = CARD_COLOR;
    const index = idx + 1;

    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';

    el.setAttribute('data-card-highlighted', 'true');
    el.style.outline = `2px solid ${color}`;

    const badge = frameDoc.createElement('div');
    badge.setAttribute('data-card-badge', String(index));
    badge.innerHTML = `<b style="margin-right:6px">C${index}</b> ${type} <span style="margin-left:8px; opacity:0.8; font-size:10px">[${height}px]</span>`;

    Object.assign(badge.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      zIndex: '9999',
      background: color,
      color: 'white',
      padding: '2px 10px',
      borderRadius: '0 0 0 8px',
      fontSize: '11px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    el.prepend(badge);
  });

  return cards.length;
};
