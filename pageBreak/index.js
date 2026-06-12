/**
 * Entry Point for Page Break Engine.
 * Re-exports the primary formatting functions previously located in findNearMarkers.js.
 */
import { wrapPageBreaks } from './orchestrator.js';
import { resetPageBreaks, stripFixationStyles } from './reset/cleaner.js';
import { findBlockCandidates, checkComponentBroken } from './detectors/collisionDetector.js';
import { getPageEl } from './domHelpers.js';

/**
 * Finds all GrapesJS components currently crossing a page-break marker line.
 *
 * Optimization Q5 — Spatial Culling:
 *   When `viewportInfo` is provided, only the 1–3 markers that are visible in
 *   the current iframe viewport (± 1.5 page heights) are fed into the scanner.
 *   Combined with the Phase A section pruning in `findBlockCandidates`, this
 *   reduces getBoundingClientRect calls from ~4,000 to ~70–125 per update.
 *
 * @param {object} editor        - GrapesJS editor instance
 * @param {number} threshold     - Overlap threshold in pixels (default 10)
 * @param {object|null} viewportInfo - Optional: { scrollY, viewportHeight, pageHeight }
 * @returns {{ results: Array, scannedMarkerYs: number[] }}
 *   results         — broken component descriptors (same shape as before)
 *   scannedMarkerYs — the markerY values that were actually scanned this pass
 */
export const findComponentsNearRedLines = (editor, threshold = 10, viewportInfo = null) => {
  const pageEl = getPageEl(editor);
  if (!pageEl) return { results: [], scannedMarkerYs: [] };

  const pageRect = pageEl.getBoundingClientRect();
  const frameDoc = editor.Canvas.getDocument();
  const allMarkers = Array.from(frameDoc.querySelectorAll('.page-break-indicator'));
  if (!allMarkers.length) return { results: [], scannedMarkerYs: [] };

  // Compute all markerYs relative to the page container's top.
  const allMarkerYs = allMarkers.map((m) => m.getBoundingClientRect().top - pageRect.top);

  // Viewport culling: discard markers outside the visible canvas area.
  // This shrinks the active set from ~79 → 1–3 markers, which dramatically
  // tightens the intersection window used in Phase A and per-element pruning.
  let activeMarkerYs = allMarkerYs;
  if (viewportInfo && viewportInfo.pageHeight > 0) {
    const { scrollY, viewportHeight, pageHeight } = viewportInfo;
    const cullPad = pageHeight * 1.5; // generous — keeps 1 page above/below viewport
    const windowTop = scrollY - cullPad;
    const windowBottom = scrollY + viewportHeight + cullPad;
    const culled = allMarkerYs.filter((my) => my >= windowTop && my <= windowBottom);
    activeMarkerYs = culled;
  }

  const candidates = findBlockCandidates(editor, activeMarkerYs);

  const results = candidates
    .reduce((acc, cand) => {
      const el = cand.comp.getEl();
      if (!el) return acc;
      const r = el.getBoundingClientRect();
      const top = r.top - pageRect.top;
      const bottom = r.bottom - pageRect.top;
      const markerY = activeMarkerYs.find((ly) => top < ly && bottom > ly - threshold - 5);
      if (markerY === undefined) return acc;
      const broken = checkComponentBroken(editor, cand.comp, markerY, {
        threshold,
        cachedCandidates: candidates,
        pageRect,
      });
      if (!broken) return acc;
      acc.push({
        id: cand.comp.getId(),
        comp: cand.comp,
        tag: cand.comp.get('tagName'),
        boxes: broken.brokenLines.map((bl) => ({
          rect: bl.rect,
          markerY,
          isOverlap: bl.isOverlap,
        })),
      });
      return acc;
    }, [])
    .sort((a, b) => a.boxes[0].rect.top - b.boxes[0].rect.top);

  return { results, scannedMarkerYs: activeMarkerYs };
};

if (typeof window !== 'undefined') {
  window.runMarkerCheck = (t = 10) => {
    const ed = window.editor || window.grapesjs?.editors?.[0];
    // Returns the full { results, scannedMarkerYs } object for debugging.
    return ed ? findComponentsNearRedLines(ed, t) : console.error('Editor not found');
  };
  window.runMarkerWrap = (t = 10, c = 25) => {
    const ed = window.editor || window.grapesjs?.editors?.[0];
    return ed ? wrapPageBreaks(ed, t, c) : console.error('Editor not found');
  };
  window.resetPageBreaks = () => {
    const ed = window.editor || window.grapesjs?.editors?.[0];
    return ed ? resetPageBreaks(ed) : console.error('Editor not found');
  };
}

export {
  wrapPageBreaks,
  resetPageBreaks,
  stripFixationStyles,
  findBlockCandidates,
  checkComponentBroken,
};
