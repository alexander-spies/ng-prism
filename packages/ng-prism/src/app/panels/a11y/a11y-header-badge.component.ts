import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { NgPrismConfig, RuntimeManifest } from '../../../plugin/plugin.types.js';
import { PrismMetricBadgeComponent } from '../../shared/prism-metric-badge.component.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../../tokens/prism-tokens.js';
import { deriveA11ySummary } from './a11y-summary.js';
import { resolveA11yThresholds } from './a11y-thresholds.js';
import type { A11yManifestMeta } from './a11y.types.js';

@Component({
    selector: 'prism-a11y-header-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricBadgeComponent],
    templateUrl: './a11y-header-badge.component.html'
})
export class A11yHeaderBadgeComponent {
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);

    protected readonly data = computed(() => {
        const meta = this.manifest.meta?.['a11y'] as A11yManifestMeta | undefined;

        if (!meta?.total) return null;

        const score = meta.total.score;
        const thresholds = resolveA11yThresholds({
            ...meta.thresholds,
            ...this.config.a11y?.thresholds
        });
        // The same rule the tab, the sidebar and the gauge grade with.
        const variant = deriveA11ySummary(meta.total, thresholds).variant;

        return {
            score,
            variant,
            title:
                `Library accessibility score ${score} · target ${thresholds.score}\n` +
                `${meta.total.auditedComponents} components · ${meta.total.auditedVariants} variants\n` +
                `Violations: ${meta.total.critical} critical · ${meta.total.serious} serious · ` +
                `${meta.total.moderate} moderate · ${meta.total.minor} minor`
        };
    });
}
