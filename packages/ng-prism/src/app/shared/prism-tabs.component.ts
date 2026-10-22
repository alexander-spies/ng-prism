import { ChangeDetectionStrategy, Component, effect, ElementRef, input, model, viewChildren } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import type { BadgeTone } from './badge.types.js';
import { nextRovingIndex } from './roving-focus.js';

/** A tab's badge: `count` is a plain quantity, `issues` a number of open findings. */
export interface PrismTabBadge {
    kind: 'count' | 'issues';
    text: string;
    tone?: BadgeTone;
    /** Read after the tab's label, e.g. "A11y, 1 violation". */
    ariaLabel: string;
}

export interface PrismTabItem {
    id: string;
    label: string;
    icon?: string;
    badge?: PrismTabBadge | null;
    title?: string;
}

/**
 * The one tab bar of the chrome: variant ribbon and panel tabs (`md`), sub-tabs
 * inside panels (`sm`).
 *
 * One indicator per size: `md` underlines the active tab in the brand ink, `sm`
 * in the primary colour. Full tab semantics with a roving tabindex: arrow keys,
 * Home and End move between tabs and select them.
 */
@Component({
    selector: 'prism-tabs',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-tabs.component.html',
    styleUrl: './prism-tabs.component.css',
    host: { '[class.prism-tabs--sm]': "size() === 'sm'" }
})
export class PrismTabsComponent {
    readonly items = input.required<readonly PrismTabItem[]>();
    readonly active = model<string | null>(null);
    readonly size = input<'md' | 'sm'>('md');
    readonly ariaLabel = input<string | null>(null);
    /** When set, each tab points at `<prefix><id>` through `aria-controls`. */
    readonly panelIdPrefix = input<string | null>(null);

    private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

    constructor() {
        effect(() => {
            const index = this.items().findIndex((item) => item.id === this.active());

            this.tabs()[index]?.nativeElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        });
    }

    protected select(item: PrismTabItem): void {
        this.active.set(item.id);
    }

    protected onKey(event: KeyboardEvent): void {
        const items = this.items();
        const current = Math.max(
            0,
            this.tabs().findIndex((tab) => tab.nativeElement === event.target)
        );
        const next = nextRovingIndex(current, event.key, items.length);

        if (next === null) return;
        event.preventDefault();
        this.active.set(items[next].id);
        this.tabs()[next]?.nativeElement.focus();
    }

    protected panelId(item: PrismTabItem): string | null {
        const prefix = this.panelIdPrefix();

        return prefix === null ? null : prefix + item.id;
    }

    protected accessibleName(item: PrismTabItem): string {
        return item.badge ? `${item.label}, ${item.badge.ariaLabel}` : item.label;
    }
}
