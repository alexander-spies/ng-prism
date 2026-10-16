import type { Provider, Type } from '@angular/core';
import type { CanvasBg } from '../shared/canvas-bg.type.js';
import type { StyleguidePage } from './page.types.js';

export interface NgPrismPlugin {
    /** Unique plugin name, used for debugging and conflict detection */
    name: string;

    // Build-time hooks (run inside the Angular builder / Node.js)
    onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void | Promise<ScannedComponent | void>;
    onPageScanned?: (page: StyleguidePage) => StyleguidePage | void | Promise<StyleguidePage | void>;
    onManifestReady?: (manifest: PrismManifest) => PrismManifest | void | Promise<PrismManifest | void>;

    // Runtime contributions (embedded into the Prism app)
    panels?: PanelDefinition[];
    controls?: ControlDefinition[];
    /** Header widgets rendered in the Prism shell header bar */
    headerWidgets?: HeaderWidgetDefinition[];
    /** Markers contributed to each component's navigation item. */
    navigationDecorations?: NavigationDecorationDefinition[];
    /** Angular standalone component that wraps each rendered component */
    wrapComponent?: Type<unknown>;
}

export interface HeaderWidgetDefinition {
    /** Unique widget id, used for de-duplication and tracking. */
    id: string;
    /** Eager component reference. */
    component?: Type<unknown>;
    /**
     * Lazy-loaded component. Use it when the widget pulls in browser-only or
     * heavy dependencies that should not run at config-load time.
     */
    loadComponent?: () => Promise<Type<unknown>>;
    /** Slot in the header: 'start' renders next to the brand, 'end' next to the existing actions. Default: 'end'. */
    placement?: 'start' | 'end';
    /** Sort order within the same placement (lower = earlier). Default: 0. */
    order?: number;
}

/** A short marker rendered on a panel's tab, usually a count. */
export interface PanelBadge {
    /** Kept to a couple of characters because the tab bar scrolls horizontally. */
    text: string;
    /**
     * Colour role. `default` is the neutral primary tint used for a plain count;
     * the other three carry a judgement and should be reserved for one.
     */
    variant?: 'default' | 'ok' | 'warn' | 'danger';
}

/** What one source has to say about one component in the navigation. */
export interface NavigationDecoration {
    /**
     * Colour role. Only two: an 'ok' state would make the marker
     * permanent, and a marker that is always present stops being a signal.
     */
    variant: 'warn' | 'danger';
    /** One tooltip line for this source, e.g. 'A11y: 2 critical, 1 serious'. */
    label: string;
}

export interface NavigationDecorationDefinition {
    /** Unique id, used for de-duplication when two plugins contribute the same source. */
    id: string;
    /** Icon name from the built-in registry (`ICON_NAMES`). */
    icon: string;
    /**
     * Fixed slot order (lower = further left). The order is part of the reading
     * contract: position alone names the source, so a decoration must not move
     * depending on plugin registration order.
     * Built-in: a11y 10, visual-regression 20, coverage 30.
     */
    order?: number;
    /**
     * The component's standing for this source, or `null` for "nothing worth
     * saying".
     *
     * Called during change detection, so it has to be cheap and pure: read what
     * the component's `meta` already holds, do not fetch and do not inject.
     */
    badge: (component: RuntimeComponent) => NavigationDecoration | null;
}

export interface PanelDefinition {
    id: string;
    label: string;
    /** Angular standalone component for the panel content */
    component?: Type<unknown>;
    /** Lazy-loaded component. Use when the component import would pull in browser-only dependencies (e.g. DomSanitizer) */
    loadComponent?: () => Promise<Type<unknown>>;
    overlayComponent?: Type<unknown>;
    loadOverlayComponent?: () => Promise<Type<unknown>>;
    icon?: string;
    position?: 'bottom' | 'right';
    /** Where this panel appears: 'addon' (bottom/right tabbar) or 'view' (top view toolbar). Default: 'addon' */
    placement?: 'addon' | 'view';
    /** Providers injected into a child EnvironmentInjector scoped to this panel */
    providers?: Provider[];
    /** When provided, the panel tab is only shown if this returns true for the active component */
    isVisible?: (component: RuntimeComponent) => boolean;
    /**
     * When provided, the panel's tab carries this badge for the active
     * component. Return `null` for "nothing worth saying": a badge that is
     * always present stops being a signal.
     *
     * Called during change detection, so it has to be cheap and pure: read what
     * the component's `meta` already holds, do not fetch and do not inject.
     */
    badge?: (component: RuntimeComponent) => PanelBadge | null;
    /**
     * Keep the panel's component instance alive across tab switches.
     * When `true`, the panel is rendered once on first activation and merely hidden
     * (instead of destroyed) when the user switches tabs. Use for panels with
     * expensive setup (iframes, network calls, heavy DOM), e.g. embedded designs,
     * remote previews.
     *
     * Default: `false`.
     */
    keepAlive?: boolean;
}

export interface ControlDefinition {
    /** Returns true if this control should handle the given input */
    matchType: (input: InputMeta) => boolean;
    /** Angular standalone component that renders the control */
    component: Type<unknown>;
}

// --- Manifest types (generated by the builder scanner) ---

export interface PrismManifest {
    components: ScannedComponent[];
    pages?: StyleguidePage[];
    /** Library-wide plugin metadata (e.g. aggregate coverage totals). */
    meta?: Record<string, unknown>;
}

export interface ScannedComponent {
    className: string;
    filePath: string;
    showcaseConfig: import('../decorator/showcase.types.js').ShowcaseConfig;
    inputs: InputMeta[];
    outputs: OutputMeta[];
    componentMeta: {
        selector: string;
        standalone: boolean;
        isDirective: boolean;
    };
    /** Import path for the component's entry point (e.g. 'my-lib/atoms/pill') */
    importPath?: string;
    /**
     * Base classes with source the component extends, nearest first, for a
     * plugin to read what the component inherits. Build time only: the
     * manifest does not carry it.
     */
    baseClasses?: { className: string; filePath: string }[];
    /** Arbitrary plugin metadata */
    meta?: Record<string, unknown>;
}

export interface InputMeta {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'union' | 'array' | 'object' | 'unknown';
    rawType?: string;
    values?: string[];
    defaultValue?: unknown;
    required: boolean;
    doc?: string;
}

export interface OutputMeta {
    name: string;
    doc?: string;
}

// --- Runtime manifest types (post-builder, contains actual class references) ---

export interface RuntimeManifest {
    components: RuntimeComponent[];
    pages?: StyleguidePage[];
    /** Library-wide plugin metadata, mirrored from the build-time PrismManifest. */
    meta?: Record<string, unknown>;
}

export interface RuntimeComponent {
    meta: ScannedComponent;
    type: Type<unknown>;
}

// --- Discovery manifest (the `__PRISM_MANIFEST__` global) ---

/**
 * The shape external tooling reads from `globalThis.__PRISM_MANIFEST__`.
 *
 * A thin, JSON-safe projection of the runtime manifest: enough to enumerate and
 * address every variant, plus the `@Showcase` metadata a tool needs to decide how
 * to treat one. It carries no Angular class references, and `meta` values that
 * cannot survive a structured clone are dropped rather than half-serialised.
 */
export interface DiscoveryManifest {
    components: DiscoveryComponent[];
    pages: DiscoveryPage[];
}

export interface DiscoveryComponent {
    className: string;
    /** `ShowcaseConfig.title`, i.e. the display name, not the class name. */
    title: string;
    variants: DiscoveryVariant[];
    /** Sanitised `ShowcaseConfig.meta`. Omitted when empty. */
    meta?: Record<string, unknown>;
}

export interface DiscoveryVariant {
    name: string;
    /** 0-based index into the `variants` array (the `?variant=` URL value). */
    index: number;
    /**
     * The canvas background this variant renders on, already resolved:
     * `Variant.bg`, else `ShowcaseConfig.bg`, else `DEFAULT_VARIANT_BG`.
     *
     * Always present, because a screenshot runner cannot act on "nothing
     * declared". It is also the background capture mode paints, so the value
     * here and the pixels in the capture agree.
     */
    bg: CanvasBg;
    /** Sanitised `Variant.meta`. Omitted when empty. */
    meta?: Record<string, unknown>;
}

export interface DiscoveryPage {
    title: string;
}

// --- defineConfig types ---

export interface NgPrismConfig {
    plugins?: NgPrismPlugin[];
    pages?: StyleguidePage[];
    /** Providers added to the Prism app bootstrap, for library-wide services */
    appProviders?: Provider[];
    theme?: Record<string, string>;
    darkTheme?: Record<string, string>;
    lightTheme?: Record<string, string>;
    logo?: {
        light?: string;
        dark?: string;
    };
    title?: string;
    subtitle?: string;
    themeStylesheet?: string;
    ui?: {
        header?: Type<unknown>;
        sidebar?: Type<unknown>;
        componentHeader?: Type<unknown>;
        renderer?: Type<unknown>;
        controlsPanel?: Type<unknown>;
        eventsPanel?: Type<unknown>;
        footer?: Type<unknown>;
    };
    headless?: boolean;
    appComponent?: Type<unknown>;
    /** When false, disables URL state sync (default: true). */
    urlState?: boolean;
    /** When false, disables sessionStorage state persistence (default: true). */
    persistState?: boolean;
    buildInfo?: {
        version?: string;
        gitHash?: string;
    };
    /** Accessibility (build-time audit + runtime live audit) configuration. */
    a11y?: import('../app/panels/a11y/a11y.types.js').NgPrismA11yConfig;
    /**
     * When true, the build fails instead of warning whenever the scanner has
     * to drop a `@Showcase` value: one it cannot evaluate statically, an
     * invalid `bg`, `status`, `canvasLayout` or `pseudo`, a missing `title`,
     * or the deprecated `providers`, which never reach the styleguide.
     * Default: `false`.
     */
    strictShowcase?: boolean;
}
