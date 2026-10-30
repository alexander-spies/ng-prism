import { Directive, ElementRef, inject, input, output } from '@angular/core';
import { trackPointerDrag } from './pointer-drag.js';
import { resizeValue } from './resize-value.js';

@Directive({
    selector: '[prismResizer]',
    standalone: true,
    host: {
        '[style.cursor]': 'axis() === "x" ? "col-resize" : "row-resize"',
        '[attr.role]': '"separator"',
        '[attr.aria-orientation]': 'axis() === "x" ? "vertical" : "horizontal"',
        '(pointerdown)': 'onPointerDown($event)',
        // The browser would otherwise claim a touch on the grip for scrolling or
        // zooming and cancel the drag before it starts.
        '[style.touch-action]': '"none"',
        '(keydown)': 'onKeyDown($event)',
        '[attr.tabindex]': '"0"'
    }
})
export class PrismResizerDirective {
    readonly axis = input.required<'x' | 'y'>();
    readonly min = input(200);
    readonly max = input(600);
    readonly value = input(0);

    /**
     * Pointer travel to value, as a multiplier.
     *
     * `1` (the default) is a panel or sidebar edge. The viewport grips pass
     * `2 / zoom` and `-2 / zoom`: their box is centred, so holding one edge
     * changes the width at both (the `2`), and the stage scales that box by
     * `--zoom`, so the multiplier has to divide it back out to keep the grip
     * under the cursor. Existing call sites do not pass it and are unaffected.
     */
    readonly scale = input(1);

    readonly valueChange = output<number>();

    private readonly el = inject(ElementRef<HTMLElement>);

    /** How far one arrow key moves the value. */
    private static readonly STEP = 10;

    protected onPointerDown(e: PointerEvent): void {
        // Primary button only, and a touch or pen contact reports 0 as well. Without
        // this a right-click would start a drag the context menu then takes the
        // pointer away from, so the value would follow the cursor with no button
        // held. `preventDefault` does not suppress `contextmenu`, so the guard has
        // to be here.
        if (e.button !== 0) return;
        e.preventDefault();
        const startVal = this.value();

        trackPointerDrag(this.el.nativeElement, e, this.axis(), (delta) => this.valueChange.emit(resizeValue(startVal, delta, this.scale(), this.min(), this.max())));
    }

    /**
     * Keyboard direction is independent of `scale`.
     *
     * `scale` inverts the *pointer* for a grip on the far edge of a centred box,
     * and carrying that inversion into the keyboard was wrong: two separators
     * that expose the same `aria-valuenow` answered the same key in opposite
     * directions, so a screen-reader user heard the announced value travel one
     * way on one edge and the other way on the other. WAI-ARIA's window-splitter
     * pattern has ArrowRight and ArrowUp increase the value, whichever edge the
     * separator sits on, and the value here is the width rather than a position.
     */
    protected onKeyDown(e: KeyboardEvent): void {
        const step = PrismResizerDirective.STEP;
        const current = this.value();
        let next: number | null = null;

        if (this.axis() === 'x') {
            if (e.key === 'ArrowRight') next = current + step;
            if (e.key === 'ArrowLeft') next = current - step;
        } else {
            if (e.key === 'ArrowUp') next = current + step;
            if (e.key === 'ArrowDown') next = current - step;
        }
        // Required of a focusable separator by the same pattern, and the only way
        // to reach either end without holding an arrow key down.
        if (e.key === 'Home') next = this.min();
        if (e.key === 'End') next = this.max();

        if (next !== null) {
            e.preventDefault();
            this.valueChange.emit(Math.max(this.min(), Math.min(this.max(), next)));
        }
    }
}
