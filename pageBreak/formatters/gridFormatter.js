import { trackedPushedComponents } from '../reset/registry.js';
import { resolveSpacerBackground } from '../helpers/resolveSpacerBackground.js';

export const handleGridFormatting = (gridComp, targetComp, amount) => {
  const siblings = gridComp.components();
  const myIndex = siblings.indexOf(targetComp);
  if (myIndex === -1) return;

  const { color: finalBgColor } = resolveSpacerBackground(gridComp, targetComp);

  let applyBorders = false;
  let finalBorderColor = '#d1d5db';
  const gridEl = gridComp.getEl();
  if (gridEl) {
    const view = gridEl.ownerDocument?.defaultView || window;
    const computed = view.getComputedStyle(gridEl);
    if (
      computed.borderTopWidth !== '0px' ||
      computed.borderLeftWidth !== '0px' ||
      computed.borderRightWidth !== '0px' ||
      computed.borderBottomWidth !== '0px'
    ) {
      applyBorders = true;
      if (computed.borderTopColor && computed.borderTopColor !== 'rgba(0, 0, 0, 0)') {
        finalBorderColor = computed.borderTopColor;
      }
    }
  }

  // Reuse existing spacer if one was already injected before this cell
  if (myIndex > 0) {
    const prev = siblings.at(myIndex - 1);
    if (prev?.getAttributes()?.['data-editor-spacer'] !== undefined) {
      const currentStyle = { ...prev.getStyle() };
      const existingHeight = parseFloat(currentStyle.height) || 0;
      const newHeight = `${existingHeight + amount}px`;
      currentStyle.height = newHeight;
      currentStyle['min-height'] = newHeight;
      currentStyle['max-height'] = newHeight;
      if (finalBgColor) currentStyle['background-color'] = finalBgColor;
      prev.setStyle(currentStyle);
      const prevEl = prev.getEl();
      if (prevEl) {
        prevEl.style.height = newHeight;
        prevEl.style.minHeight = newHeight;
        prevEl.style.maxHeight = newHeight;
        if (finalBgColor) prevEl.style.backgroundColor = finalBgColor;
      }
      trackedPushedComponents.add(targetComp);
      return;
    }
  }

  const forcedStyle = {
    'grid-column': '1 / -1', // spans all columns regardless of grid-cols-N
    height: `${amount}px`,
    'min-height': `${amount}px`,
    'max-height': `${amount}px`,
    /*
     * NEGATIVE MARGIN BLEED ARCHITECTURE
     * Makes the spacer 4px wider than the grid track and shifts it 2px left.
     * This creates a 2px overhang on both sides, perfectly masking the parent's
     * left/right borders with the background color, immune to CSS Grid/max-width constraints.
     */
    width: applyBorders ? 'calc(100% + 4px) !important' : '100%',
    'max-width': 'none !important',
    'margin-left': applyBorders ? '-2px !important' : '0 !important',
    'z-index': applyBorders ? '10' : 'auto',
    position: applyBorders ? 'relative' : 'static',
    'border-top': 'none !important',
    'border-bottom': applyBorders ? `1px solid ${finalBorderColor}` : 'none',
    'border-left': 'none !important',
    'border-right': 'none !important',
    ...(finalBgColor && { 'background-color': finalBgColor }),
    padding: '0 !important',
    'pointer-events': 'none',
  };

  // Inject a full-width grid spacer using grid-column: 1 / -1
  siblings.add(
    [
      {
        tagName: 'div',
        attributes: { 'data-editor-spacer': '' },
        style: forcedStyle,
      },
    ],
    { at: myIndex }
  );

  const spacerComp = siblings.at(myIndex);
  if (spacerComp) {
    spacerComp.setStyle(forcedStyle);
    const sEl = spacerComp.getEl?.();
    if (sEl) {
      Object.entries(forcedStyle).forEach(([k, v]) => {
        sEl.style.setProperty(
          k,
          v.replace(' !important', ''),
          v.includes('!important') ? 'important' : ''
        );
      });
    }
  }

  trackedPushedComponents.add(targetComp);
};
