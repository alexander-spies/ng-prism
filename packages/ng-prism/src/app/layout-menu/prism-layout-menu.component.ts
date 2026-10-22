import { Component, inject, signal } from '@angular/core';
import { PrismLayoutService } from '../services/prism-layout.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';

@Component({
    selector: 'prism-layout-menu',
    standalone: true,
    templateUrl: './prism-layout-menu.component.html',
    styleUrl: './prism-layout-menu.component.css'
})
export class PrismLayoutMenuComponent {
    protected readonly layout = inject(PrismLayoutService);
    /** The dropdown opens out of the navy header band but belongs to the app, so it takes the active theme back. */
    protected readonly theme = inject(PrismThemeService);
    protected readonly open = signal(false);

    protected toggle(target: 'sidebar' | 'toolbar' | 'addons' | 'orientation'): void {
        this.open.set(false);
        switch (target) {
            case 'sidebar':
                this.layout.toggleSidebar();
                break;
            case 'toolbar':
                this.layout.toggleToolbar();
                break;
            case 'addons':
                this.layout.toggleAddons();
                break;
            case 'orientation':
                this.layout.toggleOrientation();
                break;
        }
    }
}
