# ShowcaseConfig

Configuration object passed to the `@Showcase` decorator.

```typescript
import type { Provider } from '@angular/core';

interface ShowcaseConfig<T = unknown> {
    title: string;
    description?: string;
    section?: string;
    sectionOrder?: number;
    category?: string;
    categoryOrder?: number;
    componentOrder?: number;
    variants?: Variant<T>[];
    states?: ShowcaseState[];
    tags?: string[];
    providers?: Provider[];
    meta?: Record<string, unknown>;
    bg?: CanvasBg;
    canvasLayout?: CanvasLayout;
    host?: string | DirectiveHost;
    renderPage?: string;
    status?: ComponentStatus;
}

type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';

interface ShowcaseState {
    name: string;
    pseudo: ForcedPseudoStates;
}
```

The optional generic parameter `T` is the component class. When set via `@Showcase<MyComponent>({...})`, variant `inputs` are checked against `Partial<InputsOf<MyComponent>>`, giving you autocomplete on input names and type-checking on values. When omitted, `T` defaults to `unknown` and `inputs` accepts any `Record<string, unknown>`, so existing call sites keep working unchanged. See [Variants: Type-safe inputs](guide/variants.md#type-safe-inputs) for usage and [`InputsOf<T>`](api/types.md#inputsof) for the type mapping rules.

## Fields

### `title`

**Required.** Display name shown in the sidebar and above the component canvas.

```typescript
@Showcase({ title: 'Alert Banner' })
```

---

### `description`

Optional text rendered in the component head's details popover, behind the ⓘ glyph next to the title.

```typescript
@Showcase({
  title: 'Alert Banner',
  description: 'Displays status messages in four severities: info, warning, success and error.',
})
```

---

### `category`

Optional string that groups the component in the sidebar. Components without a category are placed in "Uncategorized".

```typescript
@Showcase({ title: 'Button', category: 'Atoms' })
```

---

### `categoryOrder`

Optional number controlling the sort order of this _category_ in the sidebar. Lower numbers appear first. Categories without `categoryOrder` sort alphabetically after ordered ones.

When multiple components share a category, the lowest `categoryOrder` value among them is used for the category.

```typescript
@Showcase({ title: 'Button', category: 'Atoms', categoryOrder: 1 })
```

---

### `componentOrder`

Optional number controlling the sort order of _this component_ within its category. Same semantics as `categoryOrder` but scoped to the category.

```typescript
@Showcase({ title: 'Icon Button', category: 'Atoms', componentOrder: 2 })
```

---

### `section`

Optional string that places the component into a top-level sidebar section. Auto-detected when omitted: `'Directives'` for a `@Directive`, `'Components'` for a `@Component`. Any free-form string creates a new section (e.g. `'Pipes'`, `'Utilities'`).

```typescript
@Showcase({ title: 'Autofocus', section: 'Behavior' })
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective {}
```

---

### `sectionOrder`

Optional number controlling the sort order of this _section_ in the sidebar. Lower numbers appear first. The section's effective order is the minimum `sectionOrder` among its items. Defaults: `Components` 0, `Directives` 10, custom 100.

```typescript
@Showcase({ title: 'AutofocusDirective', section: 'Behavior', sectionOrder: 5 })
```

---

### `variants`

Optional array of `Variant` objects. Each renders as a named tab above the canvas. See the [`Variant`](api/types.md#variant) type for full documentation.

```typescript
@Showcase({
  title: 'Badge',
  variants: [
    { name: 'Info',    inputs: { type: 'info' } },
    { name: 'Success', inputs: { type: 'success' } },
  ],
})
```

A variant can also force hover, active and focus states with `pseudo`. That describes this one variant. To show every variant in the same states, declare them once as [`states`](#states). See [Per-Variant Pseudo States](guide/variants.md#per-variant-pseudo-states).

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'Default' },
    { name: 'Focused', pseudo: { 'focus-visible': '.btn' } },
  ],
})
```

---

### `states`

Optional array of [`ShowcaseState`](api/types.md#showcasestate) objects, named pseudo states that are combined with every variant. Each has a `name`, unique within the component, and a `pseudo` in the shape of `Variant.pseudo`. The Overview shows variants against states as a matrix, the **State** group in the tools menu has a chip per state, and a screenshot runner can address every combination with `?state=`.

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  states: [
    { name: 'Hover', pseudo: { hover: '.btn' } },
    { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } },
    { name: 'Focus visible', pseudo: { 'focus-visible': '.btn' } },
  ],
  variants: [
    { name: 'Filled', inputs: { variant: 'filled' } },
    { name: 'Full width', inputs: { fullWidth: true }, canvasLayout: 'stretch', states: false },
  ],
})
```

- **Order is identity.** The position in the array is the state's index in the `state` URL parameter, the `data-prism-rendered` marker, `__PRISM_MANIFEST__` and a visual regression report. Keep the order stable and add new states at the end. An entry the scanner cannot use stays in its place as an empty state, so the entries behind it keep their index.
- **A state fits or does not.** It is forced only where every pseudo-class it names has a target the browser could put into that state: the selector has to match, a focus target cannot be disabled or inert, a hover or active target has to take the pointer. Otherwise the combination is reported as not fitting, with a reason, and nothing is forced. See [Variants: When a state fits](guide/variants.md#when-a-state-fits).
- **A variant can opt out** with `states: false`, see [`Variant`](api/types.md#variant).
- **Not combinable with `renderPage`.** A component page has no Overview. The scanner reports `states` next to `renderPage` and drops it.
- A name that repeats an earlier one, an entry without a name or without a usable `pseudo`, and an entry that is no object are reported as warnings, and `strictShowcase` turns them into a build error.

See [Variants: States](guide/variants.md#states) for how to write them and when to use `pseudo` on a variant instead.

---

### `tags`

Optional array of strings used for sidebar search and filtering. Matched alongside `title` and `category`.

```typescript
@Showcase({ title: 'Button', tags: ['form', 'cta', 'interactive'] })
```

---

### `providers`

**Deprecated** since 22.4.0, removed in 23.0.0. Providers are classes, factories or instances, which the [static scanner](guide/showcase-decorator.md#what-the-scanner-can-read) cannot read, so they never reached the styleguide. The build drops the field with one warning per component.

Use `defineConfig({ appProviders })` instead. For a provider only one component may see, use a [component page](guide/component-pages.md) and declare it on the page component.

---

### `meta`

Optional arbitrary key-value metadata. Plugins read their own namespaced keys from this object.

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc/Design?node-id=1-1',
    a11y: { disable: ['color-contrast'] },
  },
})
```

---

### `bg`

Optional recommended canvas background for this component. Applied when the user opens the component, unless a variant defines its own `bg`. The user can still override the background from the **Canvas** group in the tools menu (opened from the sliders button on the floating canvas rail). The override is transient and resets when switching variants or components.

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`, `'transparent'`.

`'transparent'` draws the same checkerboard as `'checker'` while browsing. The canvas has no way to show the difference, because the difference only shows up in a [capture](guide/visual-regression.md#capturing-transparency): `'transparent'` yields a screenshot with a real alpha channel, `'checker'` one on the themed surface. It is also what a variant resolves to when nothing declares a background.

`'checker'` is deprecated since 22.2.0 and removed in 23.0.0. It draws the same checkerboard as `'transparent'` while browsing, so the canvas cannot tell them apart. It does, however, capture as `--prism-bg-surface`, a theme token, which makes a baseline recorded on it depend on the theme the runner's browser started in. Use `'transparent'` for the same look with a capture that keeps its alpha, or `'light'`/`'dark'` for an absolute colour. The build warns for every component and variant that still declares it. It stays in the tools menu's **Canvas** group until then, because that group marks the active and the recommended background, and a value missing from it is a value the UI cannot show.

```typescript
@Showcase({
  title: 'Dark-only Card',
  bg: 'dark',
})
```

When the user has deviated from the recommended background, a small floating pill appears in the canvas labelled `Recommended: <bg>` with a one-click `Reset` button.

See also: [Variants: Per-Variant Background](guide/variants.md#per-variant-background) for the variant-level override and [Canvas State](architecture/canvas-state.md) for the full fallback model.

---

### `canvasLayout`

Optional canvas layout mode for the rendered component. Controls how `.demo-wrap` (the wrapper inside the canvas stage) sizes itself around the component.

Accepted values: `'fit'` (default), `'stretch'`.

| Value       | Behavior                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'fit'`     | Wrapper is `display: inline-block` and shrinks to the component's intrinsic size. The canvas stage's flexbox centers it. Use for the vast majority of components: buttons, badges, cards, alerts.                                                                   |
| `'stretch'` | Wrapper becomes `display: block; width: 100%; max-width: 800px`. Use when the component has no intrinsic width (e.g. a horizontal divider rendered via `border-bottom`) or explicitly opts into filling its container (e.g. a full-width button via `width: 100%`). |

A `Variant.canvasLayout` overrides the component-level setting.

```typescript
@Showcase({
  title: 'Divider',
  // Most variants render horizontally and need a width reference.
  canvasLayout: 'stretch',
  variants: [
    { name: 'Horizontal', inputs: { orientation: 'horizontal' } },
    // Vertical dividers are intrinsic-sized, so opt back into 'fit'.
    { name: 'Vertical',   inputs: { orientation: 'vertical' }, canvasLayout: 'fit' },
  ],
})
```

See also: [Variants: Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) for variant-level overrides.

---

### `host`

Optional. Tells ng-prism how to render a directive that cannot render on its own.

**String form**, an HTML element string:

```typescript
@Showcase({ title: 'Tooltip', host: '<button class="btn">Hover me</button>' })
```

**Object form** (`DirectiveHost`), an Angular component as host:

```typescript
@Showcase({
  title: 'Ripple',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Click me' },
  },
})
```

See [Directive Hosting](guide/directive-hosting.md) for a full walkthrough.

---

### `renderPage`

Optional title of a registered `ComponentPage`. When set, the matching page component is rendered in the canvas instead of the automatic `ViewContainerRef.createComponent()` output.

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',
})
```

The page component can inject `PrismRendererService` to react to variant and controls changes. See [Component Pages](guide/component-pages.md). A component with `renderPage` cannot declare [`states`](#states).

---

### `status`

Optional migration / maturity badge. Accepts one of four values from the `ComponentStatus` union:

| Value          | Meaning                                   |
| -------------- | ----------------------------------------- |
| `'stable'`     | Migrated and production-ready.            |
| `'beta'`       | Functional, but API may still change.     |
| `'wip'`        | Work in progress, migration ongoing.      |
| `'deprecated'` | Legacy component. Do not use in new code. |

```typescript
@Showcase({ title: 'Button', status: 'stable' })
@Showcase({ title: 'Dialog', status: 'deprecated' })
```

When the property is omitted, the component is treated like `stable` but rendered without any indicator, either in the sidebar or in the component head. Set the property explicitly only when you want to draw attention to the migration state.

UI impact:

- **Sidebar**
    - `'wip'`: the leading icon becomes a dashed circle (`circle-dashed`) instead of the regular `box`, with a native tooltip "Work in progress".
    - `'deprecated'`: component name is rendered struck-through and dimmed, with a native tooltip "Deprecated / Legacy".
    - `'stable'` / `'beta'` / unset: no sidebar decoration.
- **Component head:** an outlined status chip renders inline with the title for every explicit value (Stable, Beta, Work in progress, Deprecated). The `<selector>` itself has moved into the details popover behind the ⓘ glyph.

All colors come from the `--prism-mark-*` role tokens (plus `--prism-text-muted` for `stable`) and adapt automatically to light/dark mode. The chip is always an outline and never a filled surface, so `deprecated` separates itself by hue rather than by weight.

---

## DirectiveHost Interface

```typescript
interface DirectiveHost {
    /** CSS selector of the host element to render */
    selector: string;
    /** Import info for the Angular component */
    import: {
        name: string; // exported class name
        from: string; // npm package or path
    };
    /** Static inputs passed to the host component */
    inputs?: Record<string, unknown>;
}
```

## Variant Interface

See [Type Reference: Variant](api/types.md#variant).
