import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    Injector,
    input,
    reflectComponentType,
    untracked,
    viewChild,
    ViewContainerRef
} from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { resolveVariantBg } from '../../shared/variant-bg.js';
import { CANVAS_BG_STYLES } from '../canvas/canvas-bg.styles.js';
import { buildKnownInputs } from '../renderer/known-inputs.js';
import { parseContentToNodes } from '../renderer/projectable-content.js';
import { PrismPseudoStateService } from '../services/prism-pseudo-state.service.js';
import { computeVariantState } from '../services/prism-renderer.service.js';

/**
 * One frame of the contact sheet: a stage painting the variant's declared
 * background, with the variant's own instance on it and a caption beneath.
 *
 * It shares none of the Playground's bookkeeping. Output
 * subscriptions, `renderedElement`, the `prism:render:*` marks, the renderer
 * hooks and `data-prism-rendered` all describe *one* rendered thing; n cells
 * writing to any of them would corrupt what they mean. `data-prism-rendered`
 * matters most: it is the selector external screenshot runners key on (see
 * `docs/guide/external-tooling.md`), and this component never emits it.
 *
 * Forced pseudo states are the variant's own, applied by a marker of the
 * cell's own, so a hovered cell never hovers its neighbour. The tools menu's
 * state toggle does not reach here: like every other control, it belongs to
 * the Playground.
 */
@Component({
    selector: 'prism-overview-cell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'listitem',
        '[attr.data-wide]': "isWide() ? '' : null"
    },
    templateUrl: './prism-overview-cell.component.html',
    styleUrl: './prism-overview-cell.component.css',
    styles: [CANVAS_BG_STYLES]
})
export class PrismOverviewCellComponent {
    readonly component = input.required<RuntimeComponent>();
    readonly index = input.required<number>();

    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly pseudoMarker = inject(PrismPseudoStateService).createMarker();
    private readonly outlet = viewChild.required('outlet', {
        read: ViewContainerRef
    });

    /** Never null: `resolveVariantBg` falls back to `DEFAULT_VARIANT_BG`. */
    protected readonly bg = computed(() => resolveVariantBg(this.component().meta.showcaseConfig, this.index()));

    protected readonly caption = computed(() => {
        const variant = this.component().meta.showcaseConfig.variants?.[this.index()];
        const number = String(this.index() + 1).padStart(2, '0');

        // Defensive, not reachable today: `Variant.name` is required
        // (decorator/showcase.types.ts) and `prism-overview` only ever creates a
        // cell for an index it just read out of that same `variants` array. A
        // bare `07` would only appear if those two facts stopped lining up, i.e. the
        // grid indexing past the array it iterates, or `name` becoming optional.
        return variant ? `${number} ${variant.name}` : number;
    });

    protected readonly isWide = computed(() => {
        const config = this.component().meta.showcaseConfig;
        const variant = config.variants?.[this.index()];

        return (variant?.canvasLayout ?? config.canvasLayout ?? 'fit') === 'stretch';
    });

    constructor() {
        effect(() => {
            const component = this.component();
            const index = this.index();

            untracked(() => this.mount(component, index));
        });

        this.destroyRef.onDestroy(() => {
            this.pseudoMarker.clear();
            this.outlet().clear();
        });
    }

    // The Playground lets a variant that throws on construction propagate: one
    // broken instance, and the user navigates away from it. The Overview
    // fans instantiation out from one instance to n, all mounted in the same
    // change-detection pass. An uncaught throw here would abort the refresh of
    // every cell after it, so one bad variant would take down the whole sheet
    // instead of just its own cell. Hence: contain here, propagate there.
    private mount(component: RuntimeComponent, index: number): void {
        try {
            this.outlet().clear();

            // No `onUnknownInput` callback: the Playground already warns once per
            // component, and repeating that warning per cell would say the same thing
            // n times.
            const { values, activeContent } = computeVariantState(component, index);

            const injector = Injector.create({
                providers: component.meta.showcaseConfig.providers ?? [],
                parent: this.injector
            });
            const projectableNodes = activeContent ? parseContentToNodes(activeContent, reflectComponentType(component.type)?.ngContentSelectors ?? []) : undefined;

            const ref = this.outlet().createComponent(component.type, {
                injector,
                projectableNodes
            });

            const knownInputs = buildKnownInputs(component);

            for (const [key, value] of Object.entries(values)) {
                if (!knownInputs.has(key)) continue;
                ref.setInput(key, value);
            }
            ref.changeDetectorRef.detectChanges();
            this.pseudoMarker.apply(ref.location.nativeElement, component.meta.showcaseConfig.variants?.[index]?.pseudo);
        } catch (error) {
            // `createComponent` attaches the host element and its structural DOM
            // synchronously; a throw almost always comes from `detectChanges` right
            // above, i.e. from a template expression or a lifecycle hook running
            // *after* that attach. So there is usually a half-built subtree sitting
            // in the outlet by the time we get here, and clearing it is what makes
            // a caught cell actually show an empty stage with its caption still in
            // place, which shows "this variant failed" instead of a broken grid
            // with no indication of which cell caused it.
            this.pseudoMarker.clear();
            this.outlet().clear();
            console.error(`[ng-prism] Variant ${index} of ${component.meta.className} failed to render:`, error);
        }
    }
}
