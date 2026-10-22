import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';

@Component({
    selector: 'prism-view-tab-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-view-tab-bar.component.html',
    styleUrl: './prism-view-tab-bar.component.css'
})
export class PrismViewTabBarComponent {
    protected readonly panelService = inject(PrismPanelService);
    protected readonly navigationService = inject(PrismNavigationService);

    protected readonly viewPanels = this.panelService.visibleViewPanels;
}
