export type LayoutShortcut = 'sidebar' | 'toolbar' | 'addons';

/**
 * The layout toggle a key press asks for: Alt+S the sidebar, Alt+T the variant
 * rail, Alt+A the addons panel. Alt+S does nothing in the phone layout, which
 * has no sidebar column: toggling it there would only change the stored desktop
 * layout behind the reader's back, which the phone layout must never do.
 */
export function layoutShortcut(event: Pick<KeyboardEvent, 'altKey' | 'code'>, mobile: boolean): LayoutShortcut | null {
    if (!event.altKey) return null;
    switch (event.code) {
        case 'KeyS':
            return mobile ? null : 'sidebar';
        case 'KeyT':
            return 'toolbar';
        case 'KeyA':
            return 'addons';
        default:
            return null;
    }
}
