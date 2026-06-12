/**
 * Container Block Formatter.
 * Responsible for finding the most optimal child to break on within large flex/grid
 * or generic wrappers to avoid pushing the entire wrapper down.
 */
import { INLINE_TAGS } from '../constants.js';
import { vRect } from '../domHelpers.js';
import { applyMarginPush } from '../pushEngine.js';

export const trySplitLargeElement = (
  targetComp,
  markerBottom,
  clearance,
  pageRect,
  currentMarkers,
  markerIndex,
  passShiftedIds
) => {
  let children = [];
  try {
    children = targetComp.components();
  } catch (_) {
    return false;
  }
  if (!children?.length) return false;

  const targetClasses = (targetComp.getAttributes()?.class || '').toLowerCase();
  if (
    targetClasses.includes('flex') &&
    !targetClasses.includes('flex-col') &&
    !targetClasses.includes('flex-wrap')
  ) {
    return false;
  }

  let targetChild = null;
  let bestBottom = -Infinity;

  for (let i = 0; i < children.length; i++) {
    const child = children.at(i);
    const el = child.getEl();
    if (!el) continue;

    const tagName = (child.get('tagName') || child.get('type') || el.tagName || '').toLowerCase();
    if (INLINE_TAGS.has(tagName) || ['textnode', 'text', 'script', 'style'].includes(tagName))
      continue;

    if (tagName === 'td' || tagName === 'th') return false;

    let { top: ct, bottom: cb } = vRect(el, pageRect);

    if (ct < markerBottom && cb > markerBottom) {
      targetChild = child;
      bestBottom = cb;
      break;
    }
    if (cb <= markerBottom && cb > bestBottom) {
      targetChild = child;
      bestBottom = cb;
    }
  }

  if (!targetChild) {
    for (let i = 0; i < children.length; i++) {
      const child = children.at(i);
      const el = child.getEl();
      if (!el) continue;

      const tagName = (child.get('tagName') || child.get('type') || el.tagName || '').toLowerCase();
      if (INLINE_TAGS.has(tagName) || ['textnode', 'text', 'script', 'style'].includes(tagName))
        continue;

      if (tagName === 'td' || tagName === 'th') return false;

      let { top: ct } = vRect(el, pageRect);

      if (ct >= markerBottom && ct < markerBottom + clearance + 20) {
        targetChild = child;
        bestBottom = ct;
        break;
      }
    }
  }

  if (!targetChild) return false;
  if (bestBottom < markerBottom - 100) return false;

  let push = Math.max(clearance, Math.ceil(markerBottom + clearance - bestBottom));

  const nextMarker = currentMarkers[markerIndex + 1];
  if (nextMarker) {
    const nextTop = nextMarker.getBoundingClientRect().top - pageRect.top;
    if (markerBottom + push > nextTop - 50)
      push = Math.max(0, nextTop - 50 - (markerBottom - clearance));
  }
  if (push <= 0) return false;

  applyMarginPush(targetChild, push);

  passShiftedIds.add(targetChild.getId());
  return true;
};
