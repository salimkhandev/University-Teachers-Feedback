/**
 * tableLogic.js — Structural Bubble-Up Logic
 *
 * INTENT:
 * Handles the decision-making process when a page break hits a table/grid
 * sub-element. It resolves the atomic pagination unit as:
 *
 *   pushTargetComp (usually adopted header) → tableRootComp (table/grid bottom)
 *
 * This lets collisionDetector measure Header top → Table/Grid bottom instead of
 * measuring only the final push target.
 */

import { isElementStructuralTable } from './structuralDetector.js';

// ─── Internal Helpers ───────────────────────────────────────────────────────

const isDomElement = (el) =>
  !!el && el.nodeType === 1 && typeof el.getBoundingClientRect === 'function';

const getDisplay = (el) => {
  if (!isDomElement(el)) return '';
  const view = el.ownerDocument?.defaultView;
  return view?.getComputedStyle?.(el)?.display || '';
};

const getSiblingIndex = (parentComp, targetComp) => {
  const siblings = parentComp?.components?.();
  if (!siblings || !targetComp) return -1;
  const targetId = targetComp.getId?.();

  for (let i = 0; i < siblings.length; i++) {
    const sib = siblings.at(i);
    if (sib === targetComp) return i;
    if (targetId && sib?.getId?.() === targetId) return i;
  }

  return -1;
};

const isHeaderComp = (comp) => {
  const el = comp?.getEl?.();
  if (!isDomElement(el)) return false;
  if (/^H[1-6]$/i.test(el.tagName)) return true;
  return !!el.querySelector?.('h1,h2,h3,h4,h5,h6');
};

const isVisibleNonEmpty = (comp) => {
  const el = comp?.getEl?.();
  if (!isDomElement(el)) return false;
  if (el.hasAttribute('data-editor-spacer') || el.hasAttribute('data-editor-spacer-header')) {
    return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && el.textContent.trim().length > 0;
};

const isRowLike = (comp) => {
  const el = comp?.getEl?.();
  const tag = (comp?.get?.('tagName') || el?.tagName || '').toLowerCase();
  const cls = (comp?.getAttributes?.()?.class || '').toLowerCase();
  const role = el?.getAttribute?.('role');
  const display = getDisplay(el);

  const parentEl = el?.parentElement;
  const parentDisplay = getDisplay(parentEl);
  const parentCls = (parentEl?.getAttribute('class') || '').toLowerCase();

  if (parentDisplay.includes('grid') || parentCls.includes('grid')) {
    return true;
  }

  return tag === 'tr' || role === 'row' || cls.includes('row') || display === 'table-row';
};

const isTableRootLike = (comp) => {
  const el = comp?.getEl?.();
  if (!isDomElement(el)) return false;

  const tag = (comp?.get?.('tagName') || el.tagName || '').toLowerCase();
  const role = el.getAttribute?.('role');
  const cls = (comp?.getAttributes?.()?.class || '').toLowerCase();
  const display = getDisplay(el);

  const isNativeLike =
    tag === 'table' ||
    role === 'table' ||
    role === 'grid' ||
    display === 'table' ||
    display === 'inline-table' ||
    cls.includes('css-table') ||
    cls.includes('css-inline-table');
  if (isNativeLike) return true;

  const pageEl = el.ownerDocument?.querySelector('.visual-page');
  return !!isElementStructuralTable(el, pageEl);
};

const measureTop = (comp, pageRect, accumulatedShift) => {
  const el = comp?.getEl?.();
  if (!isDomElement(el)) return null;
  const rect = el.getBoundingClientRect();
  return rect.top - pageRect.top + accumulatedShift;
};

const findDirectChildTableRoot = (comp) => {
  const children = comp?.components?.();
  if (!children) return null;

  for (let i = 0; i < children.length; i++) {
    const child = children.at(i);
    if (isTableRootLike(child)) return child;
  }

  return null;
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * resolveTablePushTarget(comp, vTop, pageRect, accumulatedShift)
 *
 * Returns:
 * - pushTargetComp: adopted header if found, otherwise table/grid root or comp
 * - pushTargetVTop: top of pushTargetComp
 * - tableRootComp: real structural table/grid root, if one was found
 * - tableRootVTop: top of tableRootComp, if one was found
 * - breakTargetComp: row/item target to push when the full unit is too large
 * - breakTargetVTop: top of breakTargetComp
 */
export const resolveTablePushTarget = (comp, vTop, pageRect, accumulatedShift) => {
  let pushTargetComp = comp;
  let pushTargetVTop = vTop;
  let tableRootComp = null;
  let tableRootVTop = null;
  let breakTargetComp = comp;
  let breakTargetVTop = vTop;

  // 1. If the actionable candidate is a wrapper like `.section-box`, detect a
  // direct table/grid child first. This avoids visible wrappers hiding the real
  // Header + Table/Grid unit from the table resolver.
  const directChildRoot = findDirectChildTableRoot(comp);
  if (directChildRoot) {
    tableRootComp = directChildRoot;
    tableRootVTop = measureTop(directChildRoot, pageRect, accumulatedShift) ?? vTop;
    pushTargetComp = directChildRoot;
    pushTargetVTop = tableRootVTop;
    breakTargetComp = directChildRoot;
    breakTargetVTop = tableRootVTop;
  }

  // 2. Row bubble-up: if collision starts inside a cell, promote to its row.
  if (!tableRootComp && !isTableRootLike(pushTargetComp)) {
    let current = pushTargetComp;
    for (let i = 0; i < 4; i++) {
      if (!current) break;
      if (isRowLike(current)) {
        pushTargetComp = current;
        pushTargetVTop = measureTop(current, pageRect, accumulatedShift) ?? pushTargetVTop;
        breakTargetComp = current;
        breakTargetVTop = pushTargetVTop;
        break;
      }
      current = current.parent?.();
    }
  }

  // 3. Contents-climb: keep legacy support for display:contents wrappers.
  if (!tableRootComp) {
    let contentsClimb = pushTargetComp.parent?.();
    let topContentsParent = null;

    for (let i = 0; i < 6; i++) {
      if (!contentsClimb) break;
      const cls = (contentsClimb.getAttributes?.()?.class || '').toLowerCase();

      if (cls.includes('contents') && !cls.includes('grid') && !cls.includes('flex')) {
        topContentsParent = contentsClimb;
        contentsClimb = contentsClimb.parent?.();
      } else if (cls.includes('grid') || cls.includes('table') || cls.includes('flex')) {
        break;
      } else {
        contentsClimb = contentsClimb.parent?.();
      }
    }

    if (topContentsParent) {
      pushTargetComp = topContentsParent;
      pushTargetVTop = measureTop(topContentsParent, pageRect, accumulatedShift) ?? pushTargetVTop;
    }
  }

  // 4. Table/grid root bubble: climb from the current node up to the real root.
  if (!tableRootComp) {
    let rootClimb = pushTargetComp;

    while (rootClimb) {
      const el = rootClimb.getEl?.();
      const tag = (rootClimb.get?.('tagName') || el?.tagName || '').toLowerCase();
      const cls = (rootClimb.getAttributes?.()?.class || '').toLowerCase();

      if (isTableRootLike(rootClimb)) {
        tableRootComp = rootClimb;
        tableRootVTop = measureTop(rootClimb, pageRect, accumulatedShift) ?? pushTargetVTop;
        pushTargetComp = rootClimb;
        pushTargetVTop = tableRootVTop;
      } else if (tag === 'body' || cls.includes('visual-page')) {
        break;
      }

      rootClimb = rootClimb.parent?.();
    }
  }

  // 5. Header adoption: once the real table/grid root is known, look for a
  // previous visible header sibling at the same hierarchy level.
  if (tableRootComp) {
    const unitParent = tableRootComp.parent?.();
    const myIdx = getSiblingIndex(unitParent, tableRootComp);

    if (unitParent && myIdx > 0) {
      const tableTop = tableRootVTop ?? pushTargetVTop;
      const HEADER_ADOPTION_GAP_PX = 300;

      for (let si = myIdx - 1; si >= 0; si--) {
        const sib = unitParent.components().at(si);
        if (!sib) break;
        if (!isVisibleNonEmpty(sib)) continue;

        if (isHeaderComp(sib)) {
          const sibEl = sib.getEl();
          const sibRect = sibEl.getBoundingClientRect();
          const headerBottom = sibRect.bottom - pageRect.top + accumulatedShift;
          const visualGap = tableTop - headerBottom;

          if (visualGap <= HEADER_ADOPTION_GAP_PX) {
            pushTargetComp = sib;
            pushTargetVTop = sibRect.top - pageRect.top + accumulatedShift;
          }
          break;
        }

        // Stop on the first visible non-header sibling; the table is not directly
        // associated with a header across arbitrary content.
        break;
      }
    }
  }

  return {
    pushTargetComp,
    pushTargetVTop,
    tableRootComp,
    tableRootVTop,
    breakTargetComp,
    breakTargetVTop,
  };
};
