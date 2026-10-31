import { Injectable, signal } from '@angular/core';

/**
 * Below this width the component head turns compact: the category goes, the
 * parts and the metrics move into the ⓘ card, and the view switcher becomes a
 * menu. Measured on the head itself, not on the viewport, so a narrow desktop
 * window gets the compact row as well. A desktop window with the sidebar keeps
 * the full row from about 900px of window width.
 */
export const HEAD_COMPACT_BELOW = 600;

export function isCompactHead(width: number): boolean {
    return width < HEAD_COMPACT_BELOW;
}

/**
 * Whether the head is compact, provided by `PrismComponentHeadComponent` for
 * itself and for what the shell projects into it: the view switcher reads it
 * to turn into a menu.
 */
@Injectable()
export class PrismHeadCompactState {
    readonly compact = signal(false);
}
