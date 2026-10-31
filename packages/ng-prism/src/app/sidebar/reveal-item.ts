/** The vertical extent of a box, in viewport coordinates as `getBoundingClientRect` gives them. */
export interface VerticalBox {
    top: number;
    bottom: number;
}

/**
 * The `scrollTop` that centres `item` in the scroll container `viewport`, which
 * is scrolled to `scrollTop` now. `null` while all of the item is in sight: a
 * click in the list selects an item the reader sees, and the list must not move
 * under the pointer.
 */
export function revealScrollTop(viewport: VerticalBox, item: VerticalBox, scrollTop: number): number | null {
    if (item.top >= viewport.top && item.bottom <= viewport.bottom) return null;
    const free = viewport.bottom - viewport.top - (item.bottom - item.top);

    return Math.max(0, scrollTop + item.top - viewport.top - free / 2);
}
