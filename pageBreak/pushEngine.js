/**
 * Push Engine Orchestrator.
 * Responsible for analyzing the component and delegating the push operation to the
 * correct specific formatter (native table, grid, flex, paragraph margin).
 */
import { handleNativeTablePush } from './formatters/nativeTableFormatter.js';
import { handleGridFormatting } from './formatters/gridFormatter.js';
import { handleFlexFormatting } from './formatters/flexFormatter.js';
import { handleDefaultMarginPush } from './formatters/defaultMarginFormatter.js';
import { injectRigidSpacer } from './formatters/rigidSpacerFormatter.js';
import { isElementStructuralTable } from './detectors/structuralDetector.js';
import { isVisibleContainer } from './detectors/cardDetector.js';
import {
  ATOMIC_TABLE_HEIGHT_LIMIT,
  ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD,
  ATOMIC_TABLE_MAX_TOTAL_HEIGHT,
} from './constants.js';
import { isCompHeader } from './componentHelpers.js';

export const applyMarginPush = (origComp, amount, markerBottom) => {
  let comp = origComp;
  let el = comp.getEl();
  const tagName = (comp.get('tagName') || el?.tagName || '').toLowerCase();

  // --- ATOMIC NATIVE TABLE GUARD ---
  // Check if we're inside a small native table that should be pushed as a whole
  if (tagName === 'tr' || tagName === 'td' || tagName === 'th') {
    let tableClimber = comp;
    for (let i = 0; i < 4; i++) {
      if (!tableClimber) break;
      const climbTag = (
        tableClimber.get('tagName') ||
        tableClimber.getEl()?.tagName ||
        ''
      ).toLowerCase();

      if (climbTag === 'table') {
        const tableEl = tableClimber.getEl();
        if (tableEl) {
          const tableRect = tableEl.getBoundingClientRect();
          const isAtomic = tableRect.height <= ATOMIC_TABLE_HEIGHT_LIMIT;

          if (isAtomic) {
            return handleDefaultMarginPush(tableClimber, amount);
          }
        }
        break;
      }

      if (climbTag === 'body' || climbTag === 'html') break;
      tableClimber = tableClimber.parent?.();
    }
  }

  if (tagName === 'tr') {
    return handleNativeTablePush(comp, amount);
  }

  // Bug 7 fix: bubble up from td/th to tr defensively
  if (tagName === 'td' || tagName === 'th') {
    const rowComp = comp.parent();
    const rowTag = (rowComp?.get('tagName') || '').toLowerCase();
    if (rowTag === 'tr') return handleNativeTablePush(rowComp, amount);
  }

  let parentComp = comp.parent();
  if (!parentComp) return;

  // --- ATOMIC CARD GUARD ---
  // Runs FIRST to catch any visual cards. Even if a card contains a structural table (e.g. tech badges),
  // we want to push the entire atomic card rather than splitting the inner table.
  // Giant cards (> 1123px) are excluded — the layout logic below will handle them.
  {
    // The push target itself (e.g., h3) must NOT trigger the atomic logic if it has a border.
    // We climb up to 6 levels to find an actual visual container (card).
    let cardClimber = comp.parent?.();
    for (let i = 0; i < 6; i++) {
      if (!cardClimber || (cardClimber.getAttributes?.().class || '').includes('visual-page'))
        break;

      // Safety check: Never treat headings as cards even if they have borders
      if (isCompHeader(cardClimber)) {
        cardClimber = cardClimber.parent();
        continue;
      }

      const isCard = isVisibleContainer(cardClimber);
      if (isCard) {
        const cEl = cardClimber.getEl();
        const cRect = cEl?.getBoundingClientRect();
        // Only push whole if it fits within the 600px limit.
        if (cRect && cRect.height <= ATOMIC_TABLE_HEIGHT_LIMIT) {
          // If the card is a direct child of a grid/flex row, push the PARENT container.
          // Pushing only one card in a grid leaves siblings misaligned.
          const cardParent = cardClimber.parent();
          if (cardParent) {
            const cardParentEl = cardParent.getEl();
            const parentView = cardParentEl?.ownerDocument?.defaultView;
            const parentStyle = parentView?.getComputedStyle(cardParentEl);
            const parentDisplay = parentStyle?.display || '';
            const flexDir = parentStyle?.flexDirection || 'row';

            // Only elevate to parent if the layout is horizontal (where alignment matters).
            // CSS Grids and Flex Rows are horizontal. Flex Columns are vertical.
            const isHorizontalFlex = parentDisplay.includes('flex') && flexDir === 'row';
            const isGrid = parentDisplay.includes('grid');

            if (isHorizontalFlex || isGrid) {
              const pageEl = cEl?.ownerDocument?.querySelector('.visual-page');
              if (isElementStructuralTable(cardParentEl, pageEl)) {
                // Let the native/structural table block handle this via rigid spacers
                break;
              }
              return handleDefaultMarginPush(cardParent, amount);
            }
          }
          // No grid/flex parent — safe to push the card itself.
          return handleDefaultMarginPush(cardClimber, amount);
        }
        break; // Giant card — fall through to grid/flex/table splitting logic below.
      }
      cardClimber = cardClimber.parent();
    }
  }

  // Climb up to 3 ancestor levels looking for any structural table (native, CSS, geometric).
  // This handles standalone tables or grids not housed inside an Atomic Card.
  // We track `tableComp` (the table root) and `itemInTable` (the direct child to split before).
  {
    const pageEl = el?.ownerDocument?.querySelector('.visual-page');
    let climbComp = parentComp;
    let itemInTable = comp; // the direct child of the table we'll inject the spacer before

    for (let level = 0; level < 3; level++) {
      if (!climbComp) break;
      const climbEl = climbComp.getEl();
      if (!climbEl) break;

      // Stop at the page root
      const clsCl = (climbComp.getAttributes()?.class || '').toLowerCase();
      if (clsCl.includes('visual-page')) break;

      const tableResult = isElementStructuralTable(climbEl, pageEl);
      if (tableResult) {
        const rect = climbEl.getBoundingClientRect();
        // markerBottom is page-relative (from orchestrator: mRect.bottom - pageRect.top).
        // rect.top is viewport-relative. Convert it to page-relative for correct comparison.
        const pageRect = pageEl?.getBoundingClientRect();
        const elemPageTop = rect.top - (pageRect?.top ?? 0);
        const headHeight = markerBottom - elemPageTop;

        // A table is atomic if:
        // 1. It is small (≤ 600px).
        // 2. Its exposed head is small (< 400px) AND it fits on the next page (< 1123px).
        const isAtomic =
          rect.height <= ATOMIC_TABLE_HEIGHT_LIMIT ||
          (headHeight > 0 &&
            headHeight < ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD &&
            rect.height < ATOMIC_TABLE_MAX_TOTAL_HEIGHT);

        if (!isAtomic) {
          const pCls = (climbComp.getAttributes()?.class || '').toLowerCase();
          const isVisual =
            pCls.includes('border') || pCls.includes('bg-') || pCls.includes('shadow');
          return injectRigidSpacer(climbComp, itemInTable, amount, isVisual, true);
        }
      }

      // Move one level up — the current climbComp becomes the new itemInTable
      itemInTable = climbComp;
      climbComp = climbComp.parent();
    }
  }

  // 3. SECONDARY LAYOUT ANALYSIS (Fallback for non-table, non-card grids/flex)
  const parentCls = (parentComp.getAttributes()?.class || '').toLowerCase();

  if (
    parentCls.includes('flex') &&
    !parentCls.includes('flex-col') &&
    !parentCls.includes('flex-wrap')
  ) {
    // ADDITIONAL Bug 8 fix: also check direct parent isn't the transposed column wrapper
    const grandParentCls = (parentComp.parent()?.getAttributes()?.class || '').toLowerCase();
    const grandParentIsFlatFlex =
      grandParentCls.includes('flex') && !grandParentCls.includes('flex-col');
    if (!grandParentIsFlatFlex) {
      // don't elevate if grandparent is also a row-flex
      const grandParent = parentComp.parent();
      if (grandParent) {
        comp = parentComp;
        el = comp.getEl();
        parentComp = grandParent;
      }
    }
  }

  let layoutParent = parentComp;
  let layoutParentClasses = (layoutParent.getAttributes()?.class || '').toLowerCase();
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

  let checkComp = layoutParent;
  let isVisualContainer = false;
  for (let i = 0; i < 3; i++) {
    if (!checkComp) break;
    const classes = (checkComp.getAttributes()?.class || '').toLowerCase();

    // Stop climbing if we hit a page root boundary
    if (
      classes.includes('visual-page') ||
      classes.includes('wrapper') ||
      classes.includes('body')
    ) {
      break;
    }

    // Use the unified, style-accurate card detector
    if (isVisibleContainer(checkComp)) {
      isVisualContainer = true;
      break;
    }
    checkComp = checkComp.parent();
  }

  let isRigidLayout = false;
  let isGrid = false;
  let isFlex = false;

  if (directParentClasses.includes('grid') || directParentClasses.includes('table')) {
    isRigidLayout = true;
    isGrid = true;
  } else if (directParentClasses.includes('flex')) {
    if (directParentClasses.includes('flex-wrap') || isVisualContainer) {
      isRigidLayout = true;
      isFlex = true;
    } else {
      isFlex = true;
    }
  } else {
    const pEl = el?.parentElement;
    const computedParent = pEl ? pEl.ownerDocument?.defaultView?.getComputedStyle(pEl) || {} : {};
    const parentDisplay = computedParent.display || '';
    const parentFlexWrap = computedParent.flexWrap || '';

    isRigidLayout =
      parentDisplay.includes('grid') ||
      parentDisplay.includes('table') ||
      (parentDisplay.includes('flex') && parentFlexWrap === 'wrap') ||
      (parentDisplay.includes('flex') && isVisualContainer);

    if (parentDisplay.includes('grid')) isGrid = true;
    if (parentDisplay.includes('flex')) isFlex = true;
  }

  if (isGrid && isRigidLayout) {
    // ATOMIC GUARD: Check if this grid qualifies for wholesale movement.
    const gridEl = layoutParent.getEl();
    if (gridEl) {
      const gridRect = gridEl.getBoundingClientRect();
      const gridPageEl = gridEl.ownerDocument?.querySelector('.visual-page');
      const gridPageRect = gridPageEl?.getBoundingClientRect();
      // Convert to page-relative to match markerBottom coordinate space.
      const gridPageTop = gridRect.top - (gridPageRect?.top ?? 0);
      const headHeight = (markerBottom ?? 0) - gridPageTop;
      const isAtomic =
        gridRect.height <= ATOMIC_TABLE_HEIGHT_LIMIT ||
        (headHeight > 0 &&
          headHeight < ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD &&
          gridRect.height < ATOMIC_TABLE_MAX_TOTAL_HEIGHT);
      if (isAtomic) return handleDefaultMarginPush(layoutParent, amount);
    }
    return handleGridFormatting(layoutParent, comp, amount);
  } else if (isFlex && isRigidLayout) {
    // ATOMIC GUARD: Same logic for flex containers.
    const flexEl = layoutParent.getEl();
    if (flexEl) {
      const flexRect = flexEl.getBoundingClientRect();
      const flexPageEl = flexEl.ownerDocument?.querySelector('.visual-page');
      const flexPageRect = flexPageEl?.getBoundingClientRect();
      // Convert to page-relative to match markerBottom coordinate space.
      const flexPageTop = flexRect.top - (flexPageRect?.top ?? 0);
      const headHeight = (markerBottom ?? 0) - flexPageTop;
      const isAtomic =
        flexRect.height <= ATOMIC_TABLE_HEIGHT_LIMIT ||
        (headHeight > 0 &&
          headHeight < ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD &&
          flexRect.height < ATOMIC_TABLE_MAX_TOTAL_HEIGHT);
      if (isAtomic) return handleDefaultMarginPush(layoutParent, amount);
    }
    return handleFlexFormatting(layoutParent, comp, amount);
  } else if (isRigidLayout || isVisualContainer) {
    return injectRigidSpacer(layoutParent, comp, amount, isVisualContainer, false);
  }

  return handleDefaultMarginPush(comp, amount);
};
