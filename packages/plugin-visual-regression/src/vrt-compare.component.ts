import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PrismPanelToolbarComponent, PrismSegmentedComponent, type PrismSegmentOption, type PrismTabItem, PrismTabsComponent } from '@ng-prism/core';
import { resolveAssetUrl } from './asset-url.js';
import type { VrtVariantResult } from './visual-regression.types.js';
import { bgChange, shotSurfaceStyle } from './vrt-bg.js';
import { formatPercent } from './vrt-summarize.js';
import { frameWidthStyle, type Zoom, ZOOMS } from './vrt-zoom.js';

type CompareMode = 'wipe' | 'side-by-side' | 'diff';

const MODE_LABEL: Record<CompareMode, string> = {
    wipe: 'Wipe',
    'side-by-side': 'Side by side',
    diff: 'Diff'
};

/**
 * The comparison stage: toolbar, zoom, and the three ways to look at a variant.
 *
 * Owns its own URL resolution and mode state so the panel shell stays a shell.
 * Everything it needs is in the one variant it is handed.
 */
@Component({
    selector: 'prism-vrt-compare',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismPanelToolbarComponent, PrismTabsComponent, PrismSegmentedComponent],
    templateUrl: './vrt-compare.component.html',
    styleUrl: './vrt-compare.component.css'
})
export class VrtCompareComponent {
    readonly variant = input.required<VrtVariantResult>();
    readonly assetBaseUrl = input('');

    protected readonly requestedMode = signal<CompareMode | null>(null);
    protected readonly zoom = signal<Zoom>('fit');
    protected readonly wipe = signal(50);

    protected readonly zoomOptions: PrismSegmentOption[] = ZOOMS.map((z) => ({ value: String(z), label: z === 'fit' ? 'Fit' : `${z}×` }));

    protected readonly modeItems = computed<PrismTabItem[]>(() => this.availableModes().map((mode) => ({ id: mode, label: MODE_LABEL[mode] })));

    protected selectMode(id: string | null): void {
        const mode = this.availableModes().find((m) => m === id);

        if (mode) this.requestedMode.set(mode);
    }

    protected selectZoom(value: string | null): void {
        const zoom = ZOOMS.find((z) => String(z) === value);

        if (zoom !== undefined) this.zoom.set(zoom);
    }

    /** Size, changed pixels, ratio and ground of the capture: the toolbar's former meta line, as a tooltip. */
    protected readonly metaTitle = computed(() => {
        const v = this.variant();
        const parts: string[] = [];

        if (v.width && v.height) parts.push(`${v.width} × ${v.height}`);
        if (v.diffPixels !== undefined) parts.push(`${v.diffPixels.toLocaleString()} px changed`);
        if (v.diffRatio !== undefined) parts.push(`${this.percent(v.diffRatio)} diff`);
        if (v.bg) parts.push(`captured on ${v.bg}`);
        return parts.join(' · ');
    });

    private readonly baselineUrl = computed(() => resolveAssetUrl(this.assetBaseUrl(), this.variant().baselinePath));
    private readonly currentUrl = computed(() => resolveAssetUrl(this.assetBaseUrl(), this.variant().currentPath));
    protected readonly diffUrl = computed(() => resolveAssetUrl(this.assetBaseUrl(), this.variant().diffPath));

    /**
     * The two images to compare.
     *
     * `currentPath` is optional in the report, so the right-hand side falls back
     * to the diff mask. Below that the viewer degrades to a single image.
     */
    protected readonly images = computed(() => {
        const left = this.baselineUrl();
        const right = this.currentUrl() ?? this.diffUrl();

        if (!left || !right) return null;
        return {
            left,
            leftLabel: 'Baseline',
            right,
            rightLabel: this.currentUrl() ? 'Current' : 'Diff'
        };
    });

    /**
     * The surface each capture sits on; see {@link shotSurfaceStyle}.
     *
     * The baseline falls back to this run's background: when it did not move the
     * two are the same, and when it did, `baselineBg` is what records the move.
     */
    protected readonly currentSurface = computed(() => shotSurfaceStyle(this.variant().bg));

    protected readonly baselineSurface = computed(() => shotSurfaceStyle(this.variant().baselineBg ?? this.variant().bg));

    /** A background move between baseline and this run; see {@link bgChange}. */
    protected readonly bgMove = computed(() => bgChange(this.variant()));

    protected readonly singleImage = computed(() => {
        if (this.images()) return null;
        const baseline = this.baselineUrl();
        const only = baseline ?? this.currentUrl() ?? this.diffUrl();

        if (!only) return null;

        // The caption follows which URL actually won, never the status alone.
        // `new` promises there is no baseline, but a row that carries one anyway
        // (a baseline accepted after a run that recorded no current capture)
        // would otherwise show the baseline image labelled "Current".
        const showingBaseline = Boolean(baseline);
        const isNew = this.variant().status === 'new' && !showingBaseline;

        return {
            src: only,
            surface: showingBaseline ? this.baselineSurface() : this.currentSurface(),
            label: isNew ? 'Current' : showingBaseline ? 'Baseline' : 'Recorded image',
            title: isNew ? 'No baseline yet.' : 'Only one image recorded.',
            note: isNew ? 'Nothing to compare against. This is what the runner captured.' : 'The report recorded only one image for this variant.'
        };
    });

    protected readonly availableModes = computed<CompareMode[]>(() => {
        if (this.variant().status === 'excluded') return [];
        if (!this.images()) return [];

        // Wiping between two images of different sizes overlays pixels that do not
        // correspond, so a resized variant leads with side-by-side. Wipe stays
        // available: it is a poor comparison there, not a forbidden one.
        const modes: CompareMode[] = this.variant().status === 'size-mismatch' ? ['side-by-side', 'wipe'] : ['wipe', 'side-by-side'];

        // Only a distinct diff mask gets its own tab; when it is already the
        // right-hand image, a "Diff" button would just repeat the comparison.
        if (this.diffUrl() && this.currentUrl()) modes.push('diff');
        return modes;
    });

    protected readonly activeMode = computed<CompareMode>(() => {
        const available = this.availableModes();
        const requested = this.requestedMode();

        return requested && available.includes(requested) ? requested : (available[0] ?? 'wipe');
    });

    /** Fixed zoom steps need a natural width to multiply; `fit` does not. */
    protected readonly canZoom = computed(() => typeof this.variant().width === 'number');

    /**
     * An excluded variant has no modes, no measurements and nothing to zoom, so
     * the bar would render as a bare rule above the note explaining why.
     */
    protected readonly showToolbar = computed(() => {
        const variant = this.variant();

        return this.availableModes().length > 0 || this.canZoom() || variant.diffPixels !== undefined || variant.diffRatio !== undefined;
    });

    /** Width declarations for the frame; see {@link frameWidthStyle}. */
    protected readonly frameStyle = computed(() => {
        const { width, height } = this.variant();

        return frameWidthStyle(width, height, this.zoom());
    });

    protected percent(ratio: number): string {
        return formatPercent(ratio);
    }
}
