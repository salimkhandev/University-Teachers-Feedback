/**
 * Main Formatting Orchestrator.
 * Responsible for coordinating the read passes, applying fixes iteratively top-to-bottom,
 * and calling specific formatters to modify the UI.
 */
import { resetPageBreaks } from './reset/cleaner.js';
import { isCompHeader, isVisibleContainer, resetHeaderCache } from './componentHelpers.js';
import { HEADING_TAGS } from './constants.js';
import { trackedPushedComponents, trackedSplitComponents } from './reset/registry.js';
import { checkComponentBroken, findBlockCandidates } from './detectors/collisionDetector.js';
import { getTrueRect, isStructuredLayout } from './domHelpers.js';
import { trySplitLargeElement } from './formatters/containerFormatter.js';
import { trySplitTextWithBR } from './formatters/paragraphFormatter.js';
import { applyMarginPush } from './pushEngine.js';

export const wrapPageBreaks = async (editor, threshold = 10, clearance = 10) => {
  const wrapper = editor.getWrapper();
  const pageContainer = wrapper.find('.visual-page')[0] || wrapper.find('#visual-page-id')[0];
  if (!pageContainer) return 0;

  if (typeof editor.updateMarkers === 'function') editor.updateMarkers();
  const frameDoc = editor.Canvas.getDocument();
  const markers = Array.from(frameDoc.querySelectorAll('.page-break-indicator'));

  editor.Canvas.refresh();
  const initialCandidates = findBlockCandidates(editor);
  const initialPageEl = pageContainer.getEl();
  if (!initialPageEl) return 0;

  const initialPageRect = initialPageEl.getBoundingClientRect();

  let isAlreadyValid = true;
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const markerTop = marker.getBoundingClientRect().top - initialPageRect.top;
    const pageTopY =
      i === 0 ? 0 : markers[i - 1].getBoundingClientRect().bottom - initialPageRect.top;

    if (
      initialCandidates.some((cand) =>
        checkComponentBroken(editor, cand.comp, markerTop, {
          threshold,
          cachedCandidates: initialCandidates,
          pageRect: initialPageRect,
          pageTopY,
        })
      )
    ) {
      isAlreadyValid = false;
      break;
    }
  }

  if (isAlreadyValid) {
    console.log('[PB-Format] Document is already in a valid state. Skipping.');
    return 0;
  }

  resetPageBreaks(editor);
  let totalOps = 0;

  const MAX_PASSES = (typeof window !== 'undefined' ? window.NITRO_PASS_LIMIT : null) || 700;
  let pass = 0;

  while (pass++ < MAX_PASSES) {
    let opsThisPass = 0;
    editor.Canvas.refresh();
    if (typeof editor.updateMarkers === 'function') editor.updateMarkers();
    const currentMarkers = Array.from(frameDoc.querySelectorAll('.page-break-indicator'));
    if (!currentMarkers.length) break;

    const pageEl = pageContainer.getEl();
    if (!pageEl || typeof pageEl.getBoundingClientRect !== 'function') break;
    const pageRect = pageEl.getBoundingClientRect();

    const markerRects = currentMarkers.map((m) => m.getBoundingClientRect());
    const lineYs = markerRects.map((r) => r.top - pageRect.top);

    const cachedCandidates = findBlockCandidates(editor, lineYs);

    const rectSnap = new Map();
    for (const cand of cachedCandidates) {
      const el = cand.comp.getEl();
      if (el) {
        rectSnap.set(cand.comp.getId(), getTrueRect(el));
      }
    }

    resetHeaderCache();

    const visibilityCache = new WeakMap();
    const cachedIsVisible = (comp) => {
      if (!visibilityCache.has(comp)) visibilityCache.set(comp, isVisibleContainer(comp));
      return visibilityCache.get(comp);
    };

    const brSplitDoneIds = new Set();
    const passShiftedIds = new Set();

    for (let i = 0; i < currentMarkers.length; i++) {
      const marker = currentMarkers[i];
      if (!marker || typeof marker.getBoundingClientRect !== 'function') continue;

      const mRect = markerRects[i];
      const markerTop = mRect.top - pageRect.top;
      const markerBottom = mRect.bottom - pageRect.top;

      const brokenCandidates = [];
      for (const cand of cachedCandidates) {
        const r = rectSnap.get(cand.comp.getId());
        if (r) {
          const vt = r.top - pageRect.top;
          const vb = r.bottom - pageRect.top;
          if (vt > markerTop + 800 || vb < markerTop - 800) continue;
        }
        const broken = checkComponentBroken(editor, cand.comp, markerTop, {
          threshold,
          cachedCandidates,
          pageRect,
          compRect: r || undefined,
          pageTopY: pageRect.top,
        });
        if (broken) brokenCandidates.push({ comp: cand.comp, broken });
      }

      if (!brokenCandidates.length) continue;

      const brokenElMap = new Map();
      for (const bc of brokenCandidates) {
        const el = bc.comp.getEl();
        if (el) brokenElMap.set(bc.comp.getId(), el);
      }

      const actionable = brokenCandidates
        .filter(({ comp }) => {
          if (passShiftedIds.has(comp.getId())) return false;
          const isShell = cachedIsVisible(comp);
          const compEl = brokenElMap.get(comp.getId());
          for (const other of brokenCandidates) {
            if (other.comp.getId() === comp.getId()) continue;
            const otherEl = brokenElMap.get(other.comp.getId());
            if (!otherEl || !compEl) continue;
            if (otherEl.contains(compEl) && otherEl !== compEl) {
              if (cachedIsVisible(other.comp)) return false;
            }
            if (compEl.contains(otherEl) && compEl !== otherEl) {
              if (!isShell) return false;
            }
          }
          return true;
        })
        .sort((a, b) => a.broken.vTop - b.broken.vTop);

      // Deduplication: if the same component appears multiple times in actionable,
      // only process it once per marker to avoid redundant operations
      const actionableIds = new Set();
      const deduplicated = actionable.filter((item) => {
        const id = item.comp.getId();
        if (actionableIds.has(id)) return false;
        actionableIds.add(id);
        return true;
      });

      if (!deduplicated.length) continue;

      const { comp: originalComp, broken } = deduplicated[0];
      const comp = broken.comp || originalComp;

      const compRectSnap = rectSnap.get(comp.getId()) || comp.getEl()?.getBoundingClientRect();
      const compHeight = compRectSnap ? compRectSnap.height : 0;
      const isHeading = isCompHeader(comp);
      const isVisibleShell = cachedIsVisible(comp);

      let split = false;
      if (
        !isHeading &&
        !isVisibleShell &&
        compHeight > 80 &&
        !broken.forceWrapperPush &&
        !brSplitDoneIds.has(comp.getId())
      ) {
        split = trySplitTextWithBR(editor, comp, markerTop, pageRect, threshold);
        if (split) brSplitDoneIds.add(comp.getId());
      }

      if (
        !split &&
        originalComp !== comp &&
        !cachedIsVisible(originalComp) &&
        !broken.forceWrapperPush &&
        !isCompHeader(originalComp) &&
        !brSplitDoneIds.has(originalComp.getId())
      ) {
        const origRectSnap =
          rectSnap.get(originalComp.getId()) || originalComp.getEl()?.getBoundingClientRect();
        if (origRectSnap && origRectSnap.height > 80) {
          split = trySplitTextWithBR(editor, originalComp, markerTop, pageRect, threshold);
          if (split) {
            brSplitDoneIds.add(originalComp.getId());
            passShiftedIds.add(originalComp.getId());
          }
        }
      }

      if (!split && compHeight > 150 && !broken.forceWrapperPush && !isVisibleShell) {
        const isTableTag = ['table', 'thead', 'tbody', 'tr', 'td', 'th'].includes(
          comp.get('tagName') || comp.getEl()?.tagName || ''
        );
        if (!isTableTag) {
          split = trySplitLargeElement(
            comp,
            markerBottom,
            clearance,
            pageRect,
            currentMarkers,
            i,
            passShiftedIds
          );
        }
      }

      if (split) {
        passShiftedIds.add(comp.getId());
        totalOps++;
        opsThisPass++;
        break;
      }

      let shift = Math.max(0, markerBottom - broken.vTop + clearance);
      if (shift > 800) shift = 0;
      const nextMarkerRect = markerRects[i + 1];
      if (nextMarkerRect) {
        const nextTop = nextMarkerRect.top - pageRect.top;
        if (broken.vTop + shift > nextTop - 50) shift = Math.max(0, nextTop - 50 - broken.vTop);
      }
      if (shift > 0) {
        // If this is an atomic table, push the entire table as a whole
        const pushComp = broken.isAtomicTable ? broken.comp : comp;
        applyMarginPush(pushComp, shift, markerBottom);

        const markShiftedRecursively = (c) => {
          const id = c.getId?.() || c.id;
          if (id) passShiftedIds.add(id);
          if (typeof c.components === 'function') {
            c.components().forEach((child) => markShiftedRecursively(child));
          }
        };
        markShiftedRecursively(comp);

        const par = comp.parent();
        if (par) {
          const sibs = par.components();
          const myIdx = sibs.indexOf(comp);
          if (myIdx >= 0) {
            for (let j = myIdx + 1; j < sibs.length; j++) {
              passShiftedIds.add(sibs.at(j).getId());
            }
          }
        }
        totalOps++;
        opsThisPass++;
        break;
      }
    }

    if (opsThisPass === 0) break;

    await new Promise((r) => setTimeout(r, 0));
  }

  if (typeof editor.clearMarkerCache === 'function') editor.clearMarkerCache();
  if (typeof editor.updateMarkers === 'function') editor.updateMarkers();

  editor.refresh();
  editor.Canvas.refresh();
  return totalOps;
};
