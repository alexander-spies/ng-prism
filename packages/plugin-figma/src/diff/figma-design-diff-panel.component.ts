import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { PrismButtonComponent, PrismNavigationService, PrismPanelToolbarComponent, PrismRendererService, type PrismTabItem, PrismTabsComponent } from '@ng-prism/core';
import { FIGMA_PLUGIN_CONFIG } from '../figma-config.token.js';
import { type DiffMode, type DiffResult, type DiffState, extractFileKey, parseFigmaMeta } from './figma-diff.types.js';

@Component({
    selector: 'prism-figma-design-diff-panel',
    standalone: true,
    imports: [PrismPanelToolbarComponent, PrismTabsComponent, PrismButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './figma-design-diff-panel.component.html',
    styleUrl: './figma-design-diff-panel.component.css'
})
export class FigmaDesignDiffPanelComponent {
    private readonly config = inject(FIGMA_PLUGIN_CONFIG);
    private readonly nav = inject(PrismNavigationService);
    private readonly renderer = inject(PrismRendererService);

    readonly activeComponent = input<unknown>(null);

    protected readonly state = signal<DiffState>({ status: 'idle' });
    protected readonly activeMode = signal<DiffMode>('side-by-side');
    protected readonly overlayOpacity = signal(50);

    protected readonly modes: { value: DiffMode; label: string }[] = [
        { value: 'side-by-side', label: 'Side by side' },
        { value: 'overlay', label: 'Overlay' },
        { value: 'diff-only', label: 'Diff' }
    ];

    protected readonly modeItems: PrismTabItem[] = this.modes.map((m) => ({ id: m.value, label: m.label }));

    protected selectMode(id: string | null): void {
        const mode = this.modes.find((m) => m.value === id);

        if (mode) this.activeMode.set(mode.value);
    }

    protected readonly doneResult = computed<DiffResult | null>(() => {
        const s = this.state();

        return s.status === 'done' ? s.result : null;
    });

    protected readonly similarity = computed(() => {
        const r = this.doneResult();

        return r ? r.similarity.toFixed(1) : '0';
    });

    protected readonly errorMessage = computed(() => {
        const s = this.state();

        return s.status === 'error-api' ? s.message : '';
    });

    protected readonly activeVariantMeta = computed(() => {
        const comp = this.nav.activeComponent();

        if (!comp) return null;
        const variants = comp.meta.showcaseConfig.variants;
        const idx = this.renderer.activeVariantIndex();
        const variantFigma = variants?.[idx]?.meta?.['figma'];

        if (variantFigma !== undefined) return parseFigmaMeta(variantFigma);
        return parseFigmaMeta(comp.meta.showcaseConfig.meta?.['figma']);
    });

    protected runDiff(): void {
        if (!this.config.accessToken) {
            this.state.set({ status: 'error-no-token' });
            return;
        }

        const meta = this.activeVariantMeta();

        if (!meta) {
            this.state.set({ status: 'error-no-node' });
            return;
        }

        const fileKey = extractFileKey(meta.url);

        if (!fileKey) {
            this.state.set({ status: 'error-api', message: 'Ungültige Figma-URL' });
            return;
        }

        this.state.set({ status: 'loading' });
        this.executeDiff(fileKey, meta.nodeId);
    }

    private async executeDiff(fileKey: string, nodeId: string): Promise<void> {
        try {
            const [{ computeDesignDiff }, { captureDomElement }, { fetchFigmaImage }] = await Promise.all([
                import('./design-diff.engine.js'),
                import('./component-screenshot.service.js'),
                import('./figma-api.service.js')
            ]);

            const element = this.renderer.renderedElement() as HTMLElement | null;
            const [componentCanvas, figmaBlob] = await Promise.all([captureDomElement(element), fetchFigmaImage(fileKey, nodeId, this.config.accessToken!)]);

            const result = await computeDesignDiff(componentCanvas, figmaBlob);

            this.state.set({ status: 'done', result });
        } catch (err) {
            this.state.set({
                status: 'error-api',
                message: err instanceof Error ? err.message : 'Unbekannter Fehler'
            });
        }
    }
}
