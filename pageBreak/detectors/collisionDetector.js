/**
 * Detection Utilities.
 * Responsible for finding candidate elements that interact with the page break lines
 * and determining if an element or its text lines strictly cross a marker.
 */
import { isCompHeader, isVisibleContainer } from '../componentHelpers.js';
import { INLINE_TAGS, PAGE_ROOT_TYPES } from '../constants.js';
import { getPageEl, getTrueRect } from '../domHelpers.js';
import { resolveHeaderStackTarget } from '../formatters/headerFormatter.js';

export const findBlockCandidates = (editor, markerYs = null) => {
  if (!editor) return [];
  const wrapper = editor.getWrapper();
  const page = wrapper.find('.visual-page')[0] || wrapper.find('#visual-page-id')[0];
  if (!page) return [];

  const pageEl = page.getEl();
  if (!pageEl) return [];
  const pageRect = pageEl.getBoundingClientRect();

  const candidates = [];
  const seenIds = new Set();

  const checkComponent = (comp) => {
    const el = comp.getEl();
    if (!el || typeof el.getBoundingClientRect !== 'function') return;

    if (el.classList?.contains('page-break-indicator') || el.closest?.('.page-break-indicator'))
      return;
    if (el.hasAttribute('data-editor-spacer') || el.hasAttribute('data-editor-spacer-header'))
      return;

    // Skip elements that are out of flow and cannot be shifted by the engine.
    // position:fixed is always viewport-relative.
    // position:absolute with no text is a decorative shell (gradient bg, blur orb, etc.)
    const computedPos = el.ownerDocument?.defaultView?.getComputedStyle(el)?.position;
    if (computedPos === 'fixed' || computedPos === 'absolute') {
      const computedStyle = el.ownerDocument?.defaultView?.getComputedStyle(el);
      const isPinnedToBottom = computedStyle?.bottom !== 'auto';
      const hasText = !!el.textContent?.trim();
      const isExplicit = el.hasAttribute('data-pagination-candidate');

      // Ignore if it's an empty decorative shell AND pinned to the bottom (like inset-0 or fixed footers).
      // If it has text, is now explicitly marked, or only has a 'top' (bottom: auto), we let it be pushed!
      if (!hasText && !isExplicit && isPinnedToBottom) return;
    }

    const type = comp.get('type');
    const id = comp.getId() || '';
    const cls = (comp.getAttributes?.().class || '').toLowerCase();

    if (PAGE_ROOT_TYPES.has(type) || id.includes('visual-page') || cls.includes('visual-page')) {
      comp.components().forEach(checkComponent);
      return;
    }

    if (markerYs !== null) {
      const r = getTrueRect(el);
      let top = r.top - pageRect.top;
      let bottom = r.bottom - pageRect.top;

      const lookback = 1000; // Match max Header Stack climb (10 * 100px)
      const intersectsAny = markerYs.some((my) => top < my + 100 && bottom > my - lookback);
      if (!intersectsAny) return;
    }

    let target = comp;
    let targetEl = el;

    // GrapesJS TextNodes have no tagName. Climb to their parent element first.
    if (!targetEl?.tagName || target.get('type') === 'textnode') {
      const parent = target.parent();
      if (parent) {
        target = parent;
        targetEl = parent.getEl();
      }
    }

    while (targetEl?.tagName && INLINE_TAGS.has(targetEl.tagName.toLowerCase())) {
      const parent = target.parent();
      if (!parent) break;
      target = parent;
      targetEl = parent.getEl();
    }

    const cid = target.getId();
    if (!seenIds.has(cid)) {
      seenIds.add(cid);
      candidates.push({ id: cid, comp: target });
    }

    comp.components().forEach(checkComponent);
  };

  if (markerYs !== null) {
    // Spatial Culling Mode
    if (markerYs.length === 0) return candidates; // Zero markers in viewport -> absolutely no scan

    // Phase A — Shallow section scan: read one rect per top-level child of the visual-page.
    page.components().forEach((sectionComp) => {
      const sEl = sectionComp.getEl();

      // Can't measure this section's bounds → include it defensively to avoid false negatives.
      if (!sEl || typeof sEl.getBoundingClientRect !== 'function') {
        checkComponent(sectionComp);
        return;
      }

      const r = sEl.getBoundingClientRect();
      const sTop = r.top - pageRect.top;
      const sBottom = r.bottom - pageRect.top;

      const nearAnyMarker = markerYs.some((my) => sTop < my + 300 && sBottom > my - 800);

      // Phase B — Deep scan: run the full recursive checkComponent only on sections that pass.
      if (nearAnyMarker) checkComponent(sectionComp);
    });
  } else {
    // Full Document Scan Mode (markerYs is null) - used by orchestrator 'Fix All' button
    page.components().forEach(checkComponent);
  }

  return candidates;
};

export const checkComponentBroken = (editor, comp, markerY, options = {}) => {
  const { accumulatedShift = 0, threshold = 10 } = options;
  const el = comp.getEl();
  if (!el) return null;

  if (el.hasAttribute('data-editor-spacer') || el.hasAttribute('data-editor-spacer-header'))
    return null;

  const pageRect =
    options.pageRect ||
    (() => {
      const pageEl = getPageEl(editor);
      return pageEl ? pageEl.getBoundingClientRect() : null;
    })();
  if (!pageRect) return null;
  const frameDoc = editor.Canvas.getDocument();

  let compRect = options.compRect;
  if (!compRect) {
    compRect = getTrueRect(el);
  }

  const vTop = compRect.top - pageRect.top + accumulatedShift;
  const vBottom = compRect.bottom - pageRect.top + accumulatedShift;

  let isHeader = isCompHeader(comp);
  const headerClearance = isHeader ? 100 : 0;

  // --- ATOMIC NATIVE TABLE DETECTION ---
  // Check if red line is on a small native table and mark it as broken
  const tagName = (comp.get('tagName') || el.tagName || '').toLowerCase();
  if (tagName === 'table') {
    const tableHeight = compRect.height;
    const ATOMIC_TABLE_HEIGHT_LIMIT = 600;
    if (tableHeight <= ATOMIC_TABLE_HEIGHT_LIMIT) {
      // If red line is anywhere within table bounds, mark as broken
      if (vTop < markerY && vBottom > markerY) {
        return {
          comp: comp,
          vTop,
          vBottom,
          compHeight: tableHeight,
          brokenLines: [{ rect: compRect, node: null, vTop, vBottom }],
          isMultiLine: false,
          forceWrapperPush: false,
          forbidWholesalePush: false,
          isAtomicTable: true,
        };
      }
    }
  }

  if (vTop > markerY + 2) return null;
  if (!isHeader && vBottom < markerY - threshold - 5) return null;
  if (isHeader && vBottom + headerClearance < markerY - threshold - 5) return null;

  const walker = frameDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  const textData = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    const range = frameDoc.createRange();
    range.selectNodeContents(node);
    textData.push({ rect: range.getBoundingClientRect(), node });
  }
  if (!textData.length) textData.push({ rect: compRect, node: null });

  // Only flag a line as "broken" if it genuinely crosses the marker.
  // Filter requires: line top is near the marker (rt < markerY + 2) AND
  // line bottom actually crosses the marker (rb > markerY).
  // This ignores boundary touches where the element ends exactly at the page edge.
  let brokenLines = textData
    .map(({ rect: r, node }) => ({
      rect: r,
      node,
      vTop: r.top - pageRect.top + accumulatedShift,
      vBottom: r.bottom - pageRect.top + accumulatedShift,
    }))
    .filter(({ vTop: rt, vBottom: rb }) => rt < markerY + 2 && rb > markerY)
    .map((l) => ({ ...l, isOverlap: l.vTop < markerY + 2 && l.vBottom > markerY }));

  // ── Shell overlap check ──────────────────────────────────────────
  let pushTargetComp = comp;
  let pushTargetVTop = vTop;
  let isOrphaned = false;
  let forceTopPush = false;

  // Check if this is a page-top header that should be forced to push
  const pageTopY = options.pageTopY || pageRect.top;
  const isPageTopHeaderComp = isHeader && vTop < pageTopY + 50 && vBottom > pageTopY - 10;
  if (isPageTopHeaderComp) {
    forceTopPush = true;
  }

  const isShellOverlap = isVisibleContainer(comp) && vTop < markerY && vBottom > markerY - 2;
  if (isShellOverlap && brokenLines.length === 0) {
    brokenLines.push({
      rect: compRect,
      node: null,
      vTop: vTop,
      vBottom: vBottom,
      isOverlap: true,
      isShellBreak: true,
    });
  }

  if (!brokenLines.length) {
    if (isHeader && vBottom <= markerY && vBottom + headerClearance >= markerY - threshold) {
      isOrphaned = true;
    } else {
      return null;
    }
  } else {
    isOrphaned = isHeader;
  }

  const { cachedCandidates } = options;
  if ((isOrphaned || (brokenLines.length > 0 && !isHeader)) && cachedCandidates) {
    const { topMostHeaderComp, isOrphaned: resultIsOrphaned } = resolveHeaderStackTarget(
      comp,
      vTop,
      isHeader,
      cachedCandidates,
      pageRect,
      accumulatedShift,
      markerY
    );
    if (resultIsOrphaned !== undefined) isOrphaned = resultIsOrphaned;

    if (topMostHeaderComp && topMostHeaderComp.getId() !== comp.getId()) {
      pushTargetComp = topMostHeaderComp;
      const targetEl = pushTargetComp.getEl();
      if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
        const rect = targetEl.getBoundingClientRect();
        pushTargetVTop = rect.top - pageRect.top + accumulatedShift;
      }

      brokenLines = [
        {
          rect: targetEl ? targetEl.getBoundingClientRect() : compRect,
          isOverlap: true,
          vTop: pushTargetVTop,
          vBottom: pushTargetVTop + 10,
          isOrphanedHeader: true,
        },
      ];
    }
  }

  const pushTag = (
    pushTargetComp.get('tagName') ||
    pushTargetComp.getEl()?.tagName ||
    ''
  ).toLowerCase();
  if (pushTag === 'td' || pushTag === 'th') {
    let currentParent = pushTargetComp.parent();
    for (let i = 0; i < 3; i++) {
      if (!currentParent) break;
      const pTag = (
        currentParent.get('tagName') ||
        currentParent.getEl()?.tagName ||
        ''
      ).toLowerCase();
      if (pTag === 'tr') {
        pushTargetComp = currentParent;
        const pEl = pushTargetComp.getEl();
        if (pEl && typeof pEl.getBoundingClientRect === 'function') {
          const rect = pEl.getBoundingClientRect();
          pushTargetVTop = rect.top - pageRect.top + accumulatedShift;
        }
        break;
      }
      currentParent = currentParent.parent();
    }
  }

  // --- CARD ATOMICITY BUBBLE-UP ---
  // If we've decided to push something, check if it lives inside a styled Card/Box.
  // If it does, we must push the WHOLE card to prevent double-margins and splitting.
  let forceWrapperPush = false;
  let vContainerClimb = pushTargetComp.parent();
  while (vContainerClimb) {
    if (isVisibleContainer(vContainerClimb, { ignoreHeightLimit: true })) {
      const targetEl = vContainerClimb.getEl();
      if (targetEl) {
        const rect = getTrueRect(targetEl);
        const containerVTop = rect.top - pageRect.top + accumulatedShift;

        // NEW LOGIC: Accept if height <= 400 OR if it straddles within 100px of the top
        if (rect.height <= 400 || markerY - containerVTop <= 160) {
          pushTargetComp = vContainerClimb;
          pushTargetVTop = containerVTop;
          forceWrapperPush = true;
        }
      }
      // Whether we pushed the card or let it break, we stop climbing visual containers
      break;
    }
    // Safety: don't climb past the page root
    const cls = (vContainerClimb.getAttributes?.().class || '').toLowerCase();
    if (cls.includes('visual-page')) break;
    vContainerClimb = vContainerClimb.parent();
  }

  let contentsClimb = pushTargetComp.parent();
  let topContentsParent = null;
  for (let i = 0; i < 6; i++) {
    if (!contentsClimb) break;
    const cls = (contentsClimb.getAttributes()?.class || '').toLowerCase();
    if (cls.includes('contents') && !cls.includes('grid') && !cls.includes('flex')) {
      topContentsParent = contentsClimb;
      contentsClimb = contentsClimb.parent();
    } else if (cls.includes('grid') || cls.includes('table') || cls.includes('flex')) {
      break;
    } else {
      contentsClimb = contentsClimb.parent();
    }
  }

  if (topContentsParent) {
    pushTargetComp = topContentsParent;
    const pEl = pushTargetComp.getEl();
    if (pEl) {
      const rect = getTrueRect(pEl);
      pushTargetVTop = rect.top - pageRect.top + accumulatedShift;
    }
  }

  // --- HEADER ORPHAN PREVENTION ---
  // After all target resolution is done, check if there are headers immediately
  // above the final push target (within 100px). If so, apply the margin-top to the
  // topmost such header instead, keeping the heading and its card together on the next page.
  //
  // DUAL-GUARD: A sibling is only adopted as a "header wrapper" if it passes BOTH guards:
  //   Guard 1 (Visual): The sibling must NOT itself be a styled card (border/bg/shadow).
  //                     A real title wrapper is visually unstyled; an independent content
  //                     card is styled. This is the primary, most efficient check.
  //   Guard 2 (Content Weight): The sibling must NOT contain heavy body elements
  //                     (ul, ol, table, img, etc.) OR hold more than 350 chars of text.
  //                     This catches edge-cases where an unstyled wrapper still holds
  //                     substantial stand-alone content.
  const cardEl = pushTargetComp.getEl();
  if (cardEl) {
    const cardVTop = getTrueRect(cardEl).top - pageRect.top + accumulatedShift;

    const cardParent = pushTargetComp.parent();
    if (cardParent) {
      const siblings = cardParent.components();
      const myIdx = siblings.indexOf(pushTargetComp);

      let topmostHeaderComp = null;

      // Walk backwards through previous siblings looking for headers within 100px
      for (let si = myIdx - 1; si >= 0; si--) {
        const sib = siblings.at(si);
        const sibEl = sib?.getEl?.();
        if (!sibEl || typeof sibEl.getBoundingClientRect !== 'function') break;

        const sibVBottom = getTrueRect(sibEl).bottom - pageRect.top + accumulatedShift;

        // Stop if this sibling's bottom is more than 100px above the card
        if (cardVTop - sibVBottom > 100) break;

        const hasHeadingTag = isCompHeader(sib) || !!sibEl.querySelector?.('h1,h2,h3,h4,h5,h6');
        if (!hasHeadingTag) {
          break; // no heading present at all — stop immediately
        }

        // --- Guard 1: Reject if the sibling is itself a self-contained styled card ---
        // A real title wrapper (div.flex > icon + h2) has no card-level styling.
        // An independent content card (bg-blue-50, border-l-4, shadow) does.
        if (isVisibleContainer(sib)) {
          break; // sibling is an independent styled card, not a title wrapper — stop
        }

        // --- Guard 2: Reject if the sibling carries heavy body content ---
        // A genuine title wrapper won't hold lists, tables, images, or lengthy prose.
        const hasHeavyElements = !!sibEl.querySelector?.(
          'ul, ol, table, blockquote, img, pre, iframe'
        );
        const isTextHeavy = sibEl.textContent.trim().length > 350;
        if (hasHeavyElements || isTextHeavy) {
          break; // sibling is a dense content block, not a lightweight title — stop
        }

        // Passed both guards — this is a legitimate header wrapper, adopt it
        topmostHeaderComp = sib; // keep walking to find the topmost one
      }

      if (topmostHeaderComp) {
        pushTargetComp = topmostHeaderComp;
        const headerEl = pushTargetComp.getEl();
        if (headerEl) {
          pushTargetVTop = getTrueRect(headerEl).top - pageRect.top + accumulatedShift;
        }
      }
    }
  }

  if (isOrphaned && brokenLines.length === 0) {
    brokenLines.push({
      rect: compRect,
      isOverlap: true,
      vTop: vTop,
      vBottom: vBottom + headerClearance,
      isOrphanedHeader: true,
    });
  }

  return {
    comp: pushTargetComp,
    vTop: pushTargetVTop,
    vBottom,
    compHeight: compRect.height,
    brokenLines,
    isMultiLine: textData.length > 1,
    forceWrapperPush,
    forbidWholesalePush: false,
    forceTopPush,
  };
};
