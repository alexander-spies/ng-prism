/**
 * The arithmetic behind `prismResizer`, kept out of the directive.
 *
 * Not for tidiness: a directive whose inputs are `input()` signals has to be
 * rendered inside a host component to be exercised, and this package's specs
 * run under jsdom against SWC-compiled sources, where JIT cannot instantiate
 * one. Extracted, the maths is ordinary and testable. It is the same reason
 * `input-bindings.ts` and `overlay-resolver.ts` sit beside their components.
 */

/**
 * Where a drag lands.
 *
 * `scale` maps pointer movement onto the value. `1` is a panel edge, where a
 * pixel of travel is a pixel of size. The viewport grips pass `2 / zoom` and
 * `-2 / zoom`: the centred box contributes the `2`, since holding one edge
 * changes the width at both, and the stage's `transform: scale(var(--zoom))`
 * contributes the division, since a pointer moving `dx` across the *painted*
 * box has to change the CSS width by `2·dx / zoom` to keep the grip under the
 * cursor. The sign says which edge is being held.
 */
export function resizeValue(startValue: number, delta: number, scale: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, startValue + delta * scale));
}
