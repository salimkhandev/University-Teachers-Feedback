/**
 * Core constants and configurations for the page break engine.
 * Responsible for defining common tags, selectors, and identifiers.
 */

export const INLINE_TAGS = new Set([
  'span',
  'a',
  'i',
  'b',
  'em',
  'strong',
  'label',
  'abbr',
  'cite',
  'font',
  'br',
]);
export const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
export const PAGE_ROOT_TYPES = new Set(['wrapper', 'visual-page', 'body', 'html']);
export const BR_SPACER_CLASS = 'pb-br-spacer';
export const KNOWN_NON_HEADERS = new Set([
  'li',
  'ul',
  'ol',
  'section',
  'article',
  'td',
  'th',
  'tr',
  'table',
  'img',
  'figure',
]);
export const ATOMIC_TABLE_HEIGHT_LIMIT = 600;
// Enhanced table atomicity: if a table crosses a page break but the remaining
// portion after the break is small (< 400px), still treat it as atomic
// provided the total height is reasonable (< 1123px) to avoid infinite loops.
export const ATOMIC_TABLE_REMAINING_HEIGHT_THRESHOLD = 400;
export const ATOMIC_TABLE_MAX_TOTAL_HEIGHT = 1123;
