import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_IMAGE_DATA_URI, BRAND_IMAGE_HEIGHT, BRAND_IMAGE_WIDTH } from './brand-image.js';

/** A CSS `url()` of the symbol. The data URI is percent-encoded, so it holds no double quote. */
const BRAND_IMAGE_URL = `url("${BRAND_IMAGE_DATA_URI}")`;

/**
 * The ng-prism symbol.
 *
 * Drawn as a background image from a data URI, so it needs no asset path in a
 * consuming app. A background rather than an `<img>`, because Angular sanitizes
 * an SVG data URI in `src` away, while style bindings are not sanitized.
 */
@Component({
    selector: 'prism-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-logo.component.html',
    styleUrl: './prism-logo.component.css'
})
export class PrismLogoComponent {
    /** Rendered height in px; the width follows the symbol's proportions. */
    readonly size = input(24);
    /** Decorative by default; otherwise the symbol is announced as "ng-prism". */
    readonly decorative = input(true);

    protected readonly image = BRAND_IMAGE_URL;
    protected readonly width = computed(() => (this.size() * BRAND_IMAGE_WIDTH) / BRAND_IMAGE_HEIGHT);
}
