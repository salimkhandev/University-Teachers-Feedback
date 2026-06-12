import { handleDefaultMarginPush } from './defaultMarginFormatter.js';
import { trackedPushedComponents } from '../reset/registry.js';

export const handleFlexFormatting = (flexComp, targetComp, amount) => {
  const flexEl = flexComp.getEl();
  if (!flexEl) return handleDefaultMarginPush(targetComp, amount);

  const view = flexEl.ownerDocument?.defaultView;
  if (!view) return handleDefaultMarginPush(targetComp, amount);

  const cs = view.getComputedStyle(flexEl);
  const isTransposed =
    cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse' || cs.flexDirection === '';

  if (!isTransposed) {
    // Standard flex-col: targetComp is a row — just push it directly
    return handleDefaultMarginPush(targetComp, amount);
  }

  // Transposed (row-of-columns): targetComp is a cell inside one column.
  // Find its row index and apply the same margin to that index in ALL columns.
  const columnComp = targetComp.parent();
  if (!columnComp) return handleDefaultMarginPush(targetComp, amount);

  const rowIndex = columnComp.components().indexOf(targetComp);
  if (rowIndex === -1) return handleDefaultMarginPush(targetComp, amount);

  flexComp.components().forEach((colComp) => {
    const cell = colComp.components().at(rowIndex);
    if (!cell) return;

    const style = { ...cell.getStyle() };
    const existing = parseInt(style['margin-top']) || 0;

    // Bug 12 fix: use --pb-pre-save-mt sentinel
    if (!style['--pb-pre-save-mt']) {
      style['--pb-pre-save-mt'] = style['margin-top'] || '0px';
    }
    if (!style['--pb-orig-mt']) style['--pb-orig-mt'] = style['--pb-pre-save-mt'];

    style['--pb-mt-active'] = 'true';
    style['margin-top'] = `${existing + amount}px`;
    cell.setStyle(style);

    const cellEl = cell.getEl();
    if (cellEl) cellEl.style.marginTop = style['margin-top'];

    trackedPushedComponents.add(cell);
  });
};
