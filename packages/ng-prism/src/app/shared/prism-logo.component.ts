import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_MARK_FACETS, BRAND_MARK_GRADIENTS, BRAND_MARK_VIEWBOX, type BrandMarkFacet } from './brand-mark.js';

let nextInstance = 0;

const [, , VIEW_W, VIEW_H] = BRAND_MARK_VIEWBOX.split(' ').map(Number);

/**
 * The ng-prism symbol, drawn inline.
 *
 * Inline rather than an `<img>` so it needs no asset path in a consuming app,
 * and with its gradient ids prefixed per instance: SVG ids are document-global,
 * and the header and the sidebar footer show the mark at the same time.
 */
@Component({
    selector: 'prism-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-logo.component.html',
    styleUrl: './prism-logo.component.css'
})
export class PrismLogoComponent {
    /** Rendered height in px; the width follows the mark's proportions. */
    readonly size = input(24);
    /** Decorative by default; otherwise the mark is announced as "ng-prism". */
    readonly decorative = input(true);

    protected readonly uid = `ngp-logo-${nextInstance++}-`;
    protected readonly viewBox = BRAND_MARK_VIEWBOX;
    protected readonly gradients = BRAND_MARK_GRADIENTS;
    protected readonly facets = BRAND_MARK_FACETS;
    protected readonly width = computed(() => (this.size() * VIEW_W) / VIEW_H);

    protected fill(facet: BrandMarkFacet): string {
        return facet.gradient ? `url(#${this.uid}${facet.gradient})` : (facet.colour ?? 'currentColor');
    }
}
