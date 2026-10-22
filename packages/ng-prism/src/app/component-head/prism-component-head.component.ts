import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ComponentStatus } from '../../decorator/showcase.types.js';
import type { NgPrismConfig, RuntimeManifest } from '../../plugin/plugin.types.js';
import { A11yAuditService } from '../panels/a11y/a11y-audit.service.js';
import { resolveA11yThresholds } from '../panels/a11y/a11y-thresholds.js';
import type { A11yManifestMeta } from '../panels/a11y/a11y.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismBadgeComponent } from '../shared/prism-badge.component.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { headMetrics } from './head-metrics.js';
import { pipeFacts } from './pipe-facts.js';
import { PrismHeadGaugeComponent } from './prism-head-gauge.component.js';
import { PrismHeadInfoComponent } from './prism-head-info.component.js';
import { serviceFacts } from './service-facts.js';

interface StatusBadge {
    label: string;
    tooltip: string;
    tone: 'success' | 'warn' | 'danger';
}

const STATUS_BADGES: Record<ComponentStatus, StatusBadge> = {
    stable: {
        label: 'Stable',
        tooltip: 'Migrated and production-ready',
        tone: 'success'
    },
    beta: {
        label: 'Beta',
        tooltip: 'Beta: API may change',
        tone: 'warn'
    },
    wip: {
        label: 'Work in progress',
        tooltip: 'Migration in progress',
        tone: 'warn'
    },
    deprecated: {
        label: 'Deprecated',
        tooltip: 'Deprecated / Legacy. Do not use in new code',
        tone: 'danger'
    }
};

@Component({
    selector: 'prism-component-head',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismHeadInfoComponent, PrismHeadGaugeComponent, PrismBadgeComponent],
    templateUrl: './prism-component-head.component.html',
    styleUrl: './prism-component-head.component.css'
})
export class PrismComponentHeadComponent {
    private readonly navigationService = inject(PrismNavigationService);
    private readonly auditService = inject(A11yAuditService);
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);

    protected readonly comp = computed(() => this.navigationService.activeComponent());
    protected readonly service = computed(() => this.navigationService.activeService());
    protected readonly pipe = computed(() => this.navigationService.activePipe());

    /** What the head introduces: the active component or, on a service or pipe page, the service or the pipe. */
    protected readonly subject = computed(() => this.comp()?.meta ?? this.service()?.meta ?? this.pipe()?.meta ?? null);

    protected readonly category = computed(() => this.subject()?.showcaseConfig.category ?? 'Uncategorized');

    /** The selector of a component. A service or a pipe has none. */
    protected readonly selector = computed(() => this.comp()?.meta.componentMeta.selector);

    /** A pipe is used in a template as `| name`, so that is what its code block shows. */
    protected readonly code = computed(() => {
        const p = this.pipe();

        return p ? `| ${p.meta.pipeName}` : undefined;
    });

    protected readonly facts = computed(() => {
        const s = this.service();

        if (s) return serviceFacts(s.meta.provision, s.meta.importPath);
        const p = this.pipe();

        return p ? pipeFacts(p.meta.pure, p.meta.importPath) : [];
    });

    protected readonly variantCount = computed(() => {
        const c = this.comp();

        return c?.meta.showcaseConfig.variants?.length ?? 0;
    });

    protected readonly stateCount = computed(() => {
        const c = this.comp();

        return c?.meta.showcaseConfig.states?.length ?? 0;
    });

    protected readonly status = computed<ComponentStatus | undefined>(() => this.subject()?.showcaseConfig.status);

    protected readonly statusBadge = computed<StatusBadge | null>(() => {
        const s = this.status();

        return s ? STATUS_BADGES[s] : null;
    });

    /**
     * The configured a11y thresholds, resolved the way the panel host and the
     * header badge resolve them, so the gauge grades the live audit on the
     * same scale as the tab and the sidebar.
     */
    private readonly a11yThresholds = computed(() => {
        const meta = this.manifest.meta?.['a11y'] as A11yManifestMeta | undefined;

        return resolveA11yThresholds({ ...meta?.thresholds, ...this.config.a11y?.thresholds });
    });

    /** The full metric list for the gauge, in source order. */
    protected readonly metrics = computed(() =>
        headMetrics({
            meta: this.componentMeta(),
            a11y: this.auditService.scoreResult(),
            a11yThresholds: this.a11yThresholds()
        })
    );

    private readonly componentMeta = computed(() => {
        const c = this.comp();
        const meta = c?.meta.showcaseConfig.meta;

        return meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : null;
    });
}
