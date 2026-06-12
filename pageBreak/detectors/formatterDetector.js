import { isCompHeader, isVisibleContainer } from '../componentHelpers.js';
import { isElementStructuralTable } from './structuralDetector.js';
import { getTrueRect, isStructuredLayout } from '../domHelpers.js';
import {
  ATOMIC_TABLE_HEIGHT_LIMIT,
  ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD,
  ATOMIC_TABLE_MAX_TOTAL_HEIGHT,
} from '../constants.js';

/**
 * getWinningFormatter(comp, markerBottom)
 *
 * Reuses the EXACT logic from orchestrator.js and pushEngine.js to determine
 * which formatter would be applied to a component if it were crossing a marker.
 */
export const getWinningFormatter = (editor, comp, markerBottom) => {
  if (!comp || !editor) return null;
  const el = comp.getEl();
  if (!el) return null;

  const frameDoc = editor.Canvas.getDocument();
  const pageEl = frameDoc.querySelector('.visual-page') || frameDoc.body;
  const pageRect = pageEl.getBoundingClientRect();
  const rect = getTrueRect(el);
  const vTop = rect.top - pageRect.top;
  const vBottom = rect.bottom - pageRect.top;
  const compHeight = rect.height;

  // --- PHASE 1: Orchestrator Split Decisions ---
  const isHeading = isCompHeader(comp);
  const isVisibleShell = isVisibleContainer(comp);

  const tagName = (comp.get('tagName') || el.tagName || '').toLowerCase();
  const isTableElement = ['tr', 'td', 'th', 'tbody', 'thead', 'table'].includes(tagName);

  if (
    !isHeading &&
    !isVisibleShell &&
    !isTableElement &&
    !isStructuredLayout(comp) &&
    compHeight > 80
  ) {
    return {
      name: 'Paragraph',
      action: 'Split (Line-by-Line)',
      reason: 'Plain Text > 80px',
      color: '#10b981',
    };
  }

  if (
    compHeight > 150 &&
    !isVisibleShell &&
    !isHeading &&
    !isTableElement &&
    !isStructuredLayout(comp)
  ) {
    return {
      name: 'Section',
      action: 'Split (Child-by-Child)',
      reason: 'Large Container > 150px',
      color: '#059669',
    };
  }

  // --- PHASE 2: Push Engine Delegation ---
  // A. Native Table
  if (tagName === 'tr' || tagName === 'td' || tagName === 'th') {
    return {
      name: 'Table',
      action: 'Row Push',
      reason: 'Native Table Structure',
      color: '#2563eb',
    };
  }

  // B. Structural Table Climb (3 levels)
  let parentComp = comp.parent();
  if (parentComp) {
    let climbComp = parentComp;
    for (let level = 0; level < 3; level++) {
      if (!climbComp) break;
      const climbEl = climbComp.getEl();
      if (!climbEl) break;
      const tableResult = isElementStructuralTable(climbEl, pageEl);
      if (tableResult) {
        const cRect = climbEl.getBoundingClientRect();
        const elemPageTop = cRect.top - pageRect.top;
        const headHeight = markerBottom - elemPageTop;
        const isAtomic = cRect.height <= ATOMIC_TABLE_HEIGHT_LIMIT;

        if (!isAtomic) {
          return {
            name: 'Table',
            action: 'Rigid Spacer',
            reason: 'Geometric Grid Pattern',
            color: '#3b82f6',
          };
        } else {
          return {
            name: 'Atomic Table',
            action: 'Wholesale Push',
            reason: 'Symmetric Unit < 600px',
            color: '#60a5fa',
          };
        }
      }
      climbComp = climbComp.parent();
    }
  }

  // C. Layout Analysis (Flex/Grid)
  if (parentComp) {
    let layoutParent = parentComp;
    let layoutParentClasses = (layoutParent.getAttributes?.().class || '').toLowerCase();

    // Contents bypass
    for (let i = 0; i < 4; i++) {
      if (
        layoutParentClasses.includes('contents') &&
        !layoutParentClasses.includes('grid') &&
        !layoutParentClasses.includes('flex')
      ) {
        const nextP = layoutParent.parent();
        if (nextP) {
          layoutParent = nextP;
          layoutParentClasses = (layoutParent.getAttributes()?.class || '').toLowerCase();
        } else break;
      } else break;
    }

    const directParentClasses = layoutParentClasses;
    const isGrid = directParentClasses.includes('grid') || directParentClasses.includes('table');
    const isFlex = directParentClasses.includes('flex');

    if (isGrid) {
      return {
        name: 'Grid',
        action: 'Layout Shift',
        reason: 'CSS Grid Container',
        color: '#818cf8',
      };
    }
    if (isFlex) {
      return { name: 'Flexbox', action: 'Layout Shift', reason: 'Flex Wrapper', color: '#6366f1' };
    }

    // Rigid Spacer fallback for visual containers
    if (isVisibleContainer(layoutParent)) {
      return {
        name: 'Atomic Card',
        action: 'Wholesale Push',
        reason: 'Styled Shell (Bubble-up)',
        color: '#f59e0b',
      };
    }
  }

  // D. Final Fallback
  return {
    name: 'Default',
    action: 'Margin Push',
    reason: 'Unclassified Element',
    color: '#6b7280',
  };
};

/**
 * highlightFormatters(editor)
 */
export const highlightFormatters = (editor) => {
  if (!editor) return 0;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return 0;

  clearFormatterHighlights(editor);

  const pageEl = frameDoc.querySelector('.visual-page') || frameDoc.body;
  const pageRect = pageEl.getBoundingClientRect();
  const markers = Array.from(frameDoc.querySelectorAll('.page-break-indicator'));
  const markerYs = markers.map((m) => m.getBoundingClientRect().top - pageRect.top);

  if (!markerYs.length) return 0;

  // We scan everything that crosses ANY marker
  const comps = editor.Pages.getSelected().getMainComponent().find('*');
  let highlightedCount = 0;

  comps.forEach((comp) => {
    const el = comp.getEl();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vTop = rect.top - pageRect.top;
    const vBottom = rect.bottom - pageRect.top;

    const crossingMarkerY = markerYs.find((my) => vTop < my + 10 && vBottom > my - 10);
    if (crossingMarkerY === undefined) return;

    const winner = getWinningFormatter(editor, comp, crossingMarkerY);
    if (!winner) return;

    highlightedCount++;
    el.setAttribute('data-formatter-highlighted', 'true');
    el.style.outline = `2px dashed ${winner.color}`;

    const badge = frameDoc.createElement('div');
    badge.setAttribute('data-formatter-badge', 'true');
    badge.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1px">
        <div style="display:flex; align-items:center; gap:4px">
          <span style="opacity:0.7">F:</span><b>${winner.name}</b>
          <span style="background:rgba(255,255,255,0.2); padding:0 4px; border-radius:2px; font-size:9px">${winner.action}</span>
        </div>
        <div style="font-size:8px; opacity:0.9; font-style:italic">Why: ${winner.reason}</div>
      </div>
    `;

    Object.assign(badge.style, {
      position: 'absolute',
      bottom: '100%',
      left: '0',
      zIndex: '10000',
      background: winner.color,
      color: 'white',
      padding: '1px 8px',
      borderRadius: '4px 4px 0 0',
      fontSize: '10px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 -2px 4px rgba(0,0,0,0.2)',
    });

    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.prepend(badge);
  });

  return highlightedCount;
};

export const clearFormatterHighlights = (editor) => {
  if (!editor) return;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return;
  frameDoc.querySelectorAll('[data-formatter-badge]').forEach((b) => b.remove());
  frameDoc.querySelectorAll('[data-formatter-highlighted]').forEach((el) => {
    el.removeAttribute('data-formatter-highlighted');
    el.style.outline = '';
  });
};
