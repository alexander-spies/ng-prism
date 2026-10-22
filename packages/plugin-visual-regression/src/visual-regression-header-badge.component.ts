import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismMetricBadgeComponent } from '@ng-prism/core';
import { PRISM_MANIFEST } from '@ng-prism/core/plugin';
import type { RuntimeManifest } from '@ng-prism/core/plugin';
import { vrtLibraryTone } from './thresholds.js';
import type { VrtManifestMeta } from './visual-regression.types.js';

@Component({
    selector: 'prism-visual-regression-header-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricBadgeComponent],
    templateUrl: './visual-regression-header-badge.component.html'
})
export class VisualRegressionHeaderBadgeComponent {
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);

    protected readonly data = computed(() => {
        const meta = this.manifest.meta?.['visualRegression'] as VrtManifestMeta | undefined;

        if (!meta?.found || !meta.total) return null;

        const { total, thresholds } = meta;
        const variant = vrtLibraryTone(total.score, thresholds);

        // `new` and `excluded` stay out of the headline counts: neither
        // has regressed, so both are reported but never framed as a fault.
        const parts = [
            `Visual regression: ${total.score}% unchanged (target ${thresholds.score}%)`,
            `${total.unchanged} unchanged · ${total.changed} changed · ${total.sizeMismatch} resized`,
            `${total.new} new (no baseline yet)`
        ];

        if (total.excluded) parts.push(`${total.excluded} excluded`);
        parts.push(`${total.auditedVariants} variants across ${total.auditedComponents} components`);

        return { score: total.score, variant, title: parts.join('\n') };
    });
}
