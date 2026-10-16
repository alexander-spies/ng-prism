import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';
import { PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { VIEWPORT_SNAPS } from '../../shared/viewport.type.js';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismPseudoStateService } from '../services/prism-pseudo-state.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';

/**
 * The canvas tools, as a rail floating over the canvas.
 *
 * Things you toggle constantly (guides, rulers, the viewport constraint) get
 * their own button; things you set once (background, forced state, zoom,
 * viewport width) live in the menu. The template is a view rather than a setting and keeps its own
 * button. Zoom and the active viewport width are shown as readouts; the width
 * only appears while the viewport constraint is on.
 *
 * The host generates no box. The rail must be a direct child of
 * `.prism-canvas-wrap` outside the stage, because that is what capture mode's
 * structural rule in `prism-capture.service.ts` hides. A rail nested in the
 * renderer or the stage would end up in every screenshot and corrupt
 * visual-regression baselines.
 */
@Component({
    selector: 'prism-canvas-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-canvas-toolbar.component.html',
    styleUrl: './prism-canvas-toolbar.component.css'
})
export class PrismCanvasToolbarComponent {
    protected readonly canvas = inject(PrismCanvasService);
    protected readonly variantBg = inject(PrismVariantBgService);
    protected readonly pseudoState = inject(PrismPseudoStateService);

    /**
     * The pseudo states the canvas can force, as toggles. Several can be on at
     * once (`:hover` with `:focus-visible`). The active ones carry `is-on`, the
     * ones the variant declares the `is-rec` edge, as in the Canvas group.
     */
    protected readonly states = PSEUDO_STATES;

    protected stateTitle(state: PseudoState): string {
        return this.pseudoState.isDeclared(state) ? `:${state} is forced by this variant` : `Force :${state} on the whole component`;
    }

    /** Angular templates resolve names against the component, not the global scope. */
    protected readonly Math = Math;

    protected setBg(bg: CanvasBg): void {
        if (this.variantBg.recommended() !== null) {
            this.variantBg.setOverride(bg);
        } else {
            this.canvas.setBg(bg);
        }
    }

    /**
     * Every {@link CanvasBg}, taken from the type's canonical list.
     *
     * The group is also a readout: the active button is `effective()` and the
     * recommended one carries the `is-rec` edge. A value missing from the list
     * cannot be shown, so a variant declaring it would leave nothing active.
     *
     * `checker` and `transparent` paint the same checkerboard here, so their
     * titles explain the difference, which only a capture shows. `checker` is
     * deprecated but stays until 23.0.0 because components can still declare it.
     */
    protected readonly bgs = CANVAS_BGS;

    /**
     * What a background means, where the canvas cannot show the difference.
     *
     * Bound with `[attr.title]`, never `[title]`. A property binding assigns to
     * `HTMLElement.title`, a non-nullable DOMString, so the `null` below would
     * be stringified and every unremarkable button would carry a tooltip
     * reading "null" (four of the six in the common case).
     */
    protected bgTitle(bg: CanvasBg): string | null {
        if (this.variantBg.recommended() === bg) {
            return 'Recommended background for this variant';
        }
        if (bg === 'transparent') {
            return 'Checkerboard here, a real alpha channel in a capture';
        }
        if (bg === 'checker') {
            return 'Deprecated: same look as Transparent, but a capture keeps the themed colour';
        }
        return null;
    }
    protected readonly zooms = [
        { value: 0.75, label: '75%' },
        { value: 1, label: '100%' },
        { value: 1.5, label: '150%' },
        { value: 2, label: '200%' }
    ];

    /**
     * The named widths, offered the same way as the zoom chooser.
     *
     * Plain numbers and no device names: this tool narrows a box and simulates
     * nothing, so calling 390 "iPhone" would promise a fidelity it does not have.
     */
    protected readonly viewports = VIEWPORT_SNAPS;

    protected capitalize(s: string): string {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}
