/**
 * Shared Rigid Spacer Logic for Framework Grids and Flexboxes.
 * Responsible for injecting full-width div spacers to split complex column structures cleanly.
 */
import { trackedPushedComponents } from '../reset/registry.js';
import { resolveSpacerBackground } from '../helpers/resolveSpacerBackground.js';

export const injectRigidSpacer = (
  parentComp,
  comp,
  amount,
  isVisualContainer,
  isStructuralTable
) => {
  const siblings = parentComp.components();
  const myIndex = siblings.indexOf(comp);
  if (myIndex === -1) return;

  const { color: finalBgColor, image: finalBgImage } = resolveSpacerBackground(parentComp, comp);

  let finalBorderColor = '#d1d5db';
  let applyBorders = isStructuralTable;

  if (isStructuralTable) {
    const elToCheck = comp.getEl?.() || parentComp.getEl?.();
    if (elToCheck && typeof elToCheck.getBoundingClientRect === 'function') {
      const view = elToCheck.ownerDocument?.defaultView || window;
      const computed = view.getComputedStyle(elToCheck);

      // If it's a visual container (like a card grid) and has no borders itself, suppress the table split lines.
      if (
        isVisualContainer &&
        computed.borderTopWidth === '0px' &&
        computed.borderBottomWidth === '0px'
      ) {
        applyBorders = false;
      } else {
        if (computed.borderTopColor && computed.borderTopColor !== 'rgba(0, 0, 0, 0)') {
          finalBorderColor = computed.borderTopColor;
        }
      }
    }
  }

  let existingSpacer = null;
  if (myIndex > 0) {
    const prev = siblings.at(myIndex - 1);
    if (prev.getAttributes()?.['data-editor-spacer'] !== undefined) {
      existingSpacer = prev;
    }
  }

  if (existingSpacer) {
    const currentStyle = { ...existingSpacer.getStyle() };
    const existingHeight = parseFloat(currentStyle.height) || 0;
    currentStyle.height = `${existingHeight + amount}px`;
    currentStyle['min-height'] = currentStyle.height;
    // Lift the ceiling — max-height must grow with height or it will block the spacer from expanding
    currentStyle['max-height'] = currentStyle.height;
    if (finalBgColor) currentStyle['background-color'] = finalBgColor;
    if (finalBgImage) currentStyle['background-image'] = finalBgImage;
    if (!finalBgColor) delete currentStyle['background-color'];
    if (!finalBgImage) delete currentStyle['background-image'];
    existingSpacer.setStyle(currentStyle);

    const existingEl = existingSpacer.getEl();
    if (existingEl) {
      existingEl.style.height = currentStyle.height;
      existingEl.style.minHeight = currentStyle.height;
      existingEl.style.maxHeight = currentStyle.height;
      if (finalBgColor) existingEl.style.backgroundColor = finalBgColor;
      else existingEl.style.backgroundColor = '';
      if (finalBgImage) existingEl.style.backgroundImage = finalBgImage;
      else existingEl.style.backgroundImage = '';
    }
  } else {
    let componentsToInject = [
      {
        type: 'default',
        tagName: 'div',
        attributes: { 'data-editor-spacer': '' },
        style: {
          height: `${amount}px`,
          'min-height': `${amount}px`,
          'max-height': `${amount}px`,
          'flex-shrink': '0',
          'grid-column': '1 / -1',
          'flex-basis': '100%',
          /*
           * NEGATIVE MARGIN BLEED ARCHITECTURE
           * Makes the spacer 4px wider than the grid track/container and shifts it 2px left.
           * This creates a 2px overhang on both sides, perfectly masking the parent's
           * left/right borders with the background color, immune to CSS Grid/max-width constraints.
           */
          width: isStructuralTable ? 'calc(100% + 4px) !important' : '100%',
          'max-width': 'none !important',
          'margin-left': isStructuralTable ? '-2px !important' : '0',
          ...(finalBgColor && { 'background-color': finalBgColor }),
          ...(finalBgImage && { 'background-image': finalBgImage }),
          'z-index': isVisualContainer ? '10' : 'auto',
          position: isVisualContainer ? 'relative' : 'static',
          'border-top': 'none !important',
          'border-bottom': applyBorders ? `1px solid ${finalBorderColor}` : 'none',
          'border-left': 'none',
          'border-right': 'none',
          padding: '0',
          'margin-top': '0',
          'margin-bottom': '0',
          overflow: 'hidden',
          'box-sizing': 'border-box',
        },
      },
    ];

    parentComp.components().add(componentsToInject, { at: myIndex });

    const spacerComp = parentComp.components().at(myIndex);
    if (spacerComp) {
      const forcedStyle = {
        height: `${amount}px`,
        'min-height': `${amount}px`,
        'max-height': `${amount}px`,
        'flex-shrink': '0',
        'grid-column': '1 / -1',
        'flex-basis': '100%',
        /*
         * NEGATIVE MARGIN BLEED ARCHITECTURE
         * Makes the spacer 4px wider than the grid track/container and shifts it 2px left.
         */
        width: isStructuralTable ? 'calc(100% + 4px) !important' : '100%',
        'max-width': 'none !important',
        'margin-left': isStructuralTable ? '-2px !important' : '0',
        ...(finalBgColor && { 'background-color': finalBgColor }),
        ...(finalBgImage && { 'background-image': finalBgImage }),
        'z-index': isVisualContainer ? '10' : 'auto',
        position: isVisualContainer ? 'relative' : 'static',
        'border-top': 'none !important',
        'border-bottom-width': applyBorders ? '1px' : '0',
        'border-bottom-style': applyBorders ? 'solid' : 'none',
        'border-bottom-color': applyBorders ? finalBorderColor : 'transparent',
        'border-left': 'none',
        'border-right': 'none',
        padding: '0',
        'margin-top': '0',
        'margin-bottom': '0',
        overflow: 'hidden',
        'box-sizing': 'border-box',
      };
      spacerComp.setStyle(forcedStyle);

      const sEl = spacerComp.getEl?.();
      if (sEl) {
        Object.entries(forcedStyle).forEach(([k, v]) => {
          sEl.style.setProperty(k, v);
        });
      }
    }
  }

  trackedPushedComponents.add(comp);
};
