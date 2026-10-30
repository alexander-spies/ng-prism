/**
 * Follows one pointer from `down` until it lets go, reporting travel along `axis`.
 *
 * Pointer events rather than mouse events, so a finger drags a grip the way a
 * mouse does. The pointer is captured to `el`, which routes every later event
 * of that pointer to the grip however far it travels, so the listeners sit on
 * the grip and not on the document. A drag ends on `pointerup`, and also on
 * `pointercancel` or `lostpointercapture`: a touch the browser takes over for
 * scrolling, or a capture lost to a system dialog, would otherwise leave the
 * listeners armed and the grip marked active with no finger on it.
 *
 * Travel is measured from where the drag started: rightwards on `x` and
 * upwards on `y` count as positive, since the row grip sits above the panel it
 * grows. Kept out of `PrismResizerDirective` for the reason `resize-value.ts` is.
 */
export function trackPointerDrag(el: HTMLElement, down: PointerEvent, axis: 'x' | 'y', onDelta: (delta: number) => void): void {
    const start = axis === 'x' ? down.clientX : down.clientY;

    const onMove = (event: PointerEvent) => onDelta(axis === 'x' ? event.clientX - start : start - event.clientY);

    const onEnd = () => {
        el.classList.remove('active');
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onEnd);
        el.removeEventListener('pointercancel', onEnd);
        el.removeEventListener('lostpointercapture', onEnd);
    };

    el.classList.add('active');
    // jsdom has no pointer capture; every browser this runs in does.
    el.setPointerCapture?.(down.pointerId);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
    el.addEventListener('lostpointercapture', onEnd);
}
