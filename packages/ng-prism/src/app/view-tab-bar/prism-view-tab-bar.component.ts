import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismHeadCompactState } from '../component-head/head-compact.js';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismSegmentedComponent, type PrismSegmentOption } from '../shared/prism-segmented.component.js';

/** The view switch of the component head: Playground and every view panel (Overview, API, …). */
@Component({
    selector: 'prism-view-tab-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismSegmentedComponent, PrismIconComponent],
    templateUrl: './prism-view-tab-bar.component.html',
    styleUrl: './prism-view-tab-bar.component.css'
})
export class PrismViewTabBarComponent {
    protected readonly panelService = inject(PrismPanelService);
    protected readonly navigationService = inject(PrismNavigationService);

    protected readonly viewPanels = this.panelService.visibleViewPanels;

    protected readonly options = computed<PrismSegmentOption[]>(() => [
        ...(this.navigationService.activeTarget() === 'component' ? [{ value: 'renderer', label: 'Playground' }] : []),
        ...this.viewPanels().map((panel) => ({ value: panel.id, label: panel.label }))
    ]);

    /** Set inside a component head, which turns compact when it runs out of room; absent elsewhere. */
    private readonly headState = inject(PrismHeadCompactState, { optional: true });

    /** In a compact head the switcher is a menu, named after the active view. */
    protected readonly compact = computed(() => this.headState?.compact() ?? false);

    protected readonly activeLabel = computed(() => {
        const options = this.options();

        return (options.find((option) => option.value === this.panelService.activeViewId()) ?? options[0])?.label ?? '';
    });

    protected select(id: string | null): void {
        if (id !== null) this.panelService.activeViewId.set(id);
    }

    /** A view picked from the menu. The menu is passed in rather than queried: these specs cannot render a component with signal queries. */
    protected pick(id: string, menu: HTMLElement): void {
        this.select(id);
        menu.hidePopover?.();
    }
}
