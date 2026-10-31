import { trackPointerDrag } from './pointer-drag.js';

/** jsdom 26 has no `PointerEvent`: a `MouseEvent` carries the coordinates, `pointerId` is added by hand. */
function pointer(type: string, init: MouseEventInit = {}): PointerEvent {
    const event = new MouseEvent(type, { bubbles: true, ...init });

    Object.defineProperty(event, 'pointerId', { value: 1 });
    return event as PointerEvent;
}

/** Starts a drag at (100, 100) on a fresh element and records every delta it reports. */
function startDrag(axis: 'x' | 'y') {
    const el = document.createElement('div');
    const deltas: number[] = [];

    document.body.appendChild(el);
    trackPointerDrag(el, pointer('pointerdown', { clientX: 100, clientY: 100 }), axis, (delta) => deltas.push(delta));
    return { el, deltas };
}

describe('trackPointerDrag', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should report horizontal travel to the right as positive', () => {
        const { el, deltas } = startDrag('x');

        el.dispatchEvent(pointer('pointermove', { clientX: 130, clientY: 100 }));

        expect(deltas).toEqual([30]);
    });

    /** Upward travel grows a panel that sits below its grip, which is what the row grip resizes. */
    it('should report vertical travel upwards as positive', () => {
        const { el, deltas } = startDrag('y');

        el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 80 }));

        expect(deltas).toEqual([20]);
    });

    it('should mark the grip as active while the drag lasts', () => {
        const { el } = startDrag('x');

        expect(el.classList.contains('active')).toBe(true);

        el.dispatchEvent(pointer('pointerup'));

        expect(el.classList.contains('active')).toBe(false);
    });

    it.each(['pointerup', 'pointercancel', 'lostpointercapture'])('should stop following the pointer after %s', (end) => {
        const { el, deltas } = startDrag('x');

        el.dispatchEvent(pointer(end));
        el.dispatchEvent(pointer('pointermove', { clientX: 160, clientY: 100 }));

        expect(deltas).toEqual([]);
        expect(el.classList.contains('active')).toBe(false);
    });
});
