# NgPrismPlugin

Interface implemented by all ng-prism plugins. A plugin is a plain JavaScript object, with no class inheritance or base classes.

```typescript
interface NgPrismPlugin {
    name: string;
    onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void | Promise<ScannedComponent | void>;
    onServiceScanned?: (service: ScannedService) => ScannedService | void | Promise<ScannedService | void>;
    onPipeScanned?: (pipe: ScannedPipe) => ScannedPipe | void | Promise<ScannedPipe | void>;
    onPageScanned?: (page: StyleguidePage) => StyleguidePage | void | Promise<StyleguidePage | void>;
    onManifestReady?: (manifest: PrismManifest) => PrismManifest | void | Promise<PrismManifest | void>;
    componentApi?: boolean; // experimental
    panels?: PanelDefinition[];
    controls?: ControlDefinition[];
    headerWidgets?: HeaderWidgetDefinition[];
    navigationDecorations?: NavigationDecorationDefinition[];
    wrapComponent?: Type<unknown>; // deprecated, no effect
}
```

## Fields

### `name`

**Required.** Unique identifier for this plugin. Used in debug output and conflict detection.

```typescript
{
    name: '@my-org/plugin-my-plugin';
}
```

---

### `onComponentScanned`

Build-time hook called once per `@Showcase`-decorated component. Receives the `ScannedComponent` object. Mutate it in place or return a new object. Returning `void` keeps the original.

Runs in Node.js, so do not import browser APIs.

```typescript
onComponentScanned(component) {
  component.meta = {
    ...component.meta,
    myPlugin: extractMyData(component.filePath),
  };
}
```

Async is supported:

```typescript
async onComponentScanned(component) {
  const extra = await fetchData(component.className);
  component.meta = { ...component.meta, extra };
}
```

`ScannedComponent.api` (since `22.7.0`) is the extracted API of the component or directive: the type of each input, the payload of each output, the change event of each `model()`, the documented methods and the types they reach. The scan only reads it when a plugin in the config sets [`componentApi`](#componentapi), `jsDocPlugin()` does. A hook then reads it as it does the rest, for example `component.api?.types`. Its shape is experimental, see [`ComponentApi`](api/types.md#componentapi). The runtime manifest carries it, so a panel reads it at `activeComponent()?.meta.api`. Without a plugin that asks for it, a component has none, and neither does one that a hook builds from scratch: the API page of the JSDoc plugin then shows its `inputs` and `outputs` without links.

---

### `onServiceScanned`

Build-time hook (since `22.7.0`) called once per `@Showcase`-decorated [service](guide/showcasing-services.md), with the `ScannedService`. The same pattern as `onComponentScanned`: mutate it in place or return a new object, `void` keeps the original, async is supported, and a plugin gets the result of the one before it. Runs in Node.js.

```typescript
onServiceScanned(service) {
  return {
    ...service,
    meta: { ...service.meta, myPlugin: { methods: service.api.methods.length } },
  };
}
```

Services never reach `onComponentScanned`, and components never reach this hook. A service does not appear in `PrismManifest.components`: the manifest has a separate `services` list, so every plugin written before services existed sees the same components as before.

The hook only runs when a plugin shows services. A service page is made by a view [panel](#paneldefinition) (`placement: 'view'`) whose `appliesTo` includes `'service'`, and when no plugin in the config has one (in practice: no `jsDocPlugin()` from 22.7.0 or newer), the build only counts the services: it reads neither their API nor their `setup`, so none of their warnings appear, leaves them out of the manifest, runs no `onServiceScanned` and prints a hint instead, see [Showcasing Services](guide/showcasing-services.md#without-the-jsdoc-plugin). The build reads `placement` and `appliesTo` from the panels of the plugin's Node entry, so a plugin with a browser entry declares both in both.

`ScannedService.api` is the extracted API of the service. Its shape is experimental, see [`ScannedService`](api/types.md#scannedservice).

---

### `onPipeScanned`

Build-time hook (since `22.7.0`) called once per `@Showcase`-decorated [pipe](guide/showcasing-pipes.md), with the `ScannedPipe`. It works like `onServiceScanned`: mutate it in place or return a new object, `void` keeps the original, async is supported, and a plugin gets the result of the one before it. Runs in Node.js.

```typescript
onPipeScanned(pipe) {
  return {
    ...pipe,
    meta: { ...pipe.meta, myPlugin: { signatures: pipe.api.transform.length } },
  };
}
```

Pipes never reach `onComponentScanned` or `onServiceScanned`, and components and services never reach this hook. A pipe does not appear in `PrismManifest.components`: the manifest has a separate `pipes` list, so every plugin written before pipes had a page sees the same components and services as before.

The hook only runs when a plugin shows pipes, decided apart from services: a view [panel](#paneldefinition) (`placement: 'view'`) whose `appliesTo` includes `'pipe'`. When no plugin in the config has one (in practice: no `jsDocPlugin()` from 22.7.0 or newer), the build only counts the pipes: it reads neither their API nor their `setup` and `@Pipe` metadata, so none of their warnings appear, leaves them out of the manifest, runs no `onPipeScanned` and prints a hint instead, see [Showcasing Pipes](guide/showcasing-pipes.md#without-the-jsdoc-plugin). A panel for services alone does not keep the pipes. As for services, a plugin with a browser entry declares `placement` and `appliesTo` in both entries.

`ScannedPipe.api` is the extracted API of the pipe, with `transform` as one entry per overload signature. Its shape is experimental, see [`ScannedPipe`](api/types.md#scannedpipe).

---

### `onPageScanned`

Build-time hook called once per `StyleguidePage`. Same mutation pattern as `onComponentScanned`.

```typescript
onPageScanned(page) {
  if (page.type === 'custom') {
    page.data = enrichPageData(page.data);
  }
}
```

---

### `onManifestReady`

Build-time hook called once with the complete `PrismManifest` after all components, services, pipes and pages have been processed. Use for cross-component transforms or manifest-level filtering. `manifest.services` and `manifest.pipes` are only present when a plugin shows services or pipes.

```typescript
onManifestReady(manifest) {
  // Remove internal-only components from the manifest
  manifest.components = manifest.components.filter(
    (c) => !c.showcaseConfig.tags?.includes('internal'),
  );
}
```

---

### `componentApi`

> **Experimental until 23.0.0**, like [`ComponentApi`](api/types.md#componentapi): it may change in a 22.x minor release.

Set it (since `22.7.0`) when a hook or a panel of the plugin reads `ScannedComponent.api`. Reading the API of every component costs the scan time on each build and on each rebuild of `serve`, and its types make up a large part of the manifest, so the scan reads it, and the manifest carries it, only when a plugin in the config sets `componentApi: true`. `jsDocPlugin()` does, so a config with it needs nothing more.

```typescript
{
    name: '@my-org/plugin-api-stats',
    componentApi: true,
    onComponentScanned(component) {
        return { ...component, meta: { ...component.meta, methodCount: component.api?.methods.length ?? 0 } };
    }
}
```

The build reads it from the plugin's Node entry, like the build-time hooks; a browser entry needs no copy. Even with it, a component can come without `api`: when the scan cannot read it (the build prints a notice) or a hook builds the component from scratch. Read it with `?.`.

---

### `panels`

Array of `PanelDefinition` objects registering new panel tabs at runtime (browser).

```typescript
panels: [
    {
        id: 'my-panel',
        label: 'My Panel',
        loadComponent: () => import('./my-panel.component.js').then((m) => m.MyPanelComponent),
        placement: 'addon'
    }
];
```

---

### `controls`

Array of `ControlDefinition` objects registering custom input controls. The Controls panel checks registered definitions in plugin order before falling back to built-in controls.

```typescript
controls: [
    {
        matchType: (input) => input.rawType === 'CssColor',
        component: ColorPickerControlComponent
    }
];
```

---

### `headerWidgets`

Array of `HeaderWidgetDefinition` objects rendering Angular components inside the Prism shell header bar. Use for library-wide signals such as total coverage, perf budgets or version banners.

```typescript
headerWidgets: [
    {
        id: 'coverage-total',
        placement: 'end',
        order: -10,
        loadComponent: () => import('./coverage-header-badge.component.js').then((m) => m.CoverageHeaderBadgeComponent)
    }
];
```

Widgets typically inject `PRISM_MANIFEST` and read library-wide data from `manifest.meta`. Set library-wide values from `onManifestReady`:

```typescript
async onManifestReady(manifest) {
  return {
    ...manifest,
    meta: { ...manifest.meta, myPlugin: aggregate(manifest.components) },
  };
}
```

---

### `navigationDecorations`

Array of `NavigationDecorationDefinition` objects, each contributing a marker to the sidebar's navigation item for every component. A service or a pipe gets none: `badge` is never called for it. Use for library-wide health signals that should be visible while browsing. The a11y, coverage and visual regression markers all ship as built-ins through this same extension point.

```typescript
navigationDecorations: [
    {
        id: 'todo',
        icon: 'file-text',
        order: 40,
        badge: (component) => {
            const todo = component.meta.showcaseConfig.meta?.['todo'] as { summary?: { variant: 'warn' | 'danger'; label: string } } | undefined;
            return todo?.summary ? { variant: todo.summary.variant, label: todo.summary.label } : null;
        }
    }
];
```

See [`NavigationDecorationDefinition`](#navigationdecorationdefinition) for the full field reference and the reserved `order` values, and [Example: a complete navigation decoration plugin](#example-a-complete-navigation-decoration-plugin) for a runnable one.

---

### `wrapComponent`

> **Deprecated since 22.6.0, removed in 23.0.0.** `wrapComponent` has been on `NgPrismPlugin` since the first release, but nothing has ever read it, so setting it never had an effect. While a plugin sets it, the build prints a notice; remove it. A component that needs providers gets them from `defineConfig({ appProviders })` or a [component page](guide/component-pages.md).

---

## PanelDefinition

```typescript
interface PanelDefinition {
    id: string;
    label: string;
    component?: Type<unknown>;
    loadComponent?: () => Promise<Type<unknown>>;
    overlayComponent?: Type<unknown>;
    loadOverlayComponent?: () => Promise<Type<unknown>>;
    icon?: string;
    position?: 'bottom' | 'right'; // deprecated, no effect
    placement?: 'addon' | 'view';
    appliesTo?: readonly PanelTarget[];
    providers?: Provider[];
    isVisible?: (component: RuntimeComponent) => boolean;
    badge?: (component: RuntimeComponent) => PanelBadge | null;
    keepAlive?: boolean;
}
```

| Field                  | Description                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | Unique panel ID. Collision with built-in IDs overwrites the built-in panel.                                                                                                                                          |
| `label`                | Tab label shown in the panel tab bar                                                                                                                                                                                 |
| `component`            | Static Angular component. Avoid for browser-only deps                                                                                                                                                                |
| `loadComponent`        | Lazy-loaded component (preferred when importing `@angular/platform-browser` or DOM APIs)                                                                                                                             |
| `overlayComponent`     | Component rendered as a canvas overlay (e.g. visual annotations)                                                                                                                                                     |
| `loadOverlayComponent` | Lazy-loaded canvas overlay                                                                                                                                                                                           |
| `icon`                 | Icon identifier (optional, theme-dependent)                                                                                                                                                                          |
| `position`             | _Deprecated since 22.6.0, never had an effect: nothing reads it. Where a panel appears is `placement`._                                                                                                              |
| `placement`            | `'addon'` = bottom tab bar, `'view'` = view toolbar toggle                                                                                                                                                           |
| `appliesTo`            | Where the panel appears: `['component']` (the default), `['service']`, `['pipe']` or several (since `22.7.0`). See [Panels on service and pipe pages](#panels-on-service-and-pipe-pages)                             |
| `providers`            | Providers scoped to this panel's child `EnvironmentInjector`                                                                                                                                                         |
| `isVisible`            | Predicate. When provided, the panel tab is only shown if it returns `true` for the active component                                                                                                                  |
| `badge`                | When provided, the panel's tab carries a [badge](#panelbadge) for the active component. Return `null` for "nothing worth saying".                                                                                    |
| `keepAlive`            | When `true`, the panel component is rendered once on first activation and merely hidden (instead of destroyed) on tab switch. Use for expensive panels like iframes, remote previews or heavy DOM. Default: `false`. |

> **Note:** Always prefer `loadComponent` over `component`. The config file is evaluated by the Angular builder in Node.js, and a static import of a component that uses `DomSanitizer` or any browser global will crash the build.

### Panels on service and pipe pages

```typescript
type PanelTarget = 'component' | 'service' | 'pipe';
```

A [service](guide/showcasing-services.md) or [pipe](guide/showcasing-pipes.md) page has no canvas, so it offers only the view panels that say they apply to it. `appliesTo` names where a panel appears. Without it a panel is a component panel, so a panel written before services and pipes existed does not show up on their pages and is not handed anything new.

| `appliesTo`                        | Component pages | Service pages      | Pipe pages         | A view panel receives                                                        |
| ---------------------------------- | --------------- | ------------------ | ------------------ | ---------------------------------------------------------------------------- |
| _unset_ or `['component']`         | yes             | no                 | no                 | input `activeComponent`                                                      |
| `['service']`                      | no              | yes, as a view tab | no                 | input `activeService`                                                        |
| `['pipe']`                         | no              | no                 | yes, as a view tab | input `activePipe`                                                           |
| `['component', 'service', 'pipe']` | yes             | yes, as a view tab | yes, as a view tab | one input per kind it names, the ones that do not apply on screen are `null` |

An addon panel (`placement: 'addon'`, the default) only ever appears below the canvas of a component page and receives `activeComponent` alone. For it, `appliesTo` only matters for `'component'`: with `['service']` or `['pipe']` it shows nowhere.

- **`activeService`** is a `RuntimeService | null`. A panel reads the API of the service from `activeService()?.meta.api`, a `ServiceApi`, and its `className`, `provision`, `importPath` and `showcaseConfig` from `meta`.
- **`activePipe`** is a `RuntimePipe | null`. A panel reads the signatures from `activePipe()?.meta.api.transform`, a `PipeApi`, and `className`, `pipeName`, `pure`, `importPath` and `showcaseConfig` from `meta`.
- **Only the inputs of the named targets.** A panel only receives the inputs of the targets it names, so a component-only panel never logs a warning about an input it does not declare.
- **`placement: 'view'`** is what a service or pipe page shows: its view tab bar, with no Playground or Overview in front of it. A panel for services or pipes with `placement: 'addon'` has no area on those pages and never shows. Say `placement: 'view'`. A component view that is still selected when the reader opens a service or a pipe is not drawn there.
- **`isVisible` and `badge`** take a component and are only called for component pages. On a service or pipe page every panel that applies to it is offered.
- **The build looks at this field, once per kind.** A service is read and goes into the manifest only when some plugin has a view panel that applies to services, and a pipe only when one applies to pipes; otherwise the build only counts them and prints a hint, see [`onServiceScanned`](#onservicescanned) and [`onPipeScanned`](#onpipescanned). `jsDocPlugin()` from 22.7.0 on is the panel that does both.

```typescript
panels: [
    {
        id: 'service-notes',
        label: 'Notes',
        placement: 'view',
        appliesTo: ['service'],
        loadComponent: () => import('./service-notes.component.js').then((m) => m.ServiceNotesComponent)
    }
];
```

```typescript
@Component({
    selector: 'app-service-notes',
    standalone: true,
    template: `<h4>Notes for {{ activeService()?.meta.className }}</h4>`
})
export class ServiceNotesComponent {
    readonly activeService = input<RuntimeService | null>(null);
}
```

---

## PanelBadge

```typescript
interface PanelBadge {
    text: string;
    variant?: 'default' | 'ok' | 'warn' | 'danger';
}
```

A short marker on a panel's tab, returned by [`PanelDefinition.badge`](#paneldefinition).

| Field     | Description                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `text`    | Usually a count. Keep it to a couple of characters, since the tab bar scrolls horizontally on a narrow panel. |
| `variant` | Colour role. `default` is a neutral tint for a plain count; `ok` / `warn` / `danger` carry a judgement.       |

```typescript
panels: [
    {
        id: 'visual-regression',
        label: 'Visual Regression',
        badge: (component) => {
            const open = countOpenItems(component);
            return open ? { text: String(open), variant: 'danger' } : null;
        },
        loadComponent: () => import('./panel.component.js').then((m) => m.Panel)
    }
];
```

Two rules make the difference between a badge and decoration:

- **Return `null` when there is nothing to report.** A badge that is always present stops being a signal: a green `0` on every tab trains people to ignore the one tab showing `3`.
- **Keep it cheap and pure.** The callback runs during change detection. Read what the component's `meta` already holds; do not fetch, and do not inject (a badge has no injection context).

---

## ControlDefinition

```typescript
interface ControlDefinition {
    matchType: (input: InputMeta) => boolean;
    component: Type<unknown>;
}
```

| Field       | Description                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `matchType` | Predicate called with the `InputMeta` for each input. Return `true` to use this control.                      |
| `component` | Angular standalone component rendered as the input control. Receives `inputMeta: InputMeta` as an `@Input()`. |

---

## HeaderWidgetDefinition

```typescript
interface HeaderWidgetDefinition {
    id: string;
    component?: Type<unknown>;
    loadComponent?: () => Promise<Type<unknown>>;
    placement?: 'start' | 'end';
    order?: number;
}
```

| Field           | Description                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | Unique widget ID.                                                                                                                 |
| `component`     | Static Angular component. Avoid for browser-only deps.                                                                            |
| `loadComponent` | Lazy-loaded component. Preferred, because the builder evaluates the config in Node.js.                                            |
| `placement`     | `'start'` renders next to the brand block; `'end'` (default) renders inside the existing actions area, before theme/menu buttons. |
| `order`         | Sort order within the same placement (lower = earlier). Default `0`.                                                              |

> **Note:** Header widgets are root-level components. They commonly inject `PRISM_MANIFEST` from `@ng-prism/core/plugin` to access library-wide `manifest.meta` data written by `onManifestReady`.

---

## PrismMetricBadgeComponent

Exported from the main `@ng-prism/core` entry (not `@ng-prism/core/plugin`, since it is an `@Component` class and the plugin entry stays evaluable in Node.js). The presentational badge every built-in header widget renders through. A11y, coverage and visual regression all use it, so the three badges share one appearance instead of three near-identical ones.

```typescript
import { PrismMetricBadgeComponent } from '@ng-prism/core';
```

| Input     | Type                         | Required | Description                                                                                                                                                                                                                                 |
| --------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon`    | `string`                     | yes      | Name from the built-in icon registry (`ICON_NAMES`). Convention: reuse the same icon the source contributes to `navigationDecorations` and its panel tab, so one glyph means one source everywhere it appears.                              |
| `value`   | `string`                     | yes      | The already-formatted figure, e.g. `'87%'`. The component does no formatting or unit conversion of its own.                                                                                                                                 |
| `label`   | `string`                     | yes      | Human-readable name for the metric, e.g. `'Library coverage'`. Composed with `value` into the accessible name (`"label: value"`), so the figure cannot be dropped by a caller that only sets `label`.                                       |
| `title`   | `string`                     | no       | Full text for the hover tooltip. Defaults to `label` when omitted.                                                                                                                                                                          |
| `variant` | `'ok' \| 'warn' \| 'danger'` | no       | Colour role, drawn from `--prism-mark-attention` / `--prism-mark-critical`. Default `'ok'`, which renders with no accent colour at all (see [Marks, Measurement and Stage Tokens](../guide/theming.md#marks-measurement-and-stage-tokens)). |

The icon is `aria-hidden`; the badge's own `role="img"` and computed `aria-label` carry the accessible name instead.

---

## PrismIconComponent

Also exported from the main entry. Renders one glyph from the shared registry as an inline `<svg>` sized in pixels. It uses the same registry `PanelDefinition.icon` and `NavigationDecorationDefinition.icon` names resolve against.

```typescript
import { PrismIconComponent } from '@ng-prism/core';
```

| Input  | Type     | Required | Description                                                                                                                                |
| ------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `name` | `string` | yes      | Icon name from the registry (`ICON_NAMES`). An unknown name renders an empty, correctly-sized glyph and logs one console warning per name. |
| `size` | `number` | no       | Width and height in pixels. Default `16`.                                                                                                  |

`ICON_NAMES` itself, the list of valid `name` values, is also re-exported from `@ng-prism/core/plugin`, from a dependency-free module, so a plugin's Node-evaluated entry can validate or reference an icon name without pulling `@angular/core` into a module graph the builder loads in Node.js.

### Example: a header widget built from both

The shipped `@ng-prism/plugin-coverage` header badge is the reference for this pattern: a `PrismMetricBadgeComponent` driven by manifest data and registered as a `headerWidgets` entry:

```typescript
// coverage-header-badge.component.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PRISM_MANIFEST, type RuntimeManifest } from '@ng-prism/core/plugin';
import { PrismMetricBadgeComponent } from '@ng-prism/core';

@Component({
    selector: 'prism-coverage-header-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricBadgeComponent],
    template: `
        @if (data(); as d) {
            <prism-metric-badge icon="shield-check" label="Library coverage" [value]="d.score + '%'" [variant]="d.variant" [title]="d.title" />
        }
    `
})
export class CoverageHeaderBadgeComponent {
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);

    protected readonly data = computed(() => {
        const meta = this.manifest.meta?.['coverage'] as { total?: { found: boolean; score: number } } | undefined;
        if (!meta?.total?.found) return null;
        return {
            score: meta.total.score,
            variant: 'ok' as const,
            title: 'Library coverage'
        };
    });
}
```

Registered the usual way:

```typescript
headerWidgets: [
    {
        id: 'coverage-total',
        placement: 'end',
        order: -10,
        loadComponent: () => import('./coverage-header-badge.component.js').then((m) => m.CoverageHeaderBadgeComponent)
    }
];
```

`PrismIconComponent` is available the same way for a panel or header widget that needs a bare glyph rather than a full metric badge: `<prism-icon name="camera" [size]="14" />`.

---

## NavigationDecorationDefinition

```typescript
interface NavigationDecorationDefinition {
    id: string;
    icon: string;
    order?: number;
    badge: (component: RuntimeComponent) => NavigationDecoration | null;
}
```

| Field   | Description                                                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | Unique id, used for de-duplication when two plugins contribute the same source. Built-ins win a collision: a plugin cannot silence or restyle `a11y`, `visual-regression` or `coverage` by reusing their id.                        |
| `icon`  | Icon name from the built-in registry (`ICON_NAMES`). Built-in sources use `accessibility`, `camera` and `shield-check`.                                                                                                             |
| `order` | Fixed slot order (lower = further left in the sidebar's trailing marker group). Position alone names the source to the reader, so a decoration must not move depending on plugin registration order. See the reserved values below. |
| `badge` | The component's standing for this source, or `null` for "nothing worth saying". See [`NavigationDecoration`](#navigationdecoration) and the rules below.                                                                            |

The built-in sources reserve these `order` values. Pick something else (`40`, `50`, ...) for a new source so its marker does not interleave with them:

| `order` | Source                                                   |
| ------- | -------------------------------------------------------- |
| `10`    | A11y (core)                                              |
| `20`    | Visual Regression (`@ng-prism/plugin-visual-regression`) |
| `30`    | Coverage (`@ng-prism/plugin-coverage`)                   |

A decoration has to follow three rules:

- **Return `null` for anything healthy.** There is no `'ok'` variant on `NavigationDecoration`, because a marker that is always present stops being a signal (same reasoning as [`PanelDefinition.badge`](#panelbadge)). The per-source summary types stored in build-time `meta` (e.g. `CoverageSummary`, `VrtStat`) are three-valued and do include `'ok'`, because the hook that writes them needs to represent "healthy" as a real value; `badge()` is where the plugin narrows a three-valued verdict down to the two-valued public type, by returning `null` instead of passing `'ok'` through.
- **Keep it cheap and pure.** `badge()` runs during change detection: read what `component.meta.showcaseConfig.meta` already holds, do not fetch, and do not inject. A decoration has no injection context.
- **Decide the threshold at build time, not here.** `badge()` only ever sees one component, so it has no way to know what counts as "bad" for the library as a whole. Whether 72% coverage is fine or a regression, each built-in source decides once, in `onComponentScanned`, where the full picture (thresholds, aggregates) is available, and stores the verdict under its own key in `component.showcaseConfig.meta`, by convention as a `summary: { variant, label }` field. `badge()` then does nothing but read that field back. See `packages/plugin-visual-regression/src/panel-contributions.ts` and `packages/plugin-coverage/src/coverage-contributions.ts` for the shipped pattern, and [Plugin Hooks](architecture/plugin-hooks.md) for the full rationale.

---

## NavigationDecoration

```typescript
interface NavigationDecoration {
    variant: 'warn' | 'danger';
    label: string;
}
```

What one source has to say about one component, returned by [`NavigationDecorationDefinition.badge`](#navigationdecorationdefinition).

| Field     | Description                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | Colour role. Only two exist; see the "return `null`" rule above.                                                                                                      |
| `label`   | One tooltip line for this source, e.g. `'A11y: 2 critical, 1 serious'`. Several sources on the same component join their labels with a newline in the item's tooltip. |

---

## Example: a complete navigation decoration plugin

A self-contained plugin that flags components with open `// TODO` comments. It follows the same three-file split every shipped plugin with a build-time hook uses. This example mirrors `packages/plugin-coverage/src/coverage-plugin.ts`, `coverage-plugin.browser.ts` and `coverage-contributions.ts`.

The split exists because the generated Prism app imports the config directly (see the schematic that wires it in, `packages/ng-prism/src/schematics/ng-add/index.ts`), so the config module and every plugin it imports also land in the browser bundle, in addition to the Node.js process that runs the builder. A plugin file with a top-level `import { readFileSync } from 'node:fs'` crashes as soon as that bundle loads it, even though `onComponentScanned` never runs in the browser.

Three files close that gap:

- **`todo-marker-contributions.ts`**: no `node:` imports, no Angular. Declares the `navigationDecorations` entry once, so both entries below share the exact same `badge()` and can't drift apart.
- **`todo-marker-plugin.ts`**: the **Node entry**, resolved when the builder loads the config. Carries `onComponentScanned`. Still no _static_ `node:` import: `readFileSync` is loaded with a dynamic `import()` inside the hook, the same shape `coverage-plugin.ts` uses to load `coverage-reader.js`. A dynamic import only executes when the hook actually runs, which is never in a browser bundle.
- **`todo-marker-plugin.browser.ts`**: the **browser entry**, resolved when the Prism app itself loads the config. No build-time hooks at all, only the runtime contribution, reading back whatever the Node entry already wrote to `meta` during the last build.

```typescript
// todo-marker-contributions.ts: shared by both entries, dependency-free
import type { NavigationDecorationDefinition, RuntimeComponent } from '@ng-prism/core/plugin';

export interface TodoSummary {
    variant: 'warn' | 'danger';
    label: string;
}

export interface TodoMeta {
    count: number;
    /** Pre-derived verdict, written by the build-time hook in todo-marker-plugin.ts. */
    summary?: TodoSummary;
}

function todoMeta(component: RuntimeComponent): TodoMeta | undefined {
    return component.meta.showcaseConfig.meta?.['todo'] as TodoMeta | undefined;
}

export const TODO_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
    id: 'todo',
    icon: 'file-text',
    order: 40,
    badge: (component) => {
        const todo = todoMeta(component);
        return todo?.summary ? { variant: todo.summary.variant, label: todo.summary.label } : null;
    }
};
```

```typescript
// todo-marker-plugin.ts: Node entry, loaded by the builder
import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { TODO_NAVIGATION_DECORATION, type TodoMeta } from './todo-marker-contributions.js';

export function todoMarkerPlugin(): NgPrismPlugin {
    return {
        name: '@my-org/plugin-todo-marker',

        // Build time only: count `// TODO` markers and decide the verdict once,
        // here and not in `badge()`, which never sees more than one component and
        // cannot know what "too many" means for the library as a whole.
        async onComponentScanned(component) {
            const { readFileSync } = await import('node:fs');
            const source = readFileSync(component.filePath, 'utf-8');
            const count = (source.match(/\/\/\s*TODO/g) ?? []).length;

            const todo: TodoMeta = {
                count,
                ...(count > 0
                    ? {
                          summary: {
                              variant: count >= 5 ? 'danger' : 'warn',
                              label: `${count} open TODO${count === 1 ? '' : 's'}`
                          }
                      }
                    : {})
            };

            return {
                ...component,
                showcaseConfig: {
                    ...component.showcaseConfig,
                    meta: { ...component.showcaseConfig.meta, todo }
                }
            };
        },

        navigationDecorations: [TODO_NAVIGATION_DECORATION]
    };
}
```

```typescript
// todo-marker-plugin.browser.ts: browser entry, loaded by the Prism app itself
import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { TODO_NAVIGATION_DECORATION } from './todo-marker-contributions.js';

export function todoMarkerPlugin(): NgPrismPlugin {
    return {
        name: '@my-org/plugin-todo-marker',
        // Runtime only: read the pre-derived verdict back. No file access, no
        // computation, no build-time hooks. Just the shared contribution.
        navigationDecorations: [TODO_NAVIGATION_DECORATION]
    };
}
```

The two entries are the same exported function name in two files; a `"browser"` export condition in `package.json` picks between them so consumers write one import and get whichever twin fits where their bundle runs:

```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "browser": "./dist/index.browser.js",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    }
}
```

`packages/plugin-coverage/package.json` and `packages/plugin-visual-regression/package.json` carry the shipped version of this map: each `index.ts` re-exports the Node entry, each `index.browser.ts` re-exports the browser entry. See [Plugin Hooks](architecture/plugin-hooks.md#navigation-decorations) for why the threshold decision has to live in the Node entry's hook and never in `badge()`.
