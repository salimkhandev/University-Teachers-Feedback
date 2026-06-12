/**
 * Cleanup Engine.
 * Responsible for removing spacer divs, injected <br> tags, and reseting margin-top pushes
 * when formatting needs to be rebuilt or cleared.
 */
import { trackedPushedComponents, trackedSplitComponents } from './registry.js';
import { BR_SPACER_CLASS } from '../constants.js';
import { resetHeaderCache } from '../componentHelpers.js';

export const stripFixationStyles = (comp, recurse = true) => {
  if (!comp) return;
  const style = { ...comp.getStyle() };
  const attrs = { ...comp.getAttributes() };
  let sc = false,
    ac = false;

  if (style['--pb-mt-active']) {
    // Bug 12 fix: use --pb-pre-save-mt as the source of truth for reset.
    // We PRESERVE these variables so they can be reused across multiple reset/format cycles.
    const orig = style['--pb-pre-save-mt'] || style['--pb-orig-mt'];
    style['margin-top'] = !orig || orig === '0px' || orig === 'unset' ? '' : orig;
    delete style['--pb-mt-active'];
    delete style['--pb-applied-mt'];
    sc = true;
  }

  if (style['--pb-pt-active']) {
    const applied = style['--pb-applied-pt'];
    const current = comp.getEl()?.style.paddingTop || style['padding-top'] || '0px';
    if (applied && current !== applied) style['--pb-orig-pt'] = current;
    const orig = style['--pb-orig-pt'];
    style['padding-top'] = !orig || orig === '0px' || orig === 'unset' ? '' : orig;
    delete style['--pb-pt-active'];
    delete style['--pb-applied-pt'];
    sc = true;
  }

  if (sc) comp.setStyle(style);
  if (recurse && typeof comp.components === 'function')
    comp.components().forEach((c) => stripFixationStyles(c, true));
};

export const resetPageBreaks = (editor) => {
  const wrapper = editor.getWrapper();
  if (!wrapper) return;

  const brSpacerRegex = new RegExp(
    `<(br|tr)[^>]*(${BR_SPACER_CLASS}|data-editor-spacer|data-editor-spacer-header)[^>]*>((<td[^>]*></td>)?(<\/tr[^>]*>)?)`,
    'gi'
  );

  if (trackedSplitComponents.size > 0) {
    trackedSplitComponents.forEach((c) => {
      const el = c.getEl();
      if (el) {
        const cleanHtml = el.innerHTML.replace(brSpacerRegex, '');
        if (cleanHtml !== el.innerHTML) {
          c.components().reset(cleanHtml);
        }
      } else {
        const html = c.get('content');
        if (typeof html === 'string') {
          c.set('content', html.replace(brSpacerRegex, ''));
        }
      }
    });
    trackedSplitComponents.clear();
  }

  const frameDoc = editor.Canvas.getDocument();
  if (frameDoc) {
    frameDoc.querySelectorAll(`.${BR_SPACER_CLASS}`).forEach((el) => el.remove());
    // Bug 10 fix: unified selector
    frameDoc
      .querySelectorAll('[data-editor-spacer], [data-editor-spacer-header]')
      .forEach((el) => el.remove());
  }

  const spacersToRemove = [];
  const collectSpacers = (c) => {
    if (!c || typeof c.components !== 'function') return;
    c.components().forEach((child) => {
      const attrs = child.getAttributes?.() || {};
      const classes = child.getClasses?.();
      const hasSpacerClass =
        (attrs.class && attrs.class.includes(BR_SPACER_CLASS)) ||
        (Array.isArray(classes) && classes.includes(BR_SPACER_CLASS)) ||
        (classes?.pluck && classes.pluck('name').includes(BR_SPACER_CLASS)) ||
        child.getEl?.()?.classList?.contains(BR_SPACER_CLASS);

      if (
        attrs['data-editor-spacer'] !== undefined ||
        attrs['data-editor-spacer-header'] !== undefined ||
        hasSpacerClass
      ) {
        spacersToRemove.push(child);
      } else {
        collectSpacers(child);
      }
    });
  };
  collectSpacers(wrapper);
  spacersToRemove.forEach((c) => c.remove());

  if (trackedPushedComponents.size > 0) {
    trackedPushedComponents.forEach((c) => stripFixationStyles(c, false));
    trackedPushedComponents.clear();
  } else {
    stripFixationStyles(wrapper, true);
  }

  wrapper.find('[data-pb-pushed]').forEach((c) => stripFixationStyles(c, false));

  resetHeaderCache();

  editor.refresh();
};
