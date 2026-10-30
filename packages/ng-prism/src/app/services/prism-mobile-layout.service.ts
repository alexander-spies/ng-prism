import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { MOBILE_ATTRIBUTE, MOBILE_MEDIA_QUERY, mobilePanelBounds, mobilePanelHeight, NAV_TOGGLE_ID, startsCollapsed } from './mobile-layout.js';

/**
 * The phone layout: whether it is active, and the state only it has.
 *
 * Kept apart from `PrismLayoutService` on purpose. That service is public API
 * and persists the desktop layout under `ng-prism-layout`; nothing here is
 * persisted, so a phone never overwrites the sidebar width, panel height or
 * visibility a desktop reader set, and a window dragged below the breakpoint
 * and back finds its layout as it left it. Not exported from the package.
 */
@Injectable({ providedIn: 'root' })
export class PrismMobileLayoutService {
    private readonly isMobile = signal(false);
    private readonly height = signal(0);
    private readonly open = signal(false);
    private readonly collapsed = signal(false);
    /** The panel height the reader dragged to, `null` until they do. */
    private readonly chosen = signal<number | null>(null);
    /** The height the canvas and the panel share, measured by the shell; `null` until it has. */
    private readonly space = signal<number | null>(null);

    readonly mobile = this.isMobile.asReadonly();
    readonly viewportHeight = this.height.asReadonly();
    readonly navOpen = this.open.asReadonly();
    readonly panelCollapsed = this.collapsed.asReadonly();
    /** Follows the viewport, so a turned phone gets a panel that fits: a dragged height is clamped again, not forgotten. */
    readonly panelHeight = computed(() => mobilePanelHeight(this.height(), this.chosen(), this.space()));
    readonly panelBounds = computed(() => mobilePanelBounds(this.height(), this.space()));

    constructor() {
        const destroyRef = inject(DestroyRef);
        const query = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(MOBILE_MEDIA_QUERY) : null;

        this.height.set(globalThis.innerHeight ?? 0);
        this.apply(query?.matches ?? false);

        if (query) {
            const onChange = (event: { matches: boolean }) => this.apply(event.matches);

            query.addEventListener('change', onChange);
            destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
        }

        if (typeof window !== 'undefined') {
            const onResize = () => this.height.set(window.innerHeight);

            window.addEventListener('resize', onResize);
            destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
        }

        if (typeof document !== 'undefined') {
            effect(() => document.documentElement.toggleAttribute(MOBILE_ATTRIBUTE, this.isMobile()));
        }
    }

    /**
     * Opens the navigation, or closes it when it is open. Opening puts focus on
     * the toggle, which now reads ✕: iOS Safari does not focus a tapped button,
     * and focus left on a control behind the list would land under it.
     */
    toggleNav(): void {
        if (this.open()) {
            this.closeNav();
            return;
        }
        this.open.set(true);
        document.getElementById(NAV_TOGGLE_ID)?.focus();
    }

    /**
     * Closes the navigation and returns focus to the ☰ button it was opened from.
     * A no-op while it is closed, so the sidebar can call it on every selection
     * without taking focus away on the desktop layout.
     */
    closeNav(): void {
        if (!this.open()) return;
        this.open.set(false);
        document.getElementById(NAV_TOGGLE_ID)?.focus();
    }

    /** The shell reports the height the canvas and the panel share, so the panel never takes the canvas's last 96px. */
    setPanelSpace(px: number | null): void {
        this.space.set(px);
    }

    setPanelHeight(px: number): void {
        const { min, max } = this.panelBounds();

        this.chosen.set(Math.max(min, Math.min(max, px)));
        this.collapsed.set(false);
    }

    /** A tap on the active tab folds the panel away or opens it again; a tap on another tab always opens it. */
    onPanelTab(tappedId: string, activeId: string): void {
        if (tappedId === activeId) this.collapsed.update((v) => !v);
        else this.collapsed.set(false);
    }

    private apply(mobile: boolean): void {
        if (mobile && !this.isMobile()) {
            this.chosen.set(null);
            this.collapsed.set(startsCollapsed(this.height()));
        }
        if (!mobile) this.open.set(false);
        this.isMobile.set(mobile);
    }
}
