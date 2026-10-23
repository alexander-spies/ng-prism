import type { InjectionToken, InputSignalWithTransform, Provider } from '@angular/core';
import type { CanvasBg } from '../shared/canvas-bg.type.js';
import type { CanvasLayout } from '../shared/canvas-layout.type.js';
import type { ForcedPseudoStates } from '../shared/pseudo-state.type.js';

export type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';

/**
 * The object form of `ShowcaseConfig.host`: an Angular component whose element a directive renders on. Exported
 * since 22.7.0.
 */
export interface DirectiveHost {
    /** The component's element, e.g. `'lib-button'`. */
    selector: string;
    /** The component's class, which the generated host imports: its exported name and its module. */
    import: { name: string; from: string };
    /** Static inputs of the component, written as attributes on its element. */
    inputs?: Record<string, unknown>;
}

/**
 * A class that the templates of a showcase use and ng-prism cannot find in the library on its own, listed in
 * `ShowcaseConfig.imports`. Strings, not a class reference, so that `ng-prism-strip` leaves no import behind in the
 * published library. Since 22.7.0.
 */
export interface ShowcaseImport {
    /** Exported name, e.g. `'CdkTextareaAutosize'`. */
    name: string;
    /** Module specifier, e.g. `'@angular/cdk/text-field'`. */
    from: string;
}

/**
 * The markup the showcased component or directive renders in, compiled as an Angular template: the element that
 * matches its selector is the subject. Since 22.7.0.
 */
export interface HostTemplate {
    template: string;
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

/**
 * A function or injection token that configures a service or pipe, listed in
 * `ShowcaseConfig.setup`. ng-prism only reads its name, signature and type.
 */
export type ShowcaseSetupRef = ((...args: never[]) => unknown) | InjectionToken<unknown>;

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
     * 'Directives' for a `@Directive`, 'Services' for a service, 'Pipes' for a
     * pipe, otherwise 'Components'. Free-form string: any value creates a new
     * top-level section (e.g. 'Forms', 'Utilities').
     */
    section?: string;
    /**
     * Sort order of this section in the sidebar (lower = higher in list).
     * The section's effective order is the minimum `sectionOrder` of all its items.
     * Defaults: 'Components' 0, 'Directives' 10, 'Services' 20, 'Pipes' 30, all others 100.
     */
    sectionOrder?: number;
    /** Predefined variants shown as tabs. Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0. */
    variants?: Variant<T>[];
    /**
     * Named pseudo-state combinations, e.g. `{ name: 'Hover', pseudo: { hover: '.btn' } }`.
     * Each one is combined with every variant and forced where it fits, so the Overview shows
     * a column per state and a variant can be viewed in any of them. A variant opts out with
     * `states: false`.
     * Not combinable with `renderPage`: a component page has no Overview.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
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
     * Services and pipes only: the functions and tokens that configure the service
     * or pipe, for example `provideToasts` and `TOAST_CONFIG`. The styleguide
     * documents them next to the service or pipe. A function, not a list, so that
     * a service and its `provide*` function can live in files that import each
     * other without the list reading a binding that is not initialised yet.
     * ng-prism never calls it. Since 22.7.0.
     */
    setup?: () => readonly ShowcaseSetupRef[];
    /**
     * Recommended canvas background for this component. Applied when the user
     * opens the component, unless a variant defines its own `bg`. The user
     * can override via the canvas toolbar; the override is transient and
     * resets when switching variants or components.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
     */
    bg?: CanvasBg;
    /**
     * Canvas layout mode for the rendered component.
     * - `'fit'` (default): wrapper shrinks to content, component is centered in the canvas.
     * - `'stretch'`: wrapper takes full canvas width (up to a sensible max) so block-level
     *   components without intrinsic width (e.g. horizontal dividers) and components that
     *   opt into `width: 100%` (e.g. full-width buttons) render correctly.
     * A `Variant.canvasLayout` overrides this.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
     */
    canvasLayout?: CanvasLayout;
    /**
     * Host element for directive showcases. String = HTML element (e.g. '<button class="btn">'), object = Angular component.
     * A string or an object has no effect on a component: the scan drops it with a warning.
     * `{ template }` is an Angular template the subject renders in, for a component or a directive; the element that
     * matches the subject's selector is the subject, and `prism-subject` names it where several match. A
     * `Variant.host` overrides it for that variant. Since 22.7.0.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
     */
    host?: string | DirectiveHost | HostTemplate;
    /**
     * What the templates of this showcase (`Variant.template`, `host: { template }`) use that ng-prism does not find
     * in the library by itself: a class from a third-party package, a pipe or directive from Angular. Library classes
     * that the template names are imported without being listed. Since 22.7.0.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
     */
    imports?: ShowcaseImport[];
    /**
     * Title of a registered ComponentPage to render instead of the component itself. Use for complex components that need template projections or mock data. The page component can inject PrismRendererService to react to control panel changes.
     * Not for services or pipes: it still keeps an `@Injectable`, `@Service` or `@Pipe` class a component, deprecated since 22.7.0, removed in 23.0.0.
     */
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
    /**
     * Angular template, compiled as the content of the showcased component or directive: a component gets it projected
     * into its `<ng-content>` slots by Angular's own selector matching, a directive renders it inside its host element.
     * The counterpart of `content`, which stays HTML. Set together with `content`, it wins and `content` is dropped
     * with a diagnostic. Since 22.7.0.
     */
    template?: string;
    /** The template the subject renders in for this variant. Overrides `ShowcaseConfig.host`. Since 22.7.0. */
    host?: HostTemplate;
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
     * - A selector, or a list of them: only on the matching elements, resolved against what is rendered: the host and
     *   everything inside it, or the whole composition for a variant with a `template` or a host template.
     *
     * The component's own CSS applies: every selector using the pseudo-class is widened to also match a stand-in class on the targeted elements.
     */
    pseudo?: ForcedPseudoStates;
    /** `false` keeps this variant out of every combination with the component's `states`: it renders in its own pseudo states only, as a single cell in the Overview. */
    states?: false;
}
