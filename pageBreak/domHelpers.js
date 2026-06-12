/**
 * Shared DOM utility functions.
 * Responsible for calculating actual bounding rects, parsing styles, and finding visual canvas roots.
 */

export const getPageEl = (editor) => {
  const w = editor.getWrapper();
  return (w.find('.visual-page')[0] || w.find('#visual-page-id')[0])?.getEl() ?? null;
};

export const getTrueRect = (el) => {
  let r = el.getBoundingClientRect();
  if (r.height < 2 && el.children?.length > 0) {
    let minT = Infinity,
      maxB = -Infinity,
      minL = Infinity,
      maxR = -Infinity;
    for (let j = 0; j < el.children.length; j++) {
      const cR = el.children[j].getBoundingClientRect();
      if (cR.top < minT) minT = cR.top;
      if (cR.bottom > maxB) maxB = cR.bottom;
      if (cR.left < minL) minL = cR.left;
      if (cR.right > maxR) maxR = cR.right;
    }
    if (minT !== Infinity)
      return {
        top: minT,
        bottom: maxB,
        left: minL,
        right: maxR,
        height: maxB - minT,
        width: maxR - minL,
      };
  }
  return r;
};

export const vRect = (el, pageRect) => {
  if (!el || typeof el.getBoundingClientRect !== 'function')
    return { top: 0, bottom: 0, height: 0 };
  const r = getTrueRect(el);
  return { top: r.top - pageRect.top, bottom: r.bottom - pageRect.top, height: r.height };
};

export const parseRgb = (css) => {
  if (!css) return null;
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
};

export const isStructuredLayout = (comp) => {
  const cls = (comp.getAttributes?.().class || '').toLowerCase();
  if (cls.includes('grid') || cls.includes('flex')) return true;
  return false;
};
