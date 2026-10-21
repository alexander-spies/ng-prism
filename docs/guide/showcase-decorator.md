# @Showcase Decorator

`@Showcase` is placed directly on an Angular component (or directive) class to register it with ng-prism. The decorator accepts a `ShowcaseConfig` object.

```typescript
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'My Component',
  // ...
})
@Component({ ... })
export class MyComponent { ... }
```

The decorator is evaluated at build time by the TypeScript Compiler API scanner, which reads the config from the source without running it (see [What the scanner can read](#what-the-scanner-can-read)). Its presence makes the builder include the component in the manifest.

> **Note:** `@Showcase` must always appear _above_ `@Component` or `@Directive`, as decorator application order in Angular matters.

`@Showcase` also goes on a class with `@Injectable` or `@Service`. That makes it a service, which has no canvas: it gets a page with its API instead. See [Showcasing Services](guide/showcasing-services.md) for what applies to one, including the [`setup`](#setup) field that only a service takes.

## Type-safe variants (optional)

`@Showcase` is generic: `@Showcase<T>({...})` where `T` is the component class. Supplying it types each variant's `inputs` as `Partial<InputsOf<T>>`, giving you autocomplete on input names and value type-checking against the component's signal inputs.

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  variants: [
    { name: 'Primary', inputs: { label: 'Save',  variant: 'primary' } },
    { name: 'Danger',  inputs: { label: 'Delete', variant: 'danger'  } },
  ],
})
@Component({ ... })
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
}
```

Without the generic argument, `inputs` falls back to `Record<string, unknown>`, so every existing call site keeps working unchanged. See [Variants: Type-safe inputs](guide/variants.md#type-safe-inputs) and [`InputsOf<T>`](api/types.md#inputsof) for full details.

## What the scanner can read

The builder never runs your code. It reads the `@Showcase` argument from the source, so every value in it has to be spelled out there:

| Works                                           | Example                                       |
| ----------------------------------------------- | --------------------------------------------- |
| Strings, numbers, booleans, `null`, `undefined` | `'Save'`, `42`, `-1`, `true`                  |
| Arithmetic and string concatenation             | `5 * 1024 * 1024`, `'Step ' + 2`              |
| Template literals, with placeholders            | `` `${2 * 3} files` ``                        |
| Type assertions                                 | `['pdf', 'png'] as const`, `'m' as Size`      |
| Array and object literals, nested               | `{ inputs: { tags: ['a', 'b'] } }`            |
| `const` constants, also imported                | `MAX_FILES`, `5 * MB`                         |
| Enum members                                    | `Size.Medium`                                 |
| Properties and indices of constants             | `TOKENS.size.m`, `SIZES[1]`                   |
| Spread and shorthand of constants               | `{ ...SHARED_META }`, `{ label }`             |
| Computed keys that resolve to a string          | `{ ['aria-label']: 'Close' }`, `{ [KEY]: 1 }` |

Each of these works as long as every part of it does: `5 * MB` works while `MB` is a `const` with a readable value.

A constant imported from a compiled package is read from that package's `.d.ts`, which keeps a value only when it was a plain literal. `export const MAX_FILES = 3` arrives as `MAX_FILES = 3`; `export const MB = 1024 * 1024` arrives as `MB: number` and cannot be read.

A constant is read as its initializer says. Changes made to it at runtime, such as `OPTIONS.push('pdf')` or `CONFIG.size = 'l'`, never happen for the scanner, so keep showcase values in constants that nothing mutates.

Anything else would need the code to run, so the scanner drops it:

| Does not work                    | Example                                     |
| -------------------------------- | ------------------------------------------- |
| `let` and `var` variables        | `let retries = 3`                           |
| Constants without a value        | `declare const MB: number`, see above       |
| Conditions and comparisons       | `dark ? 'dark' : 'light'`, `label ?? 'OK'`  |
| Function and method calls        | `megabytes(5)`, `items.map(toOption)`       |
| Functions, classes and instances | `(value) => value.length > 0`, `new Date()` |

Functions, classes and instances are a limit of the approach, not of the scanner: they only exist once code runs, so the static manifest has no way to hold them. The one function that works is [`setup: () => [...]`](guide/showcasing-services.md#setup) on a service: the scanner reads the array literal it returns from the source and never evaluates or calls it.

### What happens to a value it cannot read

Only that value is lost. A property, an array element or a spread is dropped; the object or array around it keeps everything else. Each drop prints a warning naming the component, where the value sat in the config, the source text and its location:

```
⚠ ng-prism: FileInputComponent › variants[3] "Auto hint" › inputs.maxFileSize — "megabytes(5)" (projects/my-lib/src/file-input/file-input.component.ts:27:52) cannot be evaluated statically and was dropped.
```

When a reference is what failed, the warning names it and says why:

```
⚠ ng-prism: FileInputComponent › variants[4] "Retry" › inputs.retries — "retries" (projects/my-lib/src/file-input/file-input.component.ts:31:41) cannot be evaluated statically and was dropped: retries is declared with let; only const declarations can be read.
```

A value inside a constant is reported where the constant writes it, so the location points to the line to fix even when the constant lives in another file.

When the whole argument cannot be read, as in `@Showcase(buildShowcase('File input'))`, the component is skipped, and the warning says so. A config kept in a `const` and passed as `@Showcase(FILE_INPUT_SHOWCASE)` is fine.

To fix a warning, write the value out: `maxFileSize: 5 * 1024 * 1024` instead of `megabytes(5)`. To make the build fail instead of warning, for example in CI, set [`strictShowcase`](api/ng-prism-config.md#strictshowcase).

## All Fields

### `title` _(required)_

Display name shown in the sidebar and above the component canvas.

```typescript
@Showcase({ title: 'Alert Banner' })
```

### `description`

Text rendered in the component head's details popover, behind the ⓘ glyph next to the title. Good for documenting intent, usage notes, and accessibility hints.

```typescript
@Showcase({
  title: 'Alert Banner',
  description:
    'Communicates status messages. Not for persistent UI elements. ' +
    'Severity levels: info, warning, success, error.',
})
```

### `category`

Groups the component in the sidebar. Components without a category land in "Uncategorized".

```typescript
@Showcase({ title: 'Pill', category: 'Atoms' })
@Showcase({ title: 'Card', category: 'Molecules' })
```

Use `/` (space-slash-space) to nest categories under a parent group:

```typescript
@Showcase({ title: 'Button', category: 'Atoms' })
@Showcase({ title: 'Dialog', category: 'Overlays' })
@Showcase({ title: 'Color Tokens', category: 'Foundations' })
```

This creates a collapsible **Components** group in the sidebar containing **Atoms** and **Overlays** as sub-categories, while **Foundations** remains a top-level category.

### `categoryOrder`

Controls the order of this _category_ in the sidebar. Lower numbers appear first. Categories without this property sort alphabetically after ordered ones.

When multiple components share a category, the lowest `categoryOrder` value among them wins.

```typescript
@Showcase({ title: 'Button', category: 'Atoms', categoryOrder: 1 })
@Showcase({ title: 'Modal', category: 'Overlays', categoryOrder: 2 })
```

### `componentOrder`

Controls the order of _this component_ within its category. Same sorting rules as `categoryOrder`.

```typescript
@Showcase({ title: 'Icon Button', category: 'Atoms', componentOrder: 2 })
@Showcase({ title: 'Button',      category: 'Atoms', componentOrder: 1 })
```

### `section`

Top-level sidebar grouping. ng-prism auto-detects this from the decorator type: `@Directive` classes go to **Directives**, `@Component` classes go to **Components**, services go to **Services**. Set `section` to a different string to create your own top-level group:

```typescript
@Showcase({ title: 'AutofocusDirective', section: 'Behavior' })
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective {}

@Showcase({ title: 'Date Field', section: 'Forms' })
@Component({ selector: 'lib-date-field', standalone: true, template: '…' })
export class DateFieldComponent {
    /* ... */
}
```

Inside each section, the existing `category` field still groups items into sub-categories.

### `sectionOrder`

Controls the order of this _section_ in the sidebar. Lower numbers appear first. Default order: `Components` (0), then `Directives` (10), then `Services` (20), then everything else (100, alphabetically). The section's effective order is the minimum `sectionOrder` of any item it contains, so a single `@Showcase({ section: 'Behavior', sectionOrder: 5 })` pulls the whole "Behavior" section above "Components".

```typescript
@Showcase({ title: 'AutofocusDirective', section: 'Behavior', sectionOrder: 5 })
```

### `variants`

Predefined tabs shown above the canvas. Each variant can set different `inputs`, `content`, a `description`, plugin `meta`, its own `bg` and `canvasLayout`, and forced `pseudo` states such as `:focus-visible`. A state that should apply to many variants is a component-level [`states`](#states) entry instead.

```typescript
@Showcase({
  title: 'Badge',
  variants: [
    { name: 'Info',    inputs: { label: 'New',    type: 'info' } },
    { name: 'Warning', inputs: { label: 'Review', type: 'warning' } },
    { name: 'Error',   inputs: { label: 'Error',  type: 'error' } },
  ],
})
```

See [Variants](guide/variants.md) for the full `Variant` interface.

### `states`

Named pseudo states, `hover`, `active`, `focus`, `focus-visible` and `focus-within`, that apply to every variant they fit. Each entry has a `name` and a `pseudo` in the shape of a variant's `pseudo`. The Overview becomes a matrix of variants against states, the **State** group in the tools menu gets a chip per state, and a screenshot runner can capture every combination.

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
    { name: 'Disabled', inputs: { variant: 'filled', disabled: true } },
    // Not combined with any state
    { name: 'Full width', inputs: { fullWidth: true }, canvasLayout: 'stretch', states: false },
  ],
})
```

A state is forced only where the browser could put the component in it, so `Focus visible` is not forced on the disabled button, and the combination is reported as not fitting, with the reason. A variant opts out of all states with `states: false`. The position in the list identifies a state in the URL, the render marker, `__PRISM_MANIFEST__` and a visual regression report, so keep the order stable.

Not combinable with [`renderPage`](#renderpage): a component page has no Overview, so the scanner reports `states` there and drops it. See [Variants: States](guide/variants.md#states) for the fit rule, the reasons and when to use `pseudo` on a variant instead.

### `tags`

Array of strings used for search and filtering in the sidebar. Tags are matched alongside `title` and `category`.

```typescript
@Showcase({
  title: 'Button',
  tags: ['interactive', 'form', 'cta'],
})
```

### `providers`

> **Deprecated since 22.4.0, removed in 23.0.0.** `providers` never reached the styleguide: a provider is a class, a factory or an instance, which the [scanner cannot read](#what-the-scanner-can-read). The build drops the field with one warning per component, and the component renders without it.

Components that inject something the Prism app does not provide (a `Router` for `routerLink`, `HttpClient`, a translation service, a library config token) get it from `defineConfig({ appProviders })`, which feeds the app's root injector. In the rare case that one component needs a provider the others must not see, render it through a [component page](guide/component-pages.md) via [`renderPage`](#renderpage) and declare the provider on the page component.

### `setup`

Services only: the functions and `InjectionToken` constants that configure the service, as an arrow function that returns them. The styleguide documents each one next to the service, and the generated usage snippet calls them.

```typescript
@Showcase({
    title: 'Notification Service',
    setup: () => [provideNotifications]
})
@Injectable({ providedIn: 'root' })
export class NotificationService {
    /* ... */
}
```

It is an arrow function so that a reference to a function from a file that imports the service back is not read while the class is still being defined. The builder reads the array literal from the source and never runs the function. See [`ShowcaseConfig.setup`](api/showcase-config.md#setup) for what it accepts and [Showcasing Services](guide/showcasing-services.md#setup) for the warnings.

### `meta`

Arbitrary key-value metadata consumed by plugins. Each official plugin documents its own key.

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1',
    a11y: { rules: { 'color-contrast': { enabled: true } } },
  },
})
```

### `bg`

Recommended canvas background for this component. Applied automatically when the user opens the component (or one of its variants), unless a variant defines its own `bg`. The user can still pick a different background from the **Canvas** group in the tools menu (opened from the sliders button on the floating canvas rail); the override is transient and resets when switching variants or components. When the user has deviated, a `Recommended: <bg>` pill appears in the canvas with a one-click `Reset` button.

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`, `'transparent'`.

`'transparent'` draws the same checkerboard as `'checker'` while browsing. The canvas has no way to show the difference, because the difference is what a [capture](guide/visual-regression.md#capturing-transparency) does: `'transparent'` yields a screenshot with a real alpha channel, `'checker'` one on the themed surface. It is also what a variant resolves to when nothing declares a background.

`'checker'` is deprecated since 22.2.0 and removed in 23.0.0. It draws the same checkerboard as `'transparent'` while browsing, so the canvas cannot tell them apart. But it captures as `--prism-bg-surface`, a theme token, which makes a baseline recorded on it depend on the theme the runner's browser started in. Use `'transparent'` for the same look with a capture that keeps its alpha, or `'light'`/`'dark'` for an absolute colour. The build warns for every component and variant that still declares it. It stays in the tools menu's **Canvas** group until then, because that group marks the active and the recommended background, and a value missing from it is a value the UI cannot show.

```typescript
@Showcase({
  title: 'Dark-only Card',
  bg: 'dark',
})
```

Variants can also declare a recommended `bg`. Variant-level always wins over component-level. See [Variants](guide/variants.md#per-variant-background).

### `canvasLayout`

Wrapper sizing mode for the canvas. Controls how `.demo-wrap` (the wrapper around the rendered component) sizes itself within the canvas stage.

Accepted values: `'fit'` (default) and `'stretch'`.

| Value       | Behavior                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'fit'`     | Wrapper is `display: inline-block` and shrinks to the component's intrinsic size; the stage's flexbox centers it. Use for the vast majority of components.                                              |
| `'stretch'` | Wrapper becomes `display: block; width: 100%; max-width: 800px`. Use when the component has no intrinsic width (horizontal divider via `border-bottom`) or opts into `width: 100%` (full-width button). |

```typescript
@Showcase({
  title: 'Divider',
  canvasLayout: 'stretch',
})
```

Variants can override this with their own `canvasLayout`. See [Variants: Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) and the [`CanvasLayout`](api/types.md#canvaslayout) type for the exact wrapper styles applied in each mode.

### `host`

Targets directives that cannot render on their own. Tells ng-prism what element or component to host the directive on.

**String host** (an HTML element string):

```typescript
@Showcase({
  title: 'Tooltip Directive',
  host: '<button class="btn">Hover me</button>',
  variants: [
    { name: 'Default', inputs: { appTooltip: 'This is a tooltip' } },
  ],
})
@Directive({ selector: '[appTooltip]' })
export class TooltipDirective { ... }
```

**Object host** (an Angular component):

```typescript
@Showcase({
  title: 'Ripple Directive',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Click me' },
  },
})
@Directive({ selector: '[libRipple]' })
export class RippleDirective { ... }
```

See [Directive Hosting](guide/directive-hosting.md) for a full walkthrough.

### `status`

Optional migration / maturity badge. Accepts `'stable'`, `'beta'`, `'wip'`, or `'deprecated'` (the `ComponentStatus` union).

```typescript
@Showcase({ title: 'Button',  status: 'stable' })
@Showcase({ title: 'Chip',    status: 'beta' })
@Showcase({ title: 'Slider',  status: 'wip' })
@Showcase({ title: 'Dialog',  status: 'deprecated' })
```

When `status` is omitted, the component is treated as stable but renders without any indicator, which keeps the sidebar quiet. Set it explicitly only when you want to draw attention.

**Visual impact**

| Status         | Sidebar item                           | Component head                              |
| -------------- | -------------------------------------- | ------------------------------------------- |
| _unset_        | unchanged                              | no status chip                              |
| `'stable'`     | unchanged                              | muted outlined "Stable" chip                |
| `'beta'`       | unchanged                              | amber "Beta" chip                           |
| `'wip'`        | dashed-circle leading icon (tooltip)   | amber "Work in progress" chip (hollow ring) |
| `'deprecated'` | name struck-through + dimmed (tooltip) | red "Deprecated" chip                       |

The status chip is rendered inline with the title in the component head's single row; the `<selector>` now lives in the details popover behind the ⓘ glyph. All colors come from the `--prism-mark-*` role tokens, so light/dark mode are handled automatically. A status chip is always an outline and never a filled surface. A permanently visible band is the wrong place for a filled alarm colour, so `deprecated` separates itself by hue rather than by weight.

Use this to communicate migration state while moving components from a legacy library into a new one: set `'wip'` on what's actively being migrated, `'deprecated'` on what should no longer be used, and `'stable'` / `'beta'` to badge maturity once a component is done.

### `renderPage`

Title of a registered `ComponentPage` to render instead of the default component canvas. Use for complex components that need elaborate template projections or mock data that cannot be expressed with simple `content` strings.

The page component can inject `PrismRendererService` to react to variant and controls panel changes. A component with `renderPage` cannot declare [`states`](#states).

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',  // must match the ComponentPage title
  variants: [
    { name: 'Empty', inputs: {} },
    { name: '10 rows', inputs: { rowCount: 10 } },
  ],
})
@Component({ ... })
export class DataTableComponent { ... }
```

See [Component Pages](guide/component-pages.md) for how to create and register the page.
