// Delegated event handlers all need the same thing: from an event target, the
// nearest matching element, as an HTMLElement (so .dataset and .classList are
// there). EventTarget alone gives none of that.

/**
 * @param {EventTarget|null} target
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function closestEl(target, selector) {
    if (!(target instanceof Element)) return null;
    return /** @type {HTMLElement|null} */ (target.closest(selector));
}
