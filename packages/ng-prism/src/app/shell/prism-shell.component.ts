import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, untracked } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { canvasOverlayTokens } from '../canvas/canvas-overlay-tokens.js';
import { PrismCanvasPinRowComponent } from '../canvas/prism-canvas-pin-row.component.js';
import { PrismCanvasToolbarComponent } from '../canvas/prism-canvas-toolbar.component.js';
import { PrismTemplatePopoverComponent } from '../canvas/prism-template-popover.component.js';
import { PrismComponentHeadComponent } from '../component-head/prism-component-head.component.js';
import { PrismResizerDirective } from '../directives/prism-resizer.directive.js';
import { PrismHeaderComponent } from '../header/prism-header.component.js';
import { PrismPageRendererComponent } from '../page-renderer/prism-page-renderer.component.js';
import { PrismPanelHostComponent } from '../panels/panel-host/prism-panel-host.component.js';
import { PrismRendererComponent } from '../renderer/prism-renderer.component.js';
import { PANEL_HEIGHT, PrismLayoutService, SIDEBAR_WIDTH } from '../services/prism-layout.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPersistenceService } from '../services/prism-persistence.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismUrlStateService } from '../services/prism-url-state.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';
import { PrismLogoComponent } from '../shared/prism-logo.component.js';
import { PrismSidebarComponent } from '../sidebar/prism-sidebar.component.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismVariantRibbonComponent } from '../variant-ribbon/prism-variant-ribbon.component.js';
import { nextViewId } from '../view-tab-bar/next-view-id.js';
import { PrismViewPanelHostComponent } from '../view-tab-bar/prism-view-panel-host.component.js';
import { PrismViewTabBarComponent } from '../view-tab-bar/prism-view-tab-bar.component.js';
import { selectInstead } from './select-instead.js';
import { shouldSelectFirst } from './should-select-first.js';

@Component({
    selector: 'prism-shell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        PrismHeaderComponent,
        PrismSidebarComponent,
        PrismComponentHeadComponent,
        PrismVariantRibbonComponent,
        PrismRendererComponent,
        PrismPanelHostComponent,
        PrismPageRendererComponent,
        PrismViewTabBarComponent,
        PrismViewPanelHostComponent,
        PrismResizerDirective,
        PrismCanvasToolbarComponent,
        PrismTemplatePopoverComponent,
        PrismCanvasPinRowComponent,
        PrismLogoComponent
    ],
    templateUrl: './prism-shell.component.html',
    styleUrl: './prism-shell.component.css'
})
export class PrismShellComponent {
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
    protected readonly navigationService = inject(PrismNavigationService);
    private readonly themeService = inject(PrismThemeService);
    protected readonly layout = inject(PrismLayoutService);
    protected readonly sidebarBounds = SIDEBAR_WIDTH;
    protected readonly panelBounds = PANEL_HEIGHT;
    protected readonly panelService = inject(PrismPanelService);
    private readonly urlStateService = inject(PrismUrlStateService);
    private readonly persistenceService = inject(PrismPersistenceService);
    private readonly variantBg = inject(PrismVariantBgService);

    /** Overlays on the canvas follow its ground: light and dark are absolute, the others follow the theme. */
    protected readonly overlayTokens = computed(() => canvasOverlayTokens(this.variantBg.effective()));

    protected readonly viewPanels = this.panelService.visibleViewPanels;

    /** Whether a rebuild took away the item on screen, see `shouldSelectFirst`. */
    private readonly vanished = computed(() =>
        shouldSelectFirst(
            this.navigationService.activeItem(),
            this.navigationService.activeComponent(),
            this.navigationService.activeService(),
            this.navigationService.activePipe(),
            this.navigationService.activePage()
        )
    );

    protected readonly showPanel = computed(() => this.layout.addonsVisible() && this.panelService.activeViewId() === 'renderer' && !this.navigationService.activePage());

    protected readonly shellStyle = computed(() => {
        const sw = this.layout.sidebarVisible() ? this.layout.sidebarWidth() : 0;

        return `--sw: ${sw}px;`;
    });

    constructor() {
        this.themeService.applyConfigOverrides(this.config);
        this.navigationService.selectFirst();
        this.urlStateService.init();
        this.persistenceService.init();

        // The active view must be one the page offers. Every component starts on
        // the Playground (`PrismPanelService.activeViewId`), so what this effect
        // catches is a view the page does not offer: one a URL names, one a
        // panel's `isVisible` turns down, and on a service or pipe page any view
        // that is not theirs, since neither has a Playground to fall back to. The
        // rule itself lives in `nextViewId`, a pure function with its own tests;
        // this effect only reads the signals it needs and applies the result.
        // Not while the item on screen is gone: the effect below picks the next
        // one, and needs the view the reader had for that.
        effect(() => {
            if (this.vanished()) return;

            const target = this.navigationService.activeTarget() ?? 'component';
            const next = nextViewId(this.panelService.activeViewId(), this.panelService.visibleViewPanels(), target);

            if (next !== null) {
                untracked(() => this.panelService.activeViewId.set(next));
            }
        });

        effect(() => {
            const item = this.navigationService.activeItem();

            if (item && this.vanished()) {
                untracked(() => selectInstead(item, this.navigationService, this.panelService));
            }
        });
    }

    @HostListener('document:keydown', ['$event'])
    protected onKeyDown(e: KeyboardEvent): void {
        if (!e.altKey) return;
        switch (e.code) {
            case 'KeyS':
                e.preventDefault();
                this.layout.toggleSidebar();
                break;
            // Alt+T toggles the variant rail only. It used to hide the component
            // head as well, but the head now carries the Playground/API switcher and
            // hiding it would take primary navigation with it.
            case 'KeyT':
                e.preventDefault();
                this.layout.toggleToolbar();
                break;
            case 'KeyA':
                e.preventDefault();
                this.layout.toggleAddons();
                break;
        }
    }
}
