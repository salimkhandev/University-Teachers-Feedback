/**
 * Global state tracking for the page break engine.
 * Responsible for tracking modified components so they can be explicitly reset.
 */

export const trackedPushedComponents = new Set();
export const trackedSplitComponents = new Set();
