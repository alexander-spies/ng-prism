import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismSegmentedComponent, type PrismSegmentOption } from '../shared/prism-segmented.component.js';

/** The view switch of the component head: Playground and every view panel (Overview, API, …). */
@Component({
    selector: 'prism-view-tab-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismSegmentedComponent],
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

    protected select(id: string | null): void {
        if (id !== null) this.panelService.activeViewId.set(id);
    }
}
