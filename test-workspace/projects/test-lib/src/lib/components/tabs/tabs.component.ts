import { ChangeDetectionStrategy, Component, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** One tab of a `TabsComponent`. */
export interface TabItem {
    /** Unique id, the value `activeTabId` holds and `tabChanged` emits. */
    id: string;
    /** Text on the tab. */
    label: string;
    /** Shows the tab but keeps it from being selected. */
    disabled?: boolean;
}

/**
 * Horizontal tab bar that switches between sections of a view.
 *
 * The bar only tracks which tab is active. Render the content for `activeTabId` yourself, below it.
 * `activeTabId` is a model, so `[(activeTabId)]` keeps your state in sync, and `tabChanged` emits the same id on every switch.
 *
 * The tabs carry `role="tab"` and `aria-selected` inside a `role="tablist"`. Disabled tabs stay visible but cannot be selected.
 *
 * @since 1.0.0
 * @see TabItem
 * @example
 * ```html
 * <sg-tabs [tabs]="tabs" [(activeTabId)]="active" />
 * ```
 * @example
 * ```ts
 * readonly tabs: TabItem[] = [
 *   { id: 'overview', label: 'Overview' },
 *   { id: 'billing', label: 'Billing', disabled: true },
 * ];
 * ```
 */
@Showcase({
    title: 'Tabs',
    status: 'wip',
    category: 'Navigation',
    description: 'Horizontal tab navigation with active state tracking and disabled tabs.',
    variants: [
        {
            name: 'Default',
            inputs: {
                tabs: [
                    { id: 'overview', label: 'Overview' },
                    { id: 'details', label: 'Details' },
                    { id: 'reviews', label: 'Reviews' }
                ],
                activeTabId: 'overview'
            }
        },
        {
            name: 'With Disabled',
            inputs: {
                tabs: [
                    { id: 'general', label: 'General' },
                    { id: 'security', label: 'Security' },
                    { id: 'advanced', label: 'Advanced', disabled: true }
                ],
                activeTabId: 'general'
            }
        },
        {
            name: 'Many Tabs',
            inputs: {
                tabs: [
                    { id: 'a', label: 'Dashboard' },
                    { id: 'b', label: 'Analytics' },
                    { id: 'c', label: 'Reports' },
                    { id: 'd', label: 'Settings' },
                    { id: 'e', label: 'Billing' }
                ],
                activeTabId: 'a'
            }
        }
    ],
    tags: ['navigation', 'tabs', 'tabbar']
})
@Component({
    selector: 'sg-tabs',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'sg-tabs' },
    template: `
        <div class="sg-tabs__list" role="tablist">
            @for (tab of tabs(); track tab.id) {
                <button
                    class="sg-tabs__tab"
                    role="tab"
                    [class.sg-tabs__tab--active]="activeTabId() === tab.id"
                    [disabled]="tab.disabled"
                    [attr.aria-selected]="activeTabId() === tab.id"
                    (click)="selectTab(tab.id)">
                    {{ tab.label }}
                </button>
            }
        </div>
    `,
    styles: `
        .sg-tabs {
            display: block;
        }
        .sg-tabs__list {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            gap: 0;
        }
        .sg-tabs__tab {
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            background: none;
            color: #6b7280;
            cursor: pointer;
            position: relative;
            margin-bottom: -1px;
            transition: color 0.15s;
            font-family: inherit;
        }
        .sg-tabs__tab:hover:not(:disabled) {
            color: #111827;
        }
        .sg-tabs__tab--active {
            color: #6366f1;
        }
        .sg-tabs__tab--active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #6366f1;
        }
        .sg-tabs__tab:disabled {
            color: #d1d5db;
            cursor: not-allowed;
        }
    `
})
export class TabsComponent {
    /** The tabs, in order, see {@link TabItem}. */
    readonly tabs = input.required<TabItem[]>();

    /** Id of the active tab. Two-way bindable with `[(activeTabId)]`. */
    readonly activeTabId = model<string>('');

    /** Emits the id of a tab when it is activated. Never emitted for a disabled tab. */
    readonly tabChanged = output<string>();

    /**
     * Activates a tab as a click would: sets `activeTabId` and emits `tabChanged`. Ignored for a disabled tab.
     * @param tabId The `id` of the tab to activate
     */
    selectTab(tabId: string): void {
        const tab = this.tabs().find((t) => t.id === tabId);

        if (tab?.disabled) return;
        this.activeTabId.set(tabId);
        this.tabChanged.emit(tabId);
    }
}
