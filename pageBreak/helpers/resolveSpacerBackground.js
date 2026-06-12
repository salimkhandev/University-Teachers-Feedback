/**
 * Resolves spacer background with a strict split strategy:
 *
 * - Flat color match between adjacent siblings → copy it (safe, origin-independent)
 * - Gradient on either sibling              → omit entirely (gradients restart at
 *                                             the element's own origin, causing seams)
 * - No meaningful bg on siblings            → omit (let parent paint through naturally)
 *
 * "Omit" means returning null, which callers use to skip setting the property
 * altogether — not 'transparent', not 'inherit', just absent from the style object.
 */
export const resolveSpacerBackground = (parentComp, comp) => {
  const getFallback = () => ({ color: getPageBackgroundColor(parentComp), image: null });

  const siblings = parentComp.components();
  const myIndex = siblings.indexOf(comp);
  if (myIndex <= 0) return getFallback();

  // Step over an existing spacer to find the real previous sibling
  const directPrev = siblings.at(myIndex - 1);
  const attrs = directPrev?.getAttributes?.() || {};
  const prevTarget =
    attrs['data-editor-spacer'] !== undefined && myIndex >= 2
      ? siblings.at(myIndex - 2)
      : directPrev;

  if (!prevTarget) return getFallback();

  const view = parentComp.getEl()?.ownerDocument?.defaultView || window;

  const getComputedBg = (c) => {
    const el = c?.getEl?.();
    if (!el || el.nodeType !== 1) return null;
    const s = view.getComputedStyle(el);
    return {
      color: s.backgroundColor,
      image: s.backgroundImage,
    };
  };

  const isMeaningfulColor = (v) => v && v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)';
  const isGradient = (v) => v && v !== 'none' && v.includes('gradient');

  const prev = getComputedBg(prevTarget);
  const curr = getComputedBg(comp);

  if (!prev || !curr) return getFallback();

  // If either side uses a gradient — never copy it, omit entirely
  if (isGradient(prev.image) || isGradient(curr.image)) {
    return getFallback();
  }

  // Flat color: only bridge if both siblings explicitly share the same color
  let color =
    isMeaningfulColor(prev.color) && isMeaningfulColor(curr.color) && prev.color === curr.color
      ? prev.color
      : null;

  if (!color) {
    color = getPageBackgroundColor(parentComp);
  }

  return { color, image: null };
};

const getPageBackgroundColor = (comp) => {
  let current = comp;
  const view = comp?.getEl?.()?.ownerDocument?.defaultView || window;
  while (current) {
    const el = current.getEl?.();
    if (el && el.nodeType === 1) {
      const style = view.getComputedStyle(el);
      const bg = style.backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        return bg;
      }
    }
    current = current.parent?.();
  }
  return 'white'; // Default fallback
};
