import type { ShowcaseConfig } from '../decorator/showcase.types.js';

/** How a service reaches the injector: on its own, or through a providers array. */
export type ServiceProvision = 'auto' | 'manual';

/** Where a panel appears: on component pages, on service pages, on pipe pages, or on several. */
export type PanelTarget = 'component' | 'service' | 'pipe';

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiDocTags {
    deprecated?: string | true;
    since?: string;
    see?: string[];
    example?: string[];
    /** From `@default`. Prose such as "Default `x`." is not read. */
    default?: string;
}

/**
 * A type as written, plus the ids of documented types it mentions.
 *
 * @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release.
 */
export interface ApiTypeRef {
    /** Display text, e.g. `ToastOptions`, `Signal<boolean>`, `number | null`. */
    text: string;
    /** Ids of `ServiceApi.types` entries whose names occur in `text`. Omitted when none. */
    links?: string[];
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiParam {
    name: string;
    type: ApiTypeRef;
    optional: boolean;
    rest?: true;
    /** The initializer as written, e.g. `{}`. */
    defaultValue?: string;
    /** From `@param`. */
    description?: string;
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiMethod {
    name: string;
    params: ApiParam[];
    returnType: ApiTypeRef;
    description?: string;
    tags: ApiDocTags;
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiProperty {
    name: string;
    type: ApiTypeRef;
    readonly: boolean;
    /** `?` on an interface member. */
    optional?: true;
    description?: string;
    tags: ApiDocTags;
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiTypeDoc {
    /** Unique within one service: the name, or `${name}@${importPath}` when two reachable types share a name. */
    id: string;
    name: string;
    kind: 'interface' | 'class' | 'type' | 'enum';
    importPath: string;
    description?: string;
    tags: ApiDocTags;
    /** Interfaces, classes and object-literal type aliases. */
    properties?: ApiProperty[];
    /** Interfaces and classes. */
    methods?: ApiMethod[];
    /** A type alias of a literal union: each member as written, e.g. `'top-left'`. */
    union?: string[];
    /** Any other type alias: the aliased type as written. */
    text?: string;
    /** Enums. */
    members?: { name: string; value?: string; description?: string }[];
    /** Where the type was first reached, e.g. `parameter of show()`, `via options.action`. */
    reachedFrom?: string;
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ApiSetupEntry {
    name: string;
    kind: 'function' | 'token';
    importPath: string;
    description?: string;
    tags: ApiDocTags;
    /** Functions only. */
    params?: ApiParam[];
    returnType?: ApiTypeRef;
    /** Tokens only: `InjectionToken<T>` as written. */
    tokenType?: ApiTypeRef;
    /** The properties of the first parameter's object type (function) or of `T` (token). */
    config?: ApiProperty[];
}

/** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
export interface ServiceApi {
    description?: string;
    tags: ApiDocTags;
    properties: ApiProperty[];
    methods: ApiMethod[];
    setup: ApiSetupEntry[];
    types: ApiTypeDoc[];
}

export interface ScannedService {
    className: string;
    filePath: string;
    /** Import path of the entry point that exports the service. */
    importPath?: string;
    /** Only the fields that apply to services: title, description, category, categoryOrder, componentOrder, section, sectionOrder, tags, meta, status. */
    showcaseConfig: ShowcaseConfig;
    provision: ServiceProvision;
    /** @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release. */
    api: ServiceApi;
    /** Arbitrary plugin metadata */
    meta?: Record<string, unknown>;
}

/** A service in the runtime manifest. Carries data only: the class is never imported into the styleguide. */
export interface RuntimeService {
    meta: ScannedService;
}
