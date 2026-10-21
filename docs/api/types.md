# Type Reference

All types exported from `ng-prism` or `ng-prism/plugin`.

---

## RuntimeManifest

The in-memory manifest produced after the builder scan and loaded at app bootstrap.

```typescript
interface RuntimeManifest {
    components: RuntimeComponent[];
    services?: RuntimeService[];
    pipes?: RuntimePipe[];
    pages?: StyleguidePage[];
}
```

`services` and `pipes` are only present when the library has [services](guide/showcasing-services.md) or [pipes](guide/showcasing-pipes.md) and a plugin shows them. Neither is ever part of `components`, so code that walks `components` sees the same entries as before they existed.

---

## RuntimeComponent

A single entry in the runtime manifest, combining scan metadata with the actual Angular class reference.

```typescript
interface RuntimeComponent {
    meta: ScannedComponent;
    type: Type<unknown>;
}
```

---

## ScannedComponent

The raw data extracted from a `@Showcase`-annotated component by the TypeScript Compiler API scanner.

```typescript
interface ScannedComponent {
    className: string;
    filePath: string;
    showcaseConfig: ShowcaseConfig;
    inputs: InputMeta[];
    outputs: OutputMeta[];
    componentMeta: {
        selector: string;
        standalone: boolean;
        isDirective: boolean;
    };
    importPath?: string;
    baseClasses?: { className: string; filePath: string }[];
    meta?: Record<string, unknown>;
}
```

| Field                       | Description                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `className`                 | TypeScript class name                                                                               |
| `filePath`                  | Absolute path to the source file                                                                    |
| `showcaseConfig`            | The `ShowcaseConfig` passed to `@Showcase`                                                          |
| `inputs`                    | Array of extracted `InputMeta` for each `input()` signal, base classes included                     |
| `outputs`                   | Array of extracted `OutputMeta` for each `output()` signal, base classes included                   |
| `componentMeta.selector`    | Angular element selector                                                                            |
| `componentMeta.standalone`  | Whether the component is standalone                                                                 |
| `componentMeta.isDirective` | `true` if decorated with `@Directive`, `false` for `@Component`                                     |
| `importPath`                | Entry point import path (e.g. `'my-lib/atoms'` for secondary entry points)                          |
| `baseClasses`               | Base classes with source the component extends, nearest first. Build time only, not in the manifest |
| `meta`                      | Plugin-injected metadata                                                                            |

---

## RuntimeService

A single service in the runtime manifest. It carries data only: the service class is never imported into the styleguide, since the page is documentation and an import would only add bundle size and side effects.

```typescript
interface RuntimeService {
    meta: ScannedService;
}
```

---

## ScannedService

The data the scanner extracts from a `@Showcase`-annotated class with `@Injectable` or `@Service` (since `22.7.0`), see [Showcasing Services](guide/showcasing-services.md). Plugins receive it in [`onServiceScanned`](api/ng-prism-plugin.md#onservicescanned).

```typescript
interface ScannedService {
    className: string;
    filePath: string;
    importPath?: string;
    showcaseConfig: ShowcaseConfig;
    provision: ServiceProvision;
    api: ServiceApi;
    meta?: Record<string, unknown>;
}

type ServiceProvision = 'auto' | 'manual';
```

| Field            | Description                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `className`      | TypeScript class name. It is what `?service=` addresses                                                                                                                                                                       |
| `filePath`       | Absolute path to the source file. Build time use                                                                                                                                                                              |
| `importPath`     | Import path of the entry point that exports the service. Missing when the scanner could not place it                                                                                                                          |
| `showcaseConfig` | The `@Showcase` argument, reduced to the fields that apply to services: `title`, `description`, `category`, `categoryOrder`, `componentOrder`, `section`, `sectionOrder`, `tags`, `meta`, `status`. `setup` is in `api.setup` |
| `provision`      | `'auto'` when Angular provides the service on its own (`@Service()`, `providedIn: 'root'`, `'platform'` or `'any'`), `'manual'` when a providers array has to list it                                                         |
| `api`            | The extracted API, see [`ServiceApi`](#serviceapi). **Experimental**                                                                                                                                                          |
| `meta`           | Plugin-injected metadata                                                                                                                                                                                                      |

`className`, `filePath`, `importPath`, `showcaseConfig`, `provision` and `meta` follow semver as they are. The shape of `api` does not, see below.

---

## ServiceApi

> **Experimental until 23.0.0: the shape may change in a 22.x minor release.** This covers `ServiceApi` and every `Api*` type below it: members, signatures, type cards, setup and the links between them. The first model is deliberately simple, and overloads, generics and statics can be refined in later minors. Read it in a plugin if you must, and expect to adjust it.

The documentation of one service, as the scanner extracts it. The JSDoc plugin draws the service page from it.

```typescript
interface ServiceApi {
    description?: string;
    tags: ApiDocTags;
    properties: ApiProperty[];
    methods: ApiMethod[];
    setup: ApiSetupEntry[];
    types: ApiTypeDoc[];
}

interface ApiDocTags {
    deprecated?: string | true;
    since?: string;
    see?: string[];
    example?: string[];
    default?: string; // from @default
}

interface ApiTypeRef {
    text: string; // as written, e.g. 'Signal<boolean>'
    links?: string[]; // ids of the api.types entries (ServiceApi or PipeApi) named in the text
}

interface ApiParam {
    name: string;
    type: ApiTypeRef;
    optional: boolean;
    rest?: true;
    defaultValue?: string; // the initializer as written
    description?: string; // from @param
}

interface ApiMethod {
    name: string;
    params: ApiParam[];
    returnType: ApiTypeRef;
    description?: string;
    tags: ApiDocTags;
}

interface ApiProperty {
    name: string;
    type: ApiTypeRef;
    readonly: boolean;
    optional?: true;
    description?: string;
    tags: ApiDocTags;
}

interface ApiTypeDoc {
    id: string; // the name, or `${name}@${importPath}` when two reachable types share a name; unique within one service or pipe
    name: string;
    kind: 'interface' | 'class' | 'type' | 'enum';
    importPath: string;
    description?: string;
    tags: ApiDocTags;
    properties?: ApiProperty[]; // interfaces, classes, object type aliases
    methods?: ApiMethod[]; // interfaces and classes
    union?: string[]; // a type alias of literals
    text?: string; // any other type alias
    members?: { name: string; value?: string; description?: string }[]; // enums
    reachedFrom?: string; // e.g. 'parameter of show()', 'via options.action'
}

interface ApiSetupEntry {
    name: string;
    kind: 'function' | 'token';
    importPath: string;
    description?: string;
    tags: ApiDocTags;
    params?: ApiParam[]; // functions
    returnType?: ApiTypeRef; // functions
    tokenType?: ApiTypeRef; // tokens
    config?: ApiProperty[]; // options of the first parameter, or of the token's type argument
}
```

`ServiceProvision`, `PanelTarget`, `ServiceApi`, `ApiDocTags`, `ApiTypeRef`, `ApiParam`, `ApiMethod`, `ApiProperty`, `ApiTypeDoc` and `ApiSetupEntry` are exported from `@ng-prism/core/plugin` (and `@ng-prism/core`), with `ScannedService` and `RuntimeService`. What is listed and what is left out is described in [Showcasing Services](guide/showcasing-services.md#members).

---

## RuntimePipe

A single pipe in the runtime manifest. Like a service, it carries data only: the pipe class is never imported into the styleguide.

```typescript
interface RuntimePipe {
    meta: ScannedPipe;
}
```

---

## ScannedPipe

The data the scanner extracts from a `@Showcase`-annotated class with `@Pipe` (since `22.7.0`), see [Showcasing Pipes](guide/showcasing-pipes.md). Plugins receive it in [`onPipeScanned`](api/ng-prism-plugin.md#onpipescanned).

```typescript
interface ScannedPipe {
    className: string;
    filePath: string;
    importPath?: string;
    showcaseConfig: ShowcaseConfig;
    pipeName: string;
    pure?: boolean;
    api: PipeApi;
    meta?: Record<string, unknown>;
}
```

| Field            | Description                                                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `className`      | TypeScript class name. It is what `?pipe=` addresses                                                                                                                                                                                                  |
| `filePath`       | Absolute path to the source file. Build time use                                                                                                                                                                                                      |
| `importPath`     | Import path of the entry point that exports the pipe. Missing when the scanner could not place it                                                                                                                                                     |
| `showcaseConfig` | The `@Showcase` argument, reduced to the fields that apply to pipes, the same as for a service: `title`, `description`, `category`, `categoryOrder`, `componentOrder`, `section`, `sectionOrder`, `tags`, `meta`, `status`. `setup` is in `api.setup` |
| `pipeName`       | The name a template calls the pipe by, from `@Pipe({ name })`                                                                                                                                                                                         |
| `pure`           | From `@Pipe({ pure })`, `true` when the decorator does not say. Missing when it cannot be read                                                                                                                                                        |
| `api`            | The extracted API, see [`PipeApi`](#pipeapi). **Experimental**                                                                                                                                                                                        |
| `meta`           | Plugin-injected metadata                                                                                                                                                                                                                              |

`className`, `filePath`, `importPath`, `showcaseConfig`, `pipeName`, `pure` and `meta` follow semver as they are. The shape of `api` does not, see below.

---

## PipeApi

> **Experimental until 23.0.0: the shape may change in a 22.x minor release.** Like [`ServiceApi`](#serviceapi), this covers `PipeApi` and every `Api*` type below it.

The documentation of one pipe, as the scanner extracts it. The JSDoc plugin draws the pipe page from it. It shares `ApiDocTags`, `ApiMethod`, `ApiParam`, `ApiSetupEntry` and `ApiTypeDoc` with `ServiceApi`, shown there.

```typescript
interface PipeApi {
    description?: string;
    tags: ApiDocTags;
    transform: ApiMethod[]; // one entry per overload signature, or the implementation when there are none
    setup: ApiSetupEntry[];
    types: ApiTypeDoc[];
}
```

`PipeApi`, `ScannedPipe` and `RuntimePipe` are exported from `@ng-prism/core/plugin` (and `@ng-prism/core`). A pipe has no `properties` or `methods`: only `transform()` is read, see [Showcasing Pipes](guide/showcasing-pipes.md#transform).

---

## PanelTarget

Where a panel appears, the type of [`PanelDefinition.appliesTo`](api/ng-prism-plugin.md#panels-on-service-and-pipe-pages).

```typescript
type PanelTarget = 'component' | 'service' | 'pipe';
```

---

## InputMeta

Describes a single `input()` signal as extracted by the scanner.

```typescript
interface InputMeta {
    name: string;
    alias?: string;
    type: 'string' | 'number' | 'boolean' | 'union' | 'array' | 'object' | 'unknown';
    rawType?: string;
    values?: string[];
    defaultValue?: unknown;
    required: boolean;
    doc?: string;
}
```

| Field          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `name`         | Property name; variants and controls use it                              |
| `alias`        | Public name from `alias` (or `@Input('x')`), when it differs from `name` |
| `type`         | Normalized type category used to select a control                        |
| `rawType`      | Raw TypeScript type string (e.g. `'primary' \| 'danger'`)                |
| `values`       | For union types: the individual member values                            |
| `defaultValue` | Value from `input(defaultValue)`                                         |
| `required`     | `true` if declared with `input.required<T>()`                            |
| `doc`          | JSDoc comment from the property (populated by `@ng-prism/plugin-jsdoc`)  |

---

## OutputMeta

Describes a single `output()` signal.

```typescript
interface OutputMeta {
    name: string;
    alias?: string;
    doc?: string;
}
```

`alias` is the public event name from `output({ alias })` or `@Output('x')`, when it differs from `name`.

---

## PanelDefinition

See [NgPrismPlugin: PanelDefinition](api/ng-prism-plugin.md#paneldefinition).

---

## ControlDefinition

See [NgPrismPlugin: ControlDefinition](api/ng-prism-plugin.md#controldefinition).

---

## StyleguidePage

Discriminated union for sidebar pages.

```typescript
type StyleguidePage = CustomPage | ComponentPage;
```

### CustomPage

A data-only page processed through the build pipeline. Requires a plugin panel to render `data`.

```typescript
interface CustomPage {
    type: 'custom';
    title: string;
    category?: string;
    categoryOrder?: number;
    order?: number;
    data: Record<string, unknown>;
}
```

### ComponentPage

A free-form Angular component rendered as a sidebar page. Registered via `providePrism`, not through the build pipeline.

```typescript
interface ComponentPage {
    type: 'component';
    title: string;
    category?: string;
    categoryOrder?: number;
    order?: number;
    component: Type<unknown>;
}
```

Use the `componentPage()` helper to create entries with TypeScript type safety:

```typescript
import { componentPage } from '@ng-prism/core';

componentPage({
    title: 'Button Patterns',
    category: 'Atoms',
    order: 99,
    component: ButtonPatternsPageComponent
});
```

---

## NavigationItem

Discriminated union used in `PrismNavigationService.sectionTree()` (the items of each category) and `PrismNavigationService.activeItem`.

```typescript
type NavigationItem =
    | { kind: 'component'; data: RuntimeComponent }
    | { kind: 'service'; data: RuntimeService }
    | { kind: 'pipe'; data: RuntimePipe }
    | { kind: 'page'; data: StyleguidePage };
```

The `'service'` and `'pipe'` kinds were added in 22.7.0 with [services](guide/showcasing-services.md) and [pipes](guide/showcasing-pipes.md). It is a public type, so any code that narrows a `NavigationItem` by `kind` and reads `data` needs a branch for each. That includes a plain two-way check: after `item.kind === 'component' ? … : item.data.title`, the `data` in the other branch is a `RuntimeService | RuntimePipe | StyleguidePage`, and `title` no longer type-checks. See [Breaking change: NavigationItem has two new kinds](guide/migration-v22.md#breaking-change-navigationitem-has-two-new-kinds) for a before and after.

---

## Variant

```typescript
interface Variant<T = unknown> {
    name: string;
    inputs?: Partial<InputsOf<T>>;
    content?: string | Record<string, string>;
    description?: string;
    meta?: Record<string, unknown>;
    bg?: CanvasBg;
    canvasLayout?: CanvasLayout;
    pseudo?: ForcedPseudoStates;
    states?: false;
}
```

The optional type parameter `T` is the component class. When provided (via `@Showcase<MyComponent>({...})`), `inputs` becomes `Partial<InputsOf<MyComponent>>` and the editor checks both keys and values against the component's signal inputs. When omitted, `T` defaults to `unknown` and `inputs` falls back to `Record<string, unknown>`, which keeps it fully backwards compatible.

| Field          | Description                                                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | Tab label                                                                                                                                                                                                                                                                    |
| `inputs`       | Key-value map of input signal names to values. Typed via [`InputsOf<T>`](#inputsof) when a component generic is supplied to `@Showcase`.                                                                                                                                     |
| `content`      | Content projected into `<ng-content>`: string for single slot, record for named slots                                                                                                                                                                                        |
| `description`  | Optional description rendered below the variant tab                                                                                                                                                                                                                          |
| `meta`         | Arbitrary plugin metadata (e.g. `{ figma: 'url' }`)                                                                                                                                                                                                                          |
| `bg`           | Recommended canvas background. Overrides `ShowcaseConfig.bg`. One of `dots`, `plain`, `light`, `dark`, `checker`, `transparent`. See [Per-Variant Background](guide/variants.md#per-variant-background).                                                                     |
| `canvasLayout` | Canvas layout mode for this variant. Overrides `ShowcaseConfig.canvasLayout`. One of `fit`, `stretch`. See [Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) and the [`CanvasLayout`](#canvaslayout) type.                                            |
| `pseudo`       | Pseudo states forced on while the variant renders, each with the elements it applies to. See [Per-Variant Pseudo States](guide/variants.md#per-variant-pseudo-states) and the [`ForcedPseudoStates`](#forcedpseudostates) type.                                              |
| `states`       | `false` keeps the variant out of every combination with the component's [`states`](#showcasestate): it renders in its own pseudo states only, as a single cell in the Overview. No other value is valid. See [Opting a variant out](guide/variants.md#opting-a-variant-out). |

---

## ShowcaseState

One named combination of forced pseudo states, an entry of `ShowcaseConfig.states`. It applies on top of any variant that does not opt out with `Variant.states: false`.

```typescript
interface ShowcaseState {
    name: string;
    pseudo: ForcedPseudoStates;
}
```

| Field    | Description                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`   | Column title in the Overview, chip label in the tools menu and state name in a visual regression report. Unique within the component.                                                                                                           |
| `pseudo` | The pseudo states the state forces, with the same shape and meaning as `Variant.pseudo`, see [`ForcedPseudoStates`](#forcedpseudostates). Unlike `Variant.pseudo`, a state is forced only where it [fits](guide/variants.md#when-a-state-fits). |

```typescript
{ name: 'Hover', pseudo: { hover: '.btn' } }
{ name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } }
```

The position of a state in `ShowcaseConfig.states` is its identity: the `state` URL parameter, the render marker, [`DiscoveryState`](#discoverystate) and a visual regression report use that index. When a variant has a `pseudo` of its own, both are forced, and a pseudo-class both name goes to the targets of both.

`ShowcaseState` is exported from `@ng-prism/core`. See [Variants: States](guide/variants.md#states).

---

## InputsOf

Utility type that maps a component class to a record of its signal-input properties, unwrapped to their write-side value type.

```typescript
type InputsOf<T>;
```

**Selection rules**

- Picks fields declared as `input()`, `input.required()`, `model()`, or `input(..., { transform })`.
- Excludes `output()` and any other class members.
- Unwraps each signal to its write-side type. For transform inputs (e.g. `input(false, { transform: booleanAttribute })`) this is the source type (`string | boolean | ''`), not the parsed value type. That mirrors what callers actually write in `inputs: {...}`.
- When `T` is `unknown` (the default), evaluates to `Record<string, unknown>`.

**Example**

```typescript
import { booleanAttribute, input, model, output } from '@angular/core';

class FooComponent {
    label = input.required<string>();
    count = input<number>(0);
    active = input(false, { transform: booleanAttribute });
    selected = model<string>('');
    closed = output<void>();
}

// InputsOf<FooComponent> ≡
// {
//   label: string;
//   count: number;
//   active: string | boolean | '';
//   selected: string;
// }
```

`closed` is excluded because `output()` is not a signal input. `Variant<FooComponent>['inputs']` is `Partial<InputsOf<FooComponent>>`, so any subset of these keys is valid in a variant.

---

## DirectiveHost

```typescript
interface DirectiveHost {
    selector: string;
    import: { name: string; from: string };
    inputs?: Record<string, unknown>;
}
```

Used in `ShowcaseConfig.host` for directive showcases that require an Angular component as the host element. See [Directive Hosting](guide/directive-hosting.md).

---

## CanvasBg

Canvas background mode used by `ShowcaseConfig.bg` and `Variant.bg`.

```typescript
type CanvasBg = 'dots' | 'plain' | 'light' | 'dark' | 'checker' | 'transparent';
```

| Value         | Visual                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `dots`        | Dot grid over the themed surface (the canvas's own starting background)                                     |
| `plain`       | The themed surface, no pattern                                                                              |
| `light`       | Flat light surface, for components designed for light themes                                                |
| `dark`        | Flat dark surface, for components designed for dark themes                                                  |
| `checker`     | **Deprecated** (removed in 23.0.0). Checkerboard over the themed surface; captures as that surface's colour |
| `transparent` | Checkerboard while browsing, real transparency in a capture. Also the "nothing declared" answer             |

Two different defaults are in play. The canvas starts on `dots` and remembers whatever the user picks from the toolbar. A variant's background resolves to `transparent` when neither the variant nor its component declares one. That is `DEFAULT_VARIANT_BG`, which is what [`DiscoveryVariant.bg`](guide/external-tooling.md#reading-the-background) reports and what capture mode paints. It was `checker` in the first two `22.2.0` betas; see [the note on the change](guide/visual-regression.md#breaking-the-default-background-changed).

`light` and `dark` are flat by design, and their colours (`--prism-void-light`, `--prism-void-dark`) are absolute instead of theme tokens, which makes them the values to declare for a variant under [visual regression](guide/visual-regression.md#the-background-is-part-of-the-baseline). `dots`, `plain` and `checker` follow `--prism-bg-surface` and therefore the active theme.

`'checker'` is deprecated since 22.2.0 and removed in 23.0.0. It draws the same checkerboard as `'transparent'` while browsing, so the canvas cannot tell them apart. It does, however, capture as `--prism-bg-surface`, a theme token, which makes a baseline recorded on it depend on the theme the runner's browser started in. Use `'transparent'` for the same look with a capture that keeps its alpha, or `'light'`/`'dark'` for an absolute colour. The build warns for every component and variant that still declares it.

`transparent` has no colour at all. While browsing it renders as the checkerboard, which is already the UI's way of saying "no surface here"; a see-through canvas would just show the app shell through it. In capture mode it becomes real transparency. See [Capturing transparency](guide/visual-regression.md#capturing-transparency).

---

## CanvasLayout

Wrapper sizing mode used by `ShowcaseConfig.canvasLayout` and `Variant.canvasLayout`. Controls how `.demo-wrap` (the inner wrapper of the canvas stage) sizes itself around the rendered component.

```typescript
type CanvasLayout = 'fit' | 'stretch';
```

| Value     | Wrapper styles                                     | When to use                                                                                                                                                    |
| --------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fit`     | `display: inline-block`, shrinks to component size | Default. The vast majority of components (buttons, badges, cards, alerts) render at their intrinsic size and are centered by the canvas stage flex.            |
| `stretch` | `display: block; width: 100%; max-width: 800px`    | Components without intrinsic width (horizontal dividers via `border-bottom`) or that opt into filling their container (full-width buttons with `width: 100%`). |

The variant-level value always wins over the component-level value; the default is `'fit'`.

---

## PseudoState

A user-action pseudo-class a variant or a [component state](#showcasestate) can force on, used as a key of [`ForcedPseudoStates`](#forcedpseudostates).

```typescript
type PseudoState = 'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within';
```

These are the states a script cannot hold: `:hover` and `:active` follow the pointer, and only one element in the document can be focused. A state an input can set, such as `:checked` or `:disabled`, belongs in `Variant.inputs`. `PSEUDO_STATES` lists every value, in the order the canvas tools menu shows them.

---

## ForcedPseudoStates

The type of `Variant.pseudo` and `ShowcaseState.pseudo`: which states a variant or a component state forces, and on which elements.

```typescript
type PseudoTarget = true | string | readonly string[];
type ForcedPseudoStates = Partial<Record<PseudoState, PseudoTarget>>;
```

| Target              | Forces the state on                                                                   |
| ------------------- | ------------------------------------------------------------------------------------- |
| `true`              | Every element of the rendered component, the host included                            |
| `string`            | The elements matching the selector, matched against the host and everything inside it |
| `readonly string[]` | The elements matching any of the selectors                                            |

```typescript
{ 'focus-visible': '.btn' }                          // the inner <button> of the host
{ hover: true }                                      // the whole component
{ hover: '.pill', 'focus-visible': '.pill__close' }  // two states on two elements
```

`PseudoState`, `PseudoTarget`, `ForcedPseudoStates` and `PSEUDO_STATES` are exported from `@ng-prism/core/plugin` (and `@ng-prism/core`). How the states are forced, and what cannot be forced, is described in [Per-Variant Pseudo States](guide/variants.md#per-variant-pseudo-states).

---

## DiscoveryState

One component-level state in `window.__PRISM_MANIFEST__`, the entries of `DiscoveryComponent.states`. The manifest is the discovery view for [external tooling](guide/external-tooling.md#enumerating-what-exists).

```typescript
interface DiscoveryState {
    name: string;
    index: number;
    pseudo: ForcedPseudoStates;
}
```

| Field    | Description                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`   | The state's name, as declared in `@Showcase({ states })`                                                                                                                           |
| `index`  | 0-based position in the declared `states` array, the `?state=` URL value                                                                                                           |
| `pseudo` | The states it forces, as declared, see [`ForcedPseudoStates`](#forcedpseudostates). `{}` for a slot that forces nothing; it stays listed so the indices behind it keep their value |

`DiscoveryComponent.states` is omitted when the component declares none, and `DiscoveryVariant.states` is `false` for a variant that opted out of the component's states and absent otherwise. `DiscoveryState` is exported from `@ng-prism/core/plugin`.

---

## ComponentStatus

Optional migration / maturity badge used by `ShowcaseConfig.status`.

```typescript
type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';
```

| Value        | Meaning                                  |
| ------------ | ---------------------------------------- |
| `stable`     | Migrated and production-ready            |
| `beta`       | Functional, but API may still change     |
| `wip`        | Work in progress, migration ongoing      |
| `deprecated` | Legacy component. Do not use in new code |

When `status` is omitted, no indicator renders. See [`ShowcaseConfig.status`](api/showcase-config.md#status) for the full UI behavior in sidebar and header.

---

## ShowcaseSetupRef

An entry of [`ShowcaseConfig.setup`](api/showcase-config.md#setup): a function or an injection token that configures a service or a pipe.

```typescript
type ShowcaseSetupRef = ((...args: never[]) => unknown) | InjectionToken<unknown>;
```

Any function fits, whatever it takes and returns; ng-prism only reads its name, signature and type from the source and never calls it. Exported from `@ng-prism/core`.

---

## PrismManifest

The build-time manifest written to disk by the builder. Contains JSON-serializable data only, no class references.

```typescript
interface PrismManifest {
    components: ScannedComponent[];
    services?: ScannedService[];
    pipes?: ScannedPipe[];
    pages?: StyleguidePage[];
}
```

`services` and `pipes` are only present when a plugin shows them, see [`onServiceScanned`](api/ng-prism-plugin.md#onservicescanned) and [`onPipeScanned`](api/ng-prism-plugin.md#onpipescanned). Neither is in `components`.
