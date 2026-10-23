# ShowcaseConfig

Configuration object passed to the `@Showcase` decorator.

```typescript
import type { InjectionToken, Provider } from '@angular/core';

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
    setup?: () => readonly ShowcaseSetupRef[];
    bg?: CanvasBg;
    canvasLayout?: CanvasLayout;
    host?: string | DirectiveHost | HostTemplate;
    imports?: ShowcaseImport[];
    renderPage?: string;
    status?: ComponentStatus;
}

type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';

type ShowcaseSetupRef = ((...args: never[]) => unknown) | InjectionToken<unknown>;

interface ShowcaseState {
    name: string;
    pseudo: ForcedPseudoStates;
}
```

`@Showcase` also goes on a class with `@Injectable` or `@Service`, which makes it a [service](guide/showcasing-services.md), and on a class with `@Pipe`, which makes it a [pipe](guide/showcasing-pipes.md) (both since `22.7.0`): a page with its API and no canvas. For a service or a pipe, the fields `title`, `description`, `category`, `categoryOrder`, `componentOrder`, `section`, `sectionOrder`, `tags`, `meta` and `status` apply, and so does [`setup`](#setup), which only they take. The others (`variants`, `states`, `providers`, `bg`, `canvasLayout`, `host`, `imports`, `renderPage`) need a canvas, see [Services](#services) and [Pipes](#pipes) below.

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

Optional string that places the component into a top-level sidebar section. Auto-detected when omitted: `'Directives'` for a `@Directive`, `'Components'` for a `@Component`, `'Services'` for a service, `'Pipes'` for a pipe. Any free-form string creates a new section (e.g. `'Forms'`, `'Utilities'`).

```typescript
@Showcase({ title: 'Autofocus', section: 'Behavior' })
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective {}
```

---

### `sectionOrder`

Optional number controlling the sort order of this _section_ in the sidebar. Lower numbers appear first. The section's effective order is the minimum `sectionOrder` among its items. Defaults: `Components` 0, `Directives` 10, `Services` 20, `Pipes` 30, custom 100.

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

Optional array of [`ShowcaseState`](api/types.md#showcasestate) objects, named pseudo states that are combined with every variant they fit. Each has a `name`, unique within the component, and a `pseudo` in the shape of `Variant.pseudo`. The Overview shows variants against states as a matrix, the **State** group in the tools menu has a chip per state, and a screenshot runner can address every combination with `?state=`.

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

- **Order is identity.** The position in the array is the state's index in the `state` URL parameter, the `data-prism-rendered` marker, `__PRISM_MANIFEST__` and a visual regression report. Keep the order stable and add new states at the end. An entry that is not an object, repeats the name of an earlier one, or has a `pseudo` that is missing, empty or has nothing usable left stays in its place as an empty state, so the entries behind it keep their index. An entry without a `name` still works, as `State <position>`.
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

### `setup`

**Services and pipes only**, since `22.7.0`. The functions and `InjectionToken` constants that configure the service or pipe, as an arrow function that returns them. The styleguide documents each one next to the service or pipe: signature, description, `@example` and a table of its options, and the generated usage snippet calls them.

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

`setup` is an arrow function, not a list, so that a reference to a function declared in a file that imports the service or pipe back is only touched if the function runs. `@Showcase(...)` is evaluated when the class is defined, in every library build without [`ng-prism-strip`](guide/library-publishing.md), and a direct reference to a `const` of a module that is still loading fails with a `ReferenceError`. ng-prism never calls the function: the builder reads the array literal from the source, and `Showcase()` does nothing at runtime. TypeScript checks the references all the same, and renaming one in the IDE renames it here.

What the builder accepts:

- An arrow function with an array literal as its body (`() => [a, b]`), or with a block that only returns one. `as const`, a spread, a condition, a call and a constant that holds the list are not accepted: the whole `setup` is dropped with a warning.
- Entries that are a function declaration, a `const` arrow or function expression, or a `const` of type `InjectionToken`. Anything else is dropped with a warning, and the other entries stay.
- Entries that a scanned entry point exports, since the usage snippet needs the import path. One that is not exported is dropped with a warning.
- `setup` written in the `@Showcase({ ... })` object itself. One that comes through a spread or a constant is not read, and nothing is reported.

On a component or a directive, `setup` is reported and dropped. The type of an entry is `ShowcaseSetupRef`, exported from `@ng-prism/core`; ng-prism only reads its name, signature and type.

For a pipe it works the same way, with `provideTimeAgo` in `setup: () => [provideTimeAgo]` on a class with `@Pipe({ name: 'timeAgo' })`. The exact wording of the warnings and everything else about the page is in [Showcasing Services](guide/showcasing-services.md#setup) and [Showcasing Pipes](guide/showcasing-pipes.md).

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

Optional. Tells ng-prism what to render a directive on, or what to render a component or directive inside. A directive without `host` renders on the element its selector names, see [Without a Host](guide/directive-hosting.md#without-a-host).

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

**Template form** (`HostTemplate`, since `22.7.0`), an Angular template the subject renders in. The element that the subject's selector matches is the subject, and `prism-subject` marks it when several match:

```typescript
@Showcase<InputDirective>({
  title: 'Input',
  host: { template: '<lib-form-field label="Name"><input libInput /></lib-form-field>' },
})
```

The template form works for components and directives. The string and the object form only apply to directives: on a component they have no effect, and the build reports that and drops them. `Variant.host` takes the template form and overrides this field for that variant.

See [Directive Hosting](guide/directive-hosting.md) for a full walkthrough.

---

### `imports`

Optional, since `22.7.0`. What the [templates](guide/content-projection.md#compiled-content-template) of the showcase (`Variant.template`, `host: { template }`) use and ng-prism does not find in your library by itself: a class from another package such as `CdkTextareaAutosize`, or one of Angular's pipes and directives such as `DatePipe`. A list of `ShowcaseImport` objects:

```typescript
@Showcase({
  title: 'Form Field',
  imports: [
    { name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' },
    { name: 'DatePipe', from: '@angular/common' },
  ],
})
```

| Field  | Description                                               |
| ------ | --------------------------------------------------------- |
| `name` | The exported class name                                   |
| `from` | The module specifier to import it from, as in an `import` |

The entries are strings so that [`ng-prism-strip`](guide/library-publishing.md) leaves no import behind in the published library. Components, directives and pipes that your library's entry points export do not need an entry: a template that names them imports them, see [the rule](guide/content-projection.md#imports). ng-prism reads each entry from the declarations of its module to know its selector or name. An entry it cannot read is imported as written, with a notice. The field applies to components and directives, not to services or pipes.

---

### `renderPage`

Optional title of a registered `ComponentPage`. When set, the matching page component is rendered in the canvas instead of the automatic `ViewContainerRef.createComponent()` output.

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',
})
```

The page component can inject `PrismRendererService` to react to variant and controls changes. See [Component Pages](guide/component-pages.md). A component with `renderPage` cannot declare [`states`](#states), has no Overview and no Events panel entries. For a subject that only needs other library parts around it or in it, a variant [`template`](guide/content-projection.md#compiled-content-template) or a [`host` template](#host) keeps all of that.

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
- **Component head:** a status badge with a dot renders inline with the title for every explicit value (Stable, Beta, Work in progress, Deprecated); its tooltip says what the status means. The `<selector>` itself has moved into the details popover behind the ⓘ glyph.

The badge is a soft-tinted [`prism-badge`](api/ng-prism-plugin.md#ui-primitives): `stable` in `--prism-success`, `beta` and `wip` in `--prism-warn` (`wip` with a hollow dot, the one status without a settled state), `deprecated` in `--prism-danger`. The colours adapt to light and dark mode (since `22.7.0`; before, the chip was an outline in the `--prism-mark-*` colours).

---

## Services

A class with `@Injectable` or `@Service` from `@angular/core` is a [service](guide/showcasing-services.md), unless it also has `@Component` or `@Directive`. `variants`, `states`, `providers`, `bg`, `canvasLayout`, `host`, `imports` and `renderPage` do nothing there, since a service page has no canvas.

**Until 23.0.0 they decide what the class is** (deprecated since 22.7.0, removed in 23.0.0). A class with `@Showcase` and `@Injectable` was shown as a component before services existed, and with `renderPage` it had a working page. A class with `@Injectable` or `@Service` that declares one of those fields stays a component, as before, and the build prints a notice (it does not count for [`strictShowcase`](api/ng-prism-config.md#strictshowcase)):

```
⚠ ng-prism: ToastService is an @Injectable/@Service with @Showcase and declares variants, renderPage, so it is still treated as a component. From 23.0.0 it will be shown as a service and these fields will be dropped; remove them, or move the page to a componentPage.
```

Remove the fields and move the demo to a [component page](guide/component-pages.md) to make it a service now. The exception is deprecated since 22.7.0 and ends in 23.0.0, see [Deprecation: injectables and pipes with component-only fields](guide/migration-v22.md#deprecation-injectables-and-pipes-with-component-only-fields).

---

## Pipes

A class with `@Pipe` from `@angular/core` is a [pipe](guide/showcasing-pipes.md), unless it also has `@Component` or `@Directive`; one with `@Pipe` and `@Injectable` is a pipe. The same fields as for a service apply, and `variants`, `states`, `providers`, `bg`, `canvasLayout`, `host`, `imports` and `renderPage` do nothing there.

**Until 23.0.0 they decide what the class is** (deprecated since 22.7.0, removed in 23.0.0), as for services: a `@Pipe` class that declares one of those fields stays a component, and the build prints a notice (it does not count for [`strictShowcase`](api/ng-prism-config.md#strictshowcase)):

```
⚠ ng-prism: LegacyPagePipe is a @Pipe with @Showcase and declares renderPage, so it is still treated as a component. From 23.0.0 it will be shown as a pipe and these fields will be dropped; remove them, or move the page to a componentPage.
```

A pipe declared in an NgModule (`standalone: false`) is not shown from 23.0.0, so its notice says that instead, see [Showcasing Pipes: Compatibility until 23.0.0](guide/showcasing-pipes.md#compatibility-until-2300). The exception is deprecated since 22.7.0 and ends in 23.0.0, see [Deprecation: injectables and pipes with component-only fields](guide/migration-v22.md#deprecation-injectables-and-pipes-with-component-only-fields).

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

## HostTemplate and ShowcaseImport Interfaces

Since `22.7.0`, both exported from `@ng-prism/core`. See [Type Reference](api/types.md#hosttemplate).

```typescript
interface HostTemplate {
    /** The markup the subject renders in, compiled as an Angular template */
    template: string;
}

interface ShowcaseImport {
    /** Exported name, e.g. 'CdkTextareaAutosize' */
    name: string;
    /** Module specifier, e.g. '@angular/cdk/text-field' */
    from: string;
}
```

## Variant Interface

See [Type Reference: Variant](api/types.md#variant).
