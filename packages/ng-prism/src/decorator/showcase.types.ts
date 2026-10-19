import type { InputSignalWithTransform, Provider } from '@angular/core';
import type { CanvasBg } from '../shared/canvas-bg.type.js';
import type { CanvasLayout } from '../shared/canvas-layout.type.js';
import type { ForcedPseudoStates } from '../shared/pseudo-state.type.js';

export type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';

export interface DirectiveHost {
    selector: string;
    import: { name: string; from: string };
    inputs?: Record<string, unknown>;
}

// Angular's signal-input brand types are invariant in their type parameters,
// so the filter has to use `any` to match `InputSignal<X>`, `ModelSignal<X>`
// and `InputSignalWithTransform<X, Y>` for arbitrary X/Y. We unwrap to the
// write-side type so consumers can pass transform-input source values (e.g.
// a `string` for an input typed `boolean` behind `booleanAttribute`).
type UnwrapSignalInput<S> = S extends InputSignalWithTransform<any, infer WriteT> ? WriteT : never;

/**
 * Maps a component class `T` to a record of its signal-input properties
 * (`input()`, `input.required()`, `model()`), unwrapping each to its value type.
 * `output()` and other properties are excluded.
 *
 * When `T` is `unknown` (the default, i.e. no generic argument given), falls back
 * to `Record<string, unknown>` so existing call sites without a generic param
 * keep working.
 */
export type InputsOf<T> = [unknown] extends [T]
    ? Record<string, unknown>
    : {
          [K in keyof T as T[K] extends InputSignalWithTransform<any, any> ? K : never]: UnwrapSignalInput<T[K]>;
      };

/**
 * A named combination of forced pseudo states, combined with every variant of
 * the component that does not opt out with `Variant.states: false`, and forced
 * where it fits: only on targets the browser could put into the state.
 */
export interface ShowcaseState {
    /** Column title in the Overview, chip label in the tools menu. Unique within the component. */
    name: string;
    /** Same shape and semantics as `Variant.pseudo`. */
    pseudo: ForcedPseudoStates;
}

export interface ShowcaseConfig<T = unknown> {
    /** Display name in the ng-prism UI */
    title: string;
    /** Description text, Markdown supported */
    description?: string;
    /** Groups the component in the sidebar */
    category?: string;
    /** Controls the order of this category in the sidebar (lower = higher). Categories without this sort alphabetically after ordered ones. */
    categoryOrder?: number;
    /** Controls the order of this component within its category (lower = higher). Components without this sort alphabetically after ordered ones. */
    componentOrder?: number;
    /**
     * Top-level section in the sidebar. Auto-detected if omitted:
     * 'Directives' for a `@Directive`, otherwise 'Components'. Free-form string:
     * any value creates a new top-level section (e.g. 'Pipes', 'Utilities').
     */
    section?: string;
    /**
     * Sort order of this section in the sidebar (lower = higher in list).
     * The section's effective order is the minimum `sectionOrder` of all its items.
     * Defaults: 'Components' 0, 'Directives' 10, all others 100.
     */
    sectionOrder?: number;
    /** Predefined variants shown as tabs */
    variants?: Variant<T>[];
    /**
     * Named pseudo-state combinations, e.g. `{ name: 'Hover', pseudo: { hover: '.btn' } }`.
     * Each one is combined with every variant and forced where it fits, so the Overview shows
     * a column per state and a variant can be viewed in any of them. A variant opts out with
     * `states: false`.
     * Not combinable with `renderPage`: a component page has no Overview.
     *
     * The position in the list identifies a state, so keep the order stable.
     */
    states?: ShowcaseState[];
    /** Tags for search and filtering */
    tags?: string[];
    /**
     * @deprecated Deprecated since 22.4.0, removed in 23.0.0. Never reached
     * the styleguide: providers are classes, factories or instances, which the
     * static manifest cannot hold, so the build drops them with a warning. Use
     * `defineConfig({ appProviders })`, or, for one component, a component
     * page (`renderPage`) that declares them.
     */
    providers?: Provider[];
    /** Arbitrary metadata for plugins (e.g. { figma: 'https://...' }) */
    meta?: Record<string, unknown>;
    /**
     * Recommended canvas background for this component. Applied when the user
     * opens the component, unless a variant defines its own `bg`. The user
     * can override via the canvas toolbar; the override is transient and
     * resets when switching variants or components.
     */
    bg?: CanvasBg;
    /**
     * Canvas layout mode for the rendered component.
     * - `'fit'` (default): wrapper shrinks to content, component is centered in the canvas.
     * - `'stretch'`: wrapper takes full canvas width (up to a sensible max) so block-level
     *   components without intrinsic width (e.g. horizontal dividers) and components that
     *   opt into `width: 100%` (e.g. full-width buttons) render correctly.
     * A `Variant.canvasLayout` overrides this.
     */
    canvasLayout?: CanvasLayout;
    /** Host element for directive showcases. String = HTML element (e.g. '<button class="btn">'), object = Angular component. */
    host?: string | DirectiveHost;
    /** Title of a registered ComponentPage to render instead of the component itself. Use for complex components that need template projections or mock data. The page component can inject PrismRendererService to react to control panel changes. */
    renderPage?: string;
    /**
     * Migration / maturity status. When unset, the component is treated as `stable`
     * but rendered without any indicator in the sidebar or header. Only set it
     * when you want to draw attention (in-progress or deprecated work) or to
     * explicitly badge a `stable` / `beta` component.
     */
    status?: ComponentStatus;
}

export interface Variant<T = unknown> {
    /** Tab label */
    name: string;
    /** Signal input values for this variant. Pass a component type to `@Showcase<MyComponent>` to get autocomplete and type-checking here. */
    inputs?: Partial<InputsOf<T>>;
    /**
     * Content projected into <ng-content>.
     * - string: projected into the default (unnamed) slot
     * - Record<string, string>: keys are slot selectors (e.g. '[card-header]'), 'default' is the unnamed slot
     */
    content?: string | Record<string, string>;
    /** Optional description for this variant */
    description?: string;
    /** Arbitrary metadata for plugins (e.g. { figma: 'https://...?node-id=12-34' }) */
    meta?: Record<string, unknown>;
    /** Recommended canvas background for this variant. Overrides `ShowcaseConfig.bg`. */
    bg?: CanvasBg;
    /** Canvas layout mode for this variant. Overrides `ShowcaseConfig.canvasLayout`. See `ShowcaseConfig.canvasLayout` for semantics. */
    canvasLayout?: CanvasLayout;
    /**
     * Pseudo states forced on while this variant renders, e.g.
     * `{ 'focus-visible': '.btn' }` or `{ hover: true }`.
     * - `true`: the state is forced on every element of the rendered component, the host included.
     * - A selector, or a list of them: only on the matching elements, resolved against the host and everything inside it.
     *
     * The component's own CSS applies: every selector using the pseudo-class is widened to also match a stand-in class on the targeted elements.
     */
    pseudo?: ForcedPseudoStates;
    /** `false` keeps this variant out of every combination with the component's `states`: it renders in its own pseudo states only, as a single cell in the Overview. */
    states?: false;
}
