/**
 * Default Margin Formatter.
 * Responsible for pushing standard generic block elements (divs, paragraphs)
 * by manipulating their CSS margin-top properties.
 */
import { trackedPushedComponents } from '../reset/registry.js';

export const handleDefaultMarginPush = (comp, amount) => {
  const el = comp.getEl();
  const style = { ...comp.getStyle() };
  const existing = parseInt(style['margin-top']) || 0;
  // Bug 12 fix: use --pb-pre-save-mt as the true original, written exactly once
  if (!style['--pb-pre-save-mt']) {
    style['--pb-pre-save-mt'] = style['margin-top'] || '0px';
  }
  // Keep --pb-orig-mt for backward compat but also guard it
  if (!style['--pb-orig-mt']) style['--pb-orig-mt'] = style['--pb-pre-save-mt'];
  style['--pb-mt-active'] = 'true';
  style['margin-top'] = `${existing + amount}px`;
  style['--pb-applied-mt'] = style['margin-top'];
  comp.setStyle(style);

  if (el) {
    el.style.marginTop = style['margin-top'];
  }

  const attrs = { ...comp.getAttributes() };
  if (!attrs['data-pb-pushed']) {
    attrs['data-pb-pushed'] = 'true';
    comp.setAttributes(attrs);
    if (el) el.setAttribute('data-pb-pushed', 'true');
  }
  trackedPushedComponents.add(comp);
};
