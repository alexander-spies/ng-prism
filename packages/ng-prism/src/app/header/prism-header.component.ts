import { ChangeDetectionStrategy, Component, computed, HostListener, inject } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismLayoutMenuComponent } from '../layout-menu/prism-layout-menu.component.js';
import { BUILTIN_HEADER_WIDGETS } from '../panels/builtin-header-widgets.js';
import { NAV_SCREEN_ID, NAV_TOGGLE_ID } from '../services/mobile-layout.js';
import { PrismMobileLayoutService } from '../services/prism-mobile-layout.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismIconButtonComponent } from '../shared/prism-icon-button.component.js';
import { PrismLogoComponent } from '../shared/prism-logo.component.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { buildInfoLabel, headerBrand } from './header-brand.js';
import { PrismHeaderWidgetHostComponent } from './prism-header-widget-host.component.js';

@Component({
    selector: 'prism-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent, PrismLayoutMenuComponent, PrismHeaderWidgetHostComponent, PrismLogoComponent, PrismIconButtonComponent],
    // The header is a navy brand band in both themes: it renders with the dark
    // token set, which plugin widgets inside it inherit without code of their own.
    host: { '[style]': 'themeService.headerTokens()' },
    templateUrl: './prism-header.component.html',
    styleUrl: './prism-header.component.css'
})
export class PrismHeaderComponent {
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
    private readonly pluginService = inject(PrismPluginService);
    protected readonly searchService = inject(PrismSearchService);
    protected readonly themeService = inject(PrismThemeService);
    protected readonly mobileLayout = inject(PrismMobileLayoutService);
    protected readonly navToggleId = NAV_TOGGLE_ID;
    protected readonly navScreenId = NAV_SCREEN_ID;

    protected readonly widgetsStart = computed(() =>
        [...BUILTIN_HEADER_WIDGETS.filter((w) => w.placement === 'start'), ...this.pluginService.headerWidgetsStart()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );

    protected readonly widgetsEnd = computed(() =>
        [...BUILTIN_HEADER_WIDGETS.filter((w) => (w.placement ?? 'end') === 'end'), ...this.pluginService.headerWidgetsEnd()].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        )
    );

    protected readonly brand = computed(() => headerBrand(this.config));
    protected readonly brandTitle = computed(() => {
        const brand = this.brand();

        return brand.kind === 'title' ? brand.title : null;
    });
    protected readonly subtitle = computed(() => this.config.subtitle ?? null);

    protected readonly buildInfoLabel = computed(() => buildInfoLabel(this.config));

    @HostListener('document:keydown', ['$event'])
    protected onGlobalKey(e: KeyboardEvent): void {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.onSearchFocus();
        }
    }

    protected onSearchFocus(): void {
        // Placeholder, will be wired to the command palette later
    }
}
