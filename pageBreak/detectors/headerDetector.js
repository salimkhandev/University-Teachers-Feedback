import { HEADING_TAGS, KNOWN_NON_HEADERS } from '../constants.js';

let _headerCache = new WeakMap();
let _pageTopHeaderCache = new WeakMap();

export const resetHeaderCache = () => {
  _headerCache = new WeakMap();
  _pageTopHeaderCache = new WeakMap();
};

const isCompHeaderFast = (comp) => {
  const tag = (comp.get?.('tagName') || '').toLowerCase();
  if (HEADING_TAGS.has(tag)) return true;

  const cls = comp.getAttributes?.()?.class || '';
  const hasIntent = /header|title|chapter/i.test(cls);
  const isBold = /font-(semibold|bold|extrabold|black)/i.test(cls);
  const isLarge = /text-(lg|xl|[2-9]xl)/i.test(cls);

  // A component is a header if it has a large font size AND either semantic intent or bold styling.
  if (isLarge && (hasIntent || isBold)) return true;
  if (KNOWN_NON_HEADERS.has(tag)) return false;

  return null;
};

export const isCompHeader = (comp) => {
  if (_headerCache.has(comp)) return _headerCache.get(comp);

  let result = false;
  let current = comp;

  for (let i = 0; i < 3; i++) {
    if (!current) break;
    const fast = isCompHeaderFast(current);
    if (fast === true) {
      result = true;
      break;
    }
    try {
      const style = current.getStyle?.() || {};
      const fw = parseInt(style['font-weight'] || '400');
      const fs = parseFloat(style['font-size'] || '16px');
      if (fw >= 600 && fs > 14) {
        result = true;
        break;
      }
    } catch (_) {}
    const cls = (current.getAttributes?.()?.class || '').toLowerCase();
    if (cls.includes('visual-page')) break;
    current = current.parent?.();
  }

  _headerCache.set(comp, result);
  return result;
};

export const isPageTopHeader = (comp) => {
  if (_pageTopHeaderCache.has(comp)) return _pageTopHeaderCache.get(comp);

  let result = false;
  let current = comp;

  for (let i = 0; i < 3; i++) {
    if (!current) break;

    const cls = (current.getAttributes?.()?.class || '').toLowerCase();
    const isMassive = /text-([4-9]xl|10xl)/i.test(cls);
    const hasChapterIntent = /chapter/i.test(cls);

    if (isMassive || hasChapterIntent) {
      result = true;
      break;
    }

    try {
      const style = current.getStyle?.() || {};
      const fsStr = style['font-size'] || '';
      let fs = 0;
      if (fsStr.includes('px')) {
        fs = parseFloat(fsStr);
      } else if (fsStr.includes('rem')) {
        fs = parseFloat(fsStr) * 16;
      }

      if (fs >= 36) {
        result = true;
        break;
      }

      // Check actual browser computed style as a fallback
      const el = current.getEl?.();
      if (el && typeof el.getBoundingClientRect === 'function') {
        const view = el.ownerDocument?.defaultView || window;
        const computedStyle = view.getComputedStyle(el);
        const computedFs = parseFloat(computedStyle.fontSize);
        if (computedFs >= 36) {
          result = true;
          break;
        }
      }
    } catch (_) {}

    const classCheck = (current.getAttributes?.()?.class || '').toLowerCase();
    if (classCheck.includes('visual-page')) break;
    current = current.parent?.();
  }

  _pageTopHeaderCache.set(comp, result);
  return result;
};
