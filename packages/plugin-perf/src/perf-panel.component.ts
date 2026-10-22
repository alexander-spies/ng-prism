import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PrismButtonComponent, PrismPanelToolbarComponent, type PrismTabItem, PrismTabsComponent } from '@ng-prism/core';
import { BundleSectionComponent } from './bundle/bundle-section.component.js';
import { MemorySectionComponent } from './memory/memory-section.component.js';
import { PerfMemoryService } from './memory/perf-memory.service.js';
import type { BundleMetrics, PerfThresholds } from './perf.types.js';
import { DEFAULT_THRESHOLDS } from './perf.types.js';
import { PerfRenderService } from './render/perf-render.service.js';
import { RenderSectionComponent } from './render/render-section.component.js';

type SubTab = 'bundle' | 'render' | 'memory';

@Component({
    selector: 'prism-perf-panel',
    standalone: true,
    imports: [BundleSectionComponent, RenderSectionComponent, MemorySectionComponent, PrismPanelToolbarComponent, PrismTabsComponent, PrismButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './perf-panel.component.html',
    styleUrl: './perf-panel.component.css'
})
export class PerfPanelComponent {
    readonly activeComponent = input<unknown>(null);

    readonly activeTab = signal<SubTab>('bundle');
    readonly renderService = PerfRenderService.getInstance();
    readonly memoryService = PerfMemoryService.getInstance();

    readonly thresholds: PerfThresholds = DEFAULT_THRESHOLDS;

    protected readonly tabs: PrismTabItem[] = [
        { id: 'bundle', label: 'Bundle' },
        { id: 'render', label: 'Render' },
        { id: 'memory', label: 'Memory' }
    ];

    protected selectTab(id: string | null): void {
        if (id === 'bundle' || id === 'render' || id === 'memory') this.activeTab.set(id);
    }

    /** Recording state and change-detection runs: meta for the tooltip, not for the toolbar. */
    protected readonly profileTitle = computed(() => {
        const parts: string[] = [];

        if (this.renderService.isRecording()) parts.push(`Live · ${this.renderService.sampleCount()} samples`);
        else parts.push('Record render times');
        const cd = this.renderService.cdRunCount();

        if (cd > 0) parts.push(`${cd} change detection runs`);
        return parts.join(' · ');
    });

    captureMemorySnapshots(): void {
        this.memoryService.takeSnapshot('before-create');
        setTimeout(() => this.memoryService.takeSnapshot('after-create'), 50);
    }

    readonly bundleMetrics = computed<BundleMetrics | null>(() => {
        const comp = this.activeComponent() as {
            meta?: {
                showcaseConfig?: { meta?: { perf?: { bundle?: BundleMetrics } } };
            };
        } | null;

        return comp?.meta?.showcaseConfig?.meta?.perf?.bundle ?? null;
    });
}
