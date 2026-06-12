/**
 * Native HTML Table Formatter.
 * Responsible for handling page breaks across standard HTML <table>, <tr>, <td> elements.
 * Injects a spacer row and a 'Continued...' indicator row at the page-break point.
 */
import { trackedPushedComponents } from '../reset/registry.js';
import { resolveSpacerBackground } from '../helpers/resolveSpacerBackground.js';

export const handleNativeTablePush = (comp, amount) => {
  const parentComp = comp.parent();
  if (!parentComp) return;

  const siblings = parentComp.components();
  const myIndex = siblings.indexOf(comp);
  if (myIndex === -1) return;

  // 1. Robust Column Counting — skip injected spacers, find first real data row
  let maxCols = 1;
  const allSiblingModels = Array.from(siblings.models || []);
  const firstRealRow = allSiblingModels.find((row) => {
    const attrs = row.getAttributes() || {};
    // Skip any previously-injected spacer or header rows
    return (
      !attrs['data-editor-spacer'] &&
      !attrs['data-editor-spacer-header'] &&
      !attrs['data-cloned-header']
    );
  });

  if (firstRealRow) {
    const rowComponents = firstRealRow.components();
    const cellModels = rowComponents ? rowComponents.models : null;

    if (cellModels && cellModels.length > 0) {
      maxCols =
        cellModels.reduce((sum, cell) => {
          const attrs = cell.getAttributes() || {};
          return sum + (parseInt(attrs.colspan) || 1);
        }, 0) || 1;
    } else {
      // Fallback to DOM
      const el = firstRealRow.getEl();
      if (el && el.children) {
        maxCols =
          Array.from(el.children).reduce((sum, child) => {
            const colSpanAttr = child.getAttribute ? child.getAttribute('colspan') : null;
            return sum + (parseInt(colSpanAttr) || 1);
          }, 0) || 1;
      }
    }
  }

  // Fallback: read column count from the thead DOM if tbody rows aren't reliable
  if (maxCols <= 1) {
    const tableEl = parentComp.parent()?.getEl();
    const theadEl = tableEl?.querySelector('thead tr');
    if (theadEl) {
      maxCols =
        Array.from(theadEl.children).reduce((sum, th) => {
          return sum + (parseInt(th.getAttribute('colspan')) || 1);
        }, 0) || 1;
    }
  }

  let existingSpacer = null;
  if (myIndex > 0) {
    const prev = siblings.at(myIndex - 1);
    if (prev && prev.getAttributes()?.['data-editor-spacer'] !== undefined) {
      existingSpacer = prev;
    }
  }

  const { color, image } = resolveSpacerBackground(parentComp, comp);

  if (existingSpacer) {
    const td = existingSpacer.components().at(0);
    if (td) {
      const currentStyle = { ...td.getStyle() };
      const existingHeight = parseFloat(currentStyle.height) || 0;
      currentStyle.height = `${existingHeight + amount}px`;
      if (color) currentStyle['background-color'] = `${color} !important`;
      if (image) currentStyle['background-image'] = `${image} !important`;
      if (!color) delete currentStyle['background-color'];
      if (!image) delete currentStyle['background-image'];
      td.setStyle(currentStyle);

      const tdEl = td.getEl();
      if (tdEl) {
        tdEl.style.height = currentStyle.height;
        if (color) tdEl.style.backgroundColor = color;
        else tdEl.style.backgroundColor = '';
        if (image) tdEl.style.backgroundImage = image;
        else tdEl.style.backgroundImage = '';
      }
    }
  } else {
    let componentsToInject = [
      {
        type: 'row',
        tagName: 'tr',
        attributes: { 'data-editor-spacer': '' },
        components: [
          {
            type: 'cell',
            tagName: 'td',
            attributes: { colspan: maxCols },
            style: {
              height: `${amount}px`,
              'border-top': 'none !important',
              'border-bottom': 'none !important',
              'border-left': 'hidden !important',
              'border-right': 'hidden !important',
              padding: '0 !important',
              margin: '0 !important',
              ...(color && { 'background-color': `${color} !important` }),
              ...(image && { 'background-image': `${image} !important` }),
            },
          },
        ],
      },
    ];

    let theadComp = null;
    const tableComp = parentComp.parent();
    if (tableComp) {
      const tChildren = tableComp.components();
      for (let i = 0; i < tChildren.length; i++) {
        const child = tChildren.at(i);
        if ((child.get('tagName') || child.getEl()?.tagName || '').toLowerCase() === 'thead') {
          theadComp = child;
          break;
        }
      }
    }

    if (theadComp) {
      componentsToInject.push({
        type: 'row',
        tagName: 'tr',
        attributes: { 'data-editor-spacer-header': '' },
        components: [
          {
            type: 'cell',
            tagName: 'td',
            attributes: { colspan: maxCols },
            style: {
              'border-top': 'none !important',
              'border-bottom': 'none !important',
              'border-left': 'hidden !important',
              'border-right': 'hidden !important',
              'text-align': 'center',
              width: '100% !important',
              padding: '6px 0 !important',
              margin: '0',
              'background-color': 'transparent !important',
              color: '#666',
              'font-style': 'italic',
              'font-size': '0.85em',
            },
            components: 'Continued...',
          },
        ],
      });
    }

    parentComp.components().add(componentsToInject, { at: myIndex });
  }

  trackedPushedComponents.add(comp);
};
