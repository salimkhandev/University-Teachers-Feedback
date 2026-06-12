/**
 * Paragraph Text Formatter.
 * Responsible for splitting large text blocks precisely at the character level
 * using <br> tags instead of pushing the entire paragraph.
 */
import { BR_SPACER_CLASS } from '../constants.js';
import { trackedSplitComponents } from '../reset/registry.js';

export const trySplitTextWithBR = (editor, comp, markerY, pageRect, threshold = 10) => {
  const el = comp.getEl();
  if (!el) return false;

  // Prevent splitting table elements - tables should be handled by table formatter
  const tagName = (comp.get('tagName') || el.tagName || '').toLowerCase();
  const isTableTag = ['table', 'thead', 'tbody', 'tr', 'td', 'th'].includes(tagName);
  if (isTableTag) return false;

  const frameDoc = el.ownerDocument || editor.Canvas.getDocument();
  const viewportY = markerY + pageRect.top;

  const walker = frameDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let targetNode = null;
  let targetOffset = 0;
  let node;

  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    const range = frameDoc.createRange();
    range.selectNodeContents(node);
    const lineRects = Array.from(range.getClientRects());
    if (!lineRects.length) continue;

    if (lineRects[lineRects.length - 1].bottom <= viewportY - 2) continue;

    targetNode = node;
    let low = 0,
      high = node.textContent.length;
    targetOffset = high;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const r = frameDoc.createRange();
      r.setStart(node, 0);
      r.setEnd(node, mid);
      const midRects = r.getClientRects();
      if (midRects.length > 0 && midRects[midRects.length - 1].bottom > viewportY - 2) {
        targetOffset = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    break;
  }

  if (!targetNode) {
    return false;
  }

  let safeOffset = targetOffset;
  const textStr = targetNode.textContent;

  const lastSpace = textStr.lastIndexOf(' ', targetOffset);
  if (lastSpace > 0) {
    safeOffset = lastSpace;
  } else if (targetOffset > 0) {
    safeOffset = targetOffset - 1;
  } else {
    safeOffset = 0;
  }

  try {
    if (targetNode.parentNode) {
      if (safeOffset < textStr.length) {
        targetNode.splitText(safeOffset);
      }
      const insertAfter = targetNode.nextSibling;
      for (let i = 0; i < 3; i++) {
        const br = frameDoc.createElement('br');
        br.className = BR_SPACER_CLASS;
        if (insertAfter) {
          targetNode.parentNode.insertBefore(br, insertAfter);
        } else {
          targetNode.parentNode.appendChild(br);
        }
      }
    }

    const newHtml = el.innerHTML;

    el.querySelectorAll(`.${BR_SPACER_CLASS}`).forEach((b) => b.remove());
    el.normalize();

    comp.components().reset(newHtml);
    trackedSplitComponents.add(comp);

    return true;
  } catch (e) {
    console.error('[PB-Split] Error:', e);
    el.normalize();
    return false;
  }
};
