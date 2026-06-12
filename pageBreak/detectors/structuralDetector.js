/**
 * tableDetector.js — Unified Geometric Symmetry Detector
 *
 * INTENT:
 * This engine identifies tables by their visual structural alignment (Geometric Symmetry)
 * rather than high-level HTML tags or CSS classes. This makes it 100% "Tag-Agnostic",
 * allowing it to detect tables built with:
 *   - Native <table> tags
 *   - Flexbox (Standard and Transposed)
 *   - CSS Grid (Flat and Nested)
 *   - Inline-Block Spans (Ghost Tables)
 *   - Floated Divs
 *
 * ARCHITECTURE:
 * 1. Fast Path: Native HTML tags and explicit 'role="table/grid"' attributes.
 * 2. Geometric Core: Analyzes bounding boxes of children to find perfect X-by-Y grids.
 * 3. Dual-Axis Drill Down: Handles both "Column of Rows" (Standard) and "Row of Columns" (Transposed).
 */

const MIN_COLS = 2;
const MIN_ROWS = 2;

// --- Internal Helpers ---

/**
 * Frequency analyzer to find the 'Dominant' characteristic of a structure.
 * Returns the most common value and its occurrence percentage.
 */
export const getMode = (arr) => {
  if (!arr.length) return { value: 0, confidence: 0 };
  const freq = {};
  arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return { value: parseInt(sorted[0][0], 10), confidence: sorted[0][1] / arr.length };
};

/**
 * Filter for visible children only.
 * Necessary for GrapesJS where hidden components often exist in the DOM.
 */
export const visibleChildren = (el) => {
  const view = el.ownerDocument?.defaultView;
  if (!view) return []; // Bug 5 fix: Remove || window fallback, return empty if no view
  return Array.from(el.children).filter((c) => {
    const r = c.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;

    // Skip utility elements that break symmetry but aren't data cells
    const style = view.getComputedStyle(c);
    if (style.clear !== 'none' || style.position === 'absolute' || style.display === 'none')
      return false;

    // Skip editor-specific artifacts
    if (c.hasAttribute('data-editor-spacer') || c.hasAttribute('data-table-badge')) return false;

    return true;
  });
};

/**
 * SEMANTIC GUARD: Distinguishes between "Data" and "Layout".
 * A true data-table cell should NOT be a heading, a list, or a large layout block.
 * If these exist, the structure is likely a Card-Grid or a Sidebar, not a table.
 */
export const isDataCell = (el) => {
  const tag = el.tagName.toLowerCase();
  const SEMANTIC_LAYOUT_TAGS =
    /^(h1|h2|h3|h4|h5|h6|ul|ol|nav|header|footer|section|article|aside|form|p)$/;

  // Rule A: The cell itself cannot be a layout-level tag.
  if (SEMANTIC_LAYOUT_TAGS.test(tag)) return false;

  // Rule B: The cell cannot contain major layout blocks (nested lists/headings).
  // Note: We allow nested TABLES (handled by deduplication) but not layout noise.
  return !el.querySelector('h1, h2, h3, h4, h5, h6, ul, ol, section, nav');
};

/**
 * SYMMETRY ENGINE: The heart of the detector.
 * It groups elements by their screen coordinates to see if they form a grid.
 */
export const findTableMatrix = (el, pageEl) => {
  let kids = visibleChildren(el);
  if (!kids.length) return null;

  /**
   * Helper to group elements into virtual rows based on Y-axis (top) coordinates.
   * Uses an 8px 'snapping' tolerance to handle slight pixel offsets in custom CSS.
   */
  const getSymmetry = (elements, pageEl) => {
    const canvasTop = pageEl ? pageEl.getBoundingClientRect().top : 0; // Bug 1 fix: use canvas-relative Y
    const rowsMap = new Map();
    elements.forEach((c) => {
      const top = Math.round((c.getBoundingClientRect().top - canvasTop) / 8) * 8;
      if (!rowsMap.has(top)) rowsMap.set(top, []);
      rowsMap.get(top).push(c);
    });
    const rowsAr = Array.from(rowsMap.values());
    const colCounts = rowsAr.map((r) => r.length);

    // Find the 'Dominant' column count (most rows must have the same # of cells)
    const freq = {};
    colCounts.forEach((c) => (freq[c] = (freq[c] || 0) + 1));
    const dominantCols = parseInt(Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0], 10);

    return {
      rows: rowsAr.length,
      cols: dominantCols,
      rowList: rowsAr,
      confidence: (freq[dominantCols] || 0) / rowsAr.length,
    };
  };

  let matrix = getSymmetry(kids, pageEl);

  // ─── DUAL-AXIS DRILL DOWN ───────────────────────────────────────────────
  // Intent: Handle 'Recursive' containers where children are Row/Column wrappers.

  // 1. Column-of-Rows Pattern (Standard Table / Ghost Tags):
  // Architecture: Majority Consensus. A container where children are 'rows'.
  if (matrix.cols === 1 && matrix.rows >= MIN_ROWS) {
    const subAnalysis = kids.map((k) => {
      const children = visibleChildren(k);
      const symmetry = getSymmetry(children, pageEl);
      return {
        logicalCols: children.length,
        visualCols: symmetry.cols,
        isData: children.every(isDataCell),
      };
    });

    // We find the 'Dominant' logical column count across all row-divs.
    // This allows us to ignore a 1-column spanned header or a split row.
    const { value: dominantCols, confidence } = getMode(subAnalysis.map((s) => s.logicalCols));
    const allData = subAnalysis.every((s) => s.isData);

    if (allData && dominantCols >= MIN_COLS && confidence >= 0.6) {
      // Logic: A table is valid if the majority of rows share a column count,
      // and others are either headers (1 col) or fractional wraps.
      return { rows: matrix.rows, cols: dominantCols, type: 'Nested Rows' };
    }

    // Bug 4 fix: a container of single-cell text rows IS a table (1-col list-table)
    const allSingleText = subAnalysis.every((s) => s.logicalCols === 1);
    if (allSingleText && matrix.rows >= MIN_ROWS) {
      return { rows: matrix.rows, cols: 1, type: 'Single-Column List' };
    }
  }

  // 2. Row-of-Columns Pattern (Transposed Table / Rotated 90 Deg):
  // Architecture: Symmetry Consistency. A container where children are 'columns'.
  if (matrix.rows === 1 && matrix.cols >= MIN_COLS) {
    const subAnalysis = kids.map((k) => {
      const children = visibleChildren(k);
      const symmetry = getSymmetry(children, pageEl);
      return {
        logicalRows: children.length,
        visualRows: symmetry.rows,
        isData: children.every(isDataCell),
      };
    });

    const { value: dominantRows, confidence } = getMode(subAnalysis.map((s) => s.logicalRows));
    const allData = subAnalysis.every((s) => s.isData);

    if (allData && dominantRows >= MIN_ROWS && confidence >= 0.6) {
      return { rows: dominantRows, cols: matrix.cols, type: 'Transposed Columns' };
    }
  }

  // ─── FLAT GRID VALIDATION ──────────────────────────────────────────
  // Intent: Handle cases like 'display: grid' or 'flex-wrap' where cells are direct children.

  // Thresholds: Minimum 2x2. Confidence: At least 60% of rows must match the grid pattern.
  if (matrix.cols < MIN_COLS || matrix.rows < MIN_ROWS) return null;

  if (matrix.confidence < 0.6) {
    // Bug 2 fix: accept if row heights are highly consistent even if col counts vary (colspan cases)
    const rowHeights = Array.from(
      (() => {
        const rowsMap = new Map();
        kids.forEach((c) => {
          const top =
            Math.round(
              (c.getBoundingClientRect().top - (pageEl?.getBoundingClientRect().top || 0)) / 8
            ) * 8;
          if (!rowsMap.has(top)) rowsMap.set(top, []);
          rowsMap.get(top).push(c);
        });
        return rowsMap.values();
      })()
    ).map((r) => Math.round(r[0].getBoundingClientRect().height / 4) * 4);

    const { confidence: heightConf } = getMode(rowHeights);
    if (heightConf < 0.7) return null; // neither columns nor heights are consistent
  }

  // Final Semantic Check: Rejects layout scattered grids.
  return kids.every(isDataCell)
    ? { rows: matrix.rows, cols: matrix.cols, type: 'Flat Matrix' }
    : null;
};

// Public helper to check if a single element is a structural table
export const isElementStructuralTable = (el, pageEl) => {
  if (!el) return null;
  // Tier 1 check: Explicitly declared
  const view = el.ownerDocument?.defaultView || window;
  const style = view.getComputedStyle(el);
  const role = el.getAttribute('role');
  if (
    el.tagName === 'TABLE' ||
    role === 'table' ||
    role === 'grid' ||
    style.display === 'table' ||
    style.display === 'inline-table'
  ) {
    return { rows: 0, cols: 0, type: 'Declared' };
  }

  // Tier 2 check: Geometric matrix
  const matrix = findTableMatrix(el, pageEl);
  if (matrix) return matrix;

  // Tier 3 check: Fallback for structural grids that fail geometric symmetry due to alignment noise
  const display = style.display || '';
  const cls = (el.getAttribute('class') || '').toLowerCase();

  if (display.includes('grid') || cls.includes('grid')) {
    const kids = visibleChildren(el);
    // At least 2 items, all must be pure data cells
    if (kids.length >= 2 && kids.every(isDataCell)) {
      // Estimate columns based on first item's top offset
      let cols = 1;
      if (kids.length > 1) {
        const firstTop = Math.round(kids[0].getBoundingClientRect().top / 8) * 8;
        for (let i = 1; i < kids.length; i++) {
          const kidTop = Math.round(kids[i].getBoundingClientRect().top / 8) * 8;
          if (kidTop === firstTop) cols++;
          else break;
        }
      }
      return { rows: Math.ceil(kids.length / cols), cols, type: `Fallback [Grid]` };
    }
  }

  return null;
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * findSingleTable(editor)
 * Standardized single-match return for integration with older toolbar buttons.
 */
export const detectTable = (editor) => {
  const all = detectAllTables(editor);
  return all.length > 0 ? { found: true, ...all[0].details } : { found: false };
};

/**
 * detectAllTables(editor)
 * Full-page scanner used for highlighting and processing multiple tables.
 */
export const detectAllTables = (editor) => {
  if (!editor) return [];
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return [];

  const pageEl = frameDoc.querySelector('.visual-page') || frameDoc.body;
  const results = [];
  const classified = new Set(); // Stores classified table roots

  const allEls = pageEl.querySelectorAll(
    'div, section, article, main, aside, table, ul, ol, form, dl, header, footer'
  );
  const view = frameDoc.defaultView || window;

  for (const el of allEls) {
    // DEDUPLICATION:
    // If an element is INSIDE an already matched table, ignore it.
    // This prevents 'Russian Dolls' from showing multiple badges for one master table.
    let isDescendant = false;
    for (const parent of classified) {
      if (parent !== el && parent.contains(el)) {
        isDescendant = true;
        break;
      }
    }
    if (isDescendant) continue;

    // Skip internal editor highlights and spacers
    if (el.hasAttribute('data-editor-spacer') || el.hasAttribute('data-table-badge')) continue;

    const style = view.getComputedStyle(el);
    const role = el.getAttribute('role');

    // TIER 1: Explicitly Declared Tables
    // Catches native <table>, ARIA [role="grid"], and 'display: table' style families.
    const isDeclared =
      el.tagName === 'TABLE' ||
      role === 'table' ||
      role === 'grid' ||
      style.display === 'table' ||
      style.display === 'inline-table';

    // ENGINE MAPPING LOGIC (mirrors pushEngine.js class/style checks)
    let engineType = 'Block';
    const tagName = el.tagName.toLowerCase();
    const elClasses = (el.getAttribute('class') || '').toLowerCase();
    const parentClasses = (el.parentElement?.getAttribute('class') || '').toLowerCase();
    const pStyle = el.parentElement ? view.getComputedStyle(el.parentElement) : {};

    const combinedClasses = `${elClasses} ${parentClasses}`;
    const combinedDisplay = `${style.display || ''} ${pStyle.display || ''}`;

    if (['table', 'tbody', 'thead', 'tr'].includes(tagName)) {
      engineType = 'Native';
    } else if (combinedClasses.includes('grid') || combinedDisplay.includes('grid')) {
      engineType = 'Grid';
    } else if (combinedClasses.includes('flex') || combinedDisplay.includes('flex')) {
      engineType = 'Flex';
    }

    if (isDeclared) {
      classified.add(el);
      results.push({ el, type: `Declared [${engineType}]`, tier: 1 });
      continue;
    }

    // TIER 2: Structural Matrix (Geometric Symmetry)
    // Catches Flexbox, Grid, Floats, and Span-based tables by visual layout.
    const matrix = findTableMatrix(el, pageEl); // Bug 1 fix: pass pageEl
    if (matrix) {
      classified.add(el);
      results.push({
        el,
        type: `Structural [${engineType}]`,
        tier: 2,
        details: `${matrix.rows}x${matrix.cols} (${matrix.type})`,
      });
    }
  }
  return results;
};

// ─── Visual Highlighting System ─────────────────────────────────────────────

const TIER_COLORS = { 1: '#16a34a', 2: '#2563eb' };

export const clearTableHighlights = (editor) => {
  if (!editor) return;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return;
  frameDoc.querySelectorAll('[data-table-badge]').forEach((b) => b.remove());
  frameDoc.querySelectorAll('[data-table-highlighted]').forEach((el) => {
    el.removeAttribute('data-table-highlighted');
    el.style.outline = '';
  });
};

/**
 * highlightTables(editor)
 * Injects sleek visual badges directly into the canvas document.
 * Used for debugging and user confirmation of detected areas.
 */
export const highlightTables = (editor) => {
  if (!editor) return 0;
  const frameDoc = editor.Canvas?.getDocument();
  if (!frameDoc) return 0;

  // 1. CLEAR OLD STATE
  clearTableHighlights(editor);

  // 2. RUN FULL SCAN
  const tables = detectAllTables(editor);

  // 3. INJECT HI-RES BADGES
  tables.forEach(({ el, type, tier, details }, idx) => {
    const color = TIER_COLORS[tier] || '#64748b';
    const index = idx + 1;

    // Ensure badge can be relative to the element
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';

    el.setAttribute('data-table-highlighted', 'true');
    el.style.outline = `2px solid ${color}`;

    const badge = frameDoc.createElement('div');
    badge.setAttribute('data-table-badge', String(index));
    badge.innerHTML = `<b style="margin-right:6px">T${index}</b> ${type} <small style="margin-left:8px; opacity:0.8">${details || ''}</small>`;

    // Premium Visual Styling
    Object.assign(badge.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '9999',
      background: color,
      color: 'white',
      padding: '2px 10px',
      borderRadius: '0 0 8px 0',
      fontSize: '11px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    el.prepend(badge);
  });

  return tables.length;
};
