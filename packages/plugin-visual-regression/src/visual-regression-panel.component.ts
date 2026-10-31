import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PrismBadgeComponent, PrismListRowComponent } from '@ng-prism/core';
import type { VrtComponentMeta, VrtVariantResult } from './visual-regression.types.js';
import { VrtCompareComponent } from './vrt-compare.component.js';
import { defaultExpandedGroups, formatPercent, groupRows, rowKey, rowLabel, statusBadge, summarize, summaryTitle, type VrtGroupKey } from './vrt-summarize.js';

@Component({
    selector: 'prism-visual-regression-panel',
    standalone: true,
    imports: [VrtCompareComponent, PrismListRowComponent, PrismBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './visual-regression-panel.component.html',
    styleUrl: './visual-regression-panel.component.css'
})
export class VisualRegressionPanelComponent {
    readonly activeComponent = input<unknown>(null);

    protected readonly selectedKey = signal<string | null>(null);

    protected readonly meta = computed<VrtComponentMeta | null>(() => {
        const comp = this.activeComponent() as {
            meta?: { showcaseConfig?: { meta?: Record<string, unknown> } };
        } | null;

        return (comp?.meta?.showcaseConfig?.meta?.['visualRegression'] as VrtComponentMeta | undefined) ?? null;
    });

    protected readonly assetBaseUrl = computed(() => this.meta()?.assetBaseUrl ?? '');

    private readonly variants = computed(() => this.meta()?.variants ?? []);

    protected readonly summary = computed(() => summarize(this.variants()));

    /** The status breakdown, as the list headings' tooltip. */
    protected readonly breakdown = computed(() => summaryTitle(this.summary()));

    protected readonly rows = computed(() =>
        this.variants().map((variant) => ({
            key: rowKey(variant),
            variant,
            status: variant.status,
            label: rowLabel(variant),
            badge: statusBadge(variant.status),
            diffLabel: formatDiff(variant)
        }))
    );

    protected readonly groups = computed(() => groupRows(this.rows()));

    /**
     * Which groups the reader has opened.
     *
     * `null` means "nobody has touched this yet", which is what lets the default
     * follow the data: shut while something needs review, the first group open
     * when nothing does. A plain set initialised once would freeze the first
     * component's answer and apply it to every component after it.
     */
    private readonly expanded = signal<ReadonlySet<VrtGroupKey> | null>(null);

    private readonly expandedGroups = computed<ReadonlySet<VrtGroupKey>>(() => this.expanded() ?? new Set(defaultExpandedGroups(this.groups())));

    protected isExpanded(key: VrtGroupKey): boolean {
        return this.expandedGroups().has(key);
    }

    protected toggleGroup(key: VrtGroupKey): void {
        const next = new Set(this.expandedGroups());

        if (!next.delete(key)) next.add(key);
        this.expanded.set(next);
    }

    protected readonly selected = computed<VrtVariantResult | null>(() => {
        const rows = this.rows();

        if (!rows.length) return null;
        const key = this.selectedKey();

        // Default to the first variant that actually changed, since that is what someone
        // opening this panel came to look at.
        return rows.find((r) => r.key === key)?.variant ?? rows.find((r) => r.variant.status === 'changed')?.variant ?? rows[0].variant;
    });
}

function formatDiff(variant: VrtVariantResult): string {
    if (variant.diffRatio === undefined) return '—';
    return formatPercent(variant.diffRatio);
}
