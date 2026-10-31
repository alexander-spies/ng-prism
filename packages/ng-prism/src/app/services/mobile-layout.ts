/**
 * The phone layout, as one definition.
 *
 * Narrow screens up to 900px switch, and so do touch screens no taller than
 * 500px: a large phone held sideways is 930 to 960px wide but only about 430px
 * tall, and the desktop layout gives it a 280px sidebar over a 300px panel. A
 * desktop window of the same size keeps the desktop layout, because its pointer
 * is fine. CSS reads the result from `MOBILE_ATTRIBUTE` on `<html>`, never from
 * a media query of its own, so the two cannot drift apart.
 */
export const MOBILE_MEDIA_QUERY = '(max-width: 900px), (pointer: coarse) and (max-height: 500px)';

/** Set on `<html>` while the phone layout is active. Component styles match it with `:host-context()`. */
export const MOBILE_ATTRIBUTE = 'data-prism-mobile';

/** The ☰ button in the header, which focus returns to when the navigation closes. */
export const NAV_TOGGLE_ID = 'prism-nav-toggle';

/** The full-screen navigation, named by the toggle's `aria-controls`. */
export const NAV_SCREEN_ID = 'prism-nav-screen';

/**
 * The addon panel on a phone, relative to the height of the viewport: it starts
 * at `share`, can be dragged up to `maxShare` but not below `min`, and starts
 * folded away below `collapseBelow`, where the canvas would otherwise all but
 * vanish. Whatever the share allows, the canvas keeps `minCanvas` of the space
 * it shares with the panel.
 */
export const MOBILE_PANEL = { share: 0.45, maxShare: 0.75, min: 160, collapseBelow: 500, minCanvas: 96 } as const;

/**
 * How far the panel can be dragged. `space` is the height the canvas and the
 * panel share, below the header, the head and the rail; until the shell has
 * measured it, only the share of the viewport bounds the panel. When the two
 * conflict on a short screen the canvas wins: the minimum drops to the maximum
 * rather than the bounds crossing.
 */
export function mobilePanelBounds(viewportHeight: number, space: number | null = null): { min: number; max: number } {
    const byShare = viewportHeight * MOBILE_PANEL.maxShare;
    const bySpace = space === null ? Infinity : space - MOBILE_PANEL.minCanvas;
    const max = Math.max(0, Math.floor(Math.min(byShare, bySpace)));

    return { min: Math.min(MOBILE_PANEL.min, max), max };
}

/** The panel height for a viewport height: the reader's own choice if there is one, else the default share, within the bounds either way. */
export function mobilePanelHeight(viewportHeight: number, chosen: number | null, space: number | null = null): number {
    const { min, max } = mobilePanelBounds(viewportHeight, space);
    const wanted = chosen ?? Math.round(viewportHeight * MOBILE_PANEL.share);

    return Math.max(min, Math.min(max, wanted));
}

export function startsCollapsed(viewportHeight: number): boolean {
    return viewportHeight < MOBILE_PANEL.collapseBelow;
}
