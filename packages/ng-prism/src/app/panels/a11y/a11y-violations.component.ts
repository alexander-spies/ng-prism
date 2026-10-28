import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { NgPrismConfig, RuntimeManifest } from '../../../plugin/plugin.types.js';
import { toneForStatus } from '../../shared/badge.types.js';
import { PrismBadgeComponent } from '../../shared/prism-badge.component.js';
import { PrismListRowComponent } from '../../shared/prism-list-row.component.js';
import { PrismMetricCardComponent } from '../../shared/prism-metric-card.component.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../../tokens/prism-tokens.js';
import { A11yAuditService } from './a11y-audit.service.js';
import { byImpact, reviewFindings } from './a11y-findings.js';
import { A11yScoreComponent } from './a11y-score.component.js';
import { deriveA11ySummary } from './a11y-summary.js';
import { resolveA11yThresholds } from './a11y-thresholds.js';
import type { A11yManifestMeta } from './a11y.types.js';
import { severityBadge } from './severity.js';

/**
 * The Violations view: the score as a small metric card with a ring in its
 * grade's tone, the violations as list rows, most severe first, what axe could
 * not decide below them (Needs review, open, not counted), and the passed
 * checks folded away at the end.
 */
@Component({
    selector: 'prism-a11y-violations',
    standalone: true,
    imports: [A11yScoreComponent, PrismBadgeComponent, PrismListRowComponent, PrismMetricCardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-violations.component.html',
    styleUrl: './a11y-violations.component.css'
})
export class A11yViolationsComponent {
    protected readonly auditService = inject(A11yAuditService);
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);

    protected readonly scoreResult = computed(() => this.auditService.scoreResult());

    private readonly thresholds = computed(() => {
        const meta = this.manifest.meta?.['a11y'] as A11yManifestMeta | undefined;

        return resolveA11yThresholds({ ...meta?.thresholds, ...this.config.a11y?.thresholds });
    });

    /** The score's grade, by the rule every other a11y surface uses. */
    protected readonly grade = computed(() => {
        const result = this.scoreResult();

        return result ? deriveA11ySummary(result, this.thresholds()).variant : 'ok';
    });

    protected readonly badgeTone = computed(() => toneForStatus(this.grade()));

    protected readonly scoreTitle = computed(() => {
        const r = this.scoreResult();

        if (!r) return '';
        return (
            `axe-core audit · target ${this.thresholds().score}\n` +
            `${r.critical} critical · ${r.serious} serious · ${r.moderate} moderate · ${r.minor} minor · ${r.passes} passed`
        );
    });

    protected readonly violations = computed(() => {
        const results = this.auditService.results();

        if (!results) return [];
        return [...results.violations].sort(byImpact).map((v) => ({ ...v, badge: severityBadge(v.impact) }));
    });

    protected readonly review = computed(() => reviewFindings(this.auditService.results()?.incomplete ?? []));

    protected readonly passes = computed(() => this.auditService.results()?.passes ?? []);
}
