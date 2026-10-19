# Type Reference

All types exported from `ng-prism` or `ng-prism/plugin`.

---

## RuntimeManifest

The in-memory manifest produced after the builder scan and loaded at app bootstrap.

```typescript
interface RuntimeManifest {
    components: RuntimeComponent[];
    pages?: StyleguidePage[];
}
```

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

Discriminated union used in `PrismNavigationService.categoryTree()` and `PrismNavigationService.activeItem`.

```typescript
type NavigationItem = { kind: 'component'; data: RuntimeComponent } | { kind: 'page'; data: StyleguidePage };
```

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
}
```

The optional type parameter `T` is the component class. When provided (via `@Showcase<MyComponent>({...})`), `inputs` becomes `Partial<InputsOf<MyComponent>>` and the editor checks both keys and values against the component's signal inputs. When omitted, `T` defaults to `unknown` and `inputs` falls back to `Record<string, unknown>`, which keeps it fully backwards compatible.

| Field          | Description                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | Tab label                                                                                                                                                                                                                         |
| `inputs`       | Key-value map of input signal names to values. Typed via [`InputsOf<T>`](#inputsof) when a component generic is supplied to `@Showcase`.                                                                                          |
| `content`      | Content projected into `<ng-content>`: string for single slot, record for named slots                                                                                                                                             |
| `description`  | Optional description rendered below the variant tab                                                                                                                                                                               |
| `meta`         | Arbitrary plugin metadata (e.g. `{ figma: 'url' }`)                                                                                                                                                                               |
| `bg`           | Recommended canvas background. Overrides `ShowcaseConfig.bg`. One of `dots`, `plain`, `light`, `dark`, `checker`, `transparent`. See [Per-Variant Background](guide/variants.md#per-variant-background).                          |
| `canvasLayout` | Canvas layout mode for this variant. Overrides `ShowcaseConfig.canvasLayout`. One of `fit`, `stretch`. See [Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) and the [`CanvasLayout`](#canvaslayout) type. |
| `pseudo`       | Pseudo states forced on while the variant renders, each with the elements it applies to. See [Per-Variant Pseudo States](guide/variants.md#per-variant-pseudo-states) and the [`ForcedPseudoStates`](#forcedpseudostates) type.   |

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

A user-action pseudo-class a variant can force on, used as a key of [`ForcedPseudoStates`](#forcedpseudostates).

```typescript
type PseudoState = 'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within';
```

These are the states a script cannot hold: `:hover` and `:active` follow the pointer, and only one element in the document can be focused. A state an input can set, such as `:checked` or `:disabled`, belongs in `Variant.inputs`. `PSEUDO_STATES` lists every value, in the order the canvas tools menu shows them.

---

## ForcedPseudoStates

The type of `Variant.pseudo`: which states a variant forces, and on which elements.

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

## PrismManifest

The build-time manifest written to disk by the builder. Contains JSON-serializable data only, no class references.

```typescript
interface PrismManifest {
    components: ScannedComponent[];
    pages?: StyleguidePage[];
}
```
