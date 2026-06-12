/**
 * Header Formatting / Detection Rules.
 * Responsible for detecting stacked headers and visual gaps to prevent orphaned headers at
 * the bottom of pages by escalating pushes to the top of the header stack.
 */
import { isCompHeader } from '../componentHelpers.js';

export const resolveHeaderStackTarget = (
  comp,
  vTop,
  isHeader,
  cachedCandidates,
  pageRect,
  accumulatedShift,
  markerY
) => {
  let currentLookbackVTop = vTop;
  let topMostHeaderComp = isHeader ? comp : null;
  let lastHeaderFound = topMostHeaderComp;

  let foundHigher = true;
  let stackDepth = 0;
  let isOrphaned = isHeader;

  while (foundHigher && stackDepth < 10) {
    foundHigher = false;
    let bestCand = null;
    let bestDistance = Infinity;

    for (const cand of cachedCandidates) {
      const cEl = cand.comp.getEl();
      if (!cEl || typeof cEl.getBoundingClientRect !== 'function') continue;

      if (!isCompHeader(cand.comp)) continue;

      const cRect = cEl.getBoundingClientRect();
      const cBottom = cRect.bottom - pageRect.top + accumulatedShift;

      if (cBottom <= currentLookbackVTop + 5) {
        const dist = currentLookbackVTop - cBottom;
        if (dist < 150 && dist < bestDistance) {
          bestDistance = dist;
          bestCand = cand.comp;
        }
      }
    }

    if (bestCand && bestCand.getId() !== (lastHeaderFound?.getId() || comp.getId())) {
      const bEl = bestCand.getEl();
      const bRect = bEl.getBoundingClientRect();
      const targetVTop = bRect.top - pageRect.top + accumulatedShift;

      // Safety: Stop if shift needed exceeds ~800px (Orchestrator Limit) or 1100px (User Guidelines)
      if (markerY !== undefined) {
        const estimatedShift = markerY - targetVTop + 15;
        if (estimatedShift > 780) {
          foundHigher = false;
          // Ensure isOrphaned is set if we found at least one header above before stopping
          if (!isHeader && topMostHeaderComp) isOrphaned = true;
          break;
        }
      }

      const gapBottom = currentLookbackVTop;
      const gapTop = bRect.bottom - pageRect.top + accumulatedShift;
      let blocked = false;

      for (const cand of cachedCandidates) {
        const candId = cand.comp.getId();
        if (candId === bestCand.getId() || candId === (lastHeaderFound?.getId() || comp.getId()))
          continue;

        const cEl = cand.comp.getEl();
        if (!cEl || typeof cEl.getBoundingClientRect !== 'function') continue;

        const startEl = comp.getEl();
        if (
          cEl.contains(bEl) ||
          cEl.contains(startEl) ||
          bEl.contains(cEl) ||
          startEl.contains(cEl)
        )
          continue;

        const cRect = cEl.getBoundingClientRect();
        const cTop = cRect.top - pageRect.top + accumulatedShift;
        const cBottom = cRect.bottom - pageRect.top + accumulatedShift;

        // Blocker check: Does this component occupy space within the vertical gap?
        if (cBottom > gapTop + 2 && cTop < gapBottom - 2) {
          if (!isCompHeader(cand.comp) && cEl.textContent.trim().length > 0 && cRect.height > 5) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) {
        topMostHeaderComp = bestCand;
        lastHeaderFound = bestCand;
        currentLookbackVTop = targetVTop;
        foundHigher = true;
        stackDepth++;
      } else {
        if (!isHeader && topMostHeaderComp) isOrphaned = true;
      }
    } else {
      if (!isHeader && topMostHeaderComp) isOrphaned = true;
    }
  }

  return { topMostHeaderComp, isOrphaned };
};
