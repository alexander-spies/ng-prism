# Writing a Plugin

A plugin is a plain JavaScript object conforming to the `NgPrismPlugin` interface. Use `defineConfig()` for type safety on the config and return the plugin object from a factory function.

## The NgPrismPlugin Interface

```typescript
interface NgPrismPlugin {
    name: string;

    // Build-time hooks (run in Node.js)
    onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void | Promise<ScannedComponent | void>;
    onServiceScanned?: (service: ScannedService) => ScannedService | void | Promise<ScannedService | void>;
    onPipeScanned?: (pipe: ScannedPipe) => ScannedPipe | void | Promise<ScannedPipe | void>;
    onPageScanned?: (page: StyleguidePage) => StyleguidePage | void | Promise<StyleguidePage | void>;
    onManifestReady?: (manifest: PrismManifest) => PrismManifest | void | Promise<PrismManifest | void>;
    componentApi?: boolean; // experimental: have the scan read ScannedComponent.api

    // Runtime contributions (run in the browser)
    panels?: PanelDefinition[];
    controls?: ControlDefinition[];
    wrapComponent?: Type<unknown>; // deprecated, no effect
}
```

## Build-Time Hooks

Build-time hooks run inside the Angular builder (Node.js). They must not import browser-only APIs.

### `onComponentScanned`

Called once per `@Showcase`-decorated component after the scanner extracts all metadata. Mutate the component object to add or change data, or return a new object. Returning `void` keeps the original.

```typescript
export function myPlugin(): NgPrismPlugin {
    return {
        name: 'my-plugin',
        onComponentScanned(component) {
            // Add extra metadata for the runtime panel to consume
            component.meta = {
                ...component.meta,
                myPlugin: {
                    customData: computeSomething(component)
                }
            };
        }
    };
}
```

`component.api` (since `22.7.0`) holds the extracted API of the component or directive: the type of each input, the payload of each output, the documented methods and the types they reach, see [`ComponentApi`](api/types.md#componentapi). The scan only reads it when a plugin in the config sets `componentApi: true` (`jsDocPlugin()` does), so a plugin that reads it sets the flag itself, in its Node entry:

```typescript
export function apiStatsPlugin(): NgPrismPlugin {
    return {
        name: 'api-stats',
        componentApi: true,
        onComponentScanned(component) {
            return { ...component, meta: { ...component.meta, methodCount: component.api?.methods.length ?? 0 } };
        }
    };
}
```

Its shape, and the flag, are experimental until 23.0.0 and may change in a 22.x minor release. It is absent without such a plugin, when the scan cannot read it, and on a component that another hook built from scratch; `className`, `inputs`, `outputs`, `showcaseConfig` and `meta` are stable. Keep your own data in `meta` and read `component.api` with `?.`, knowing it can change.

### `onServiceScanned`

Called once per `@Showcase`-decorated [service](guide/showcasing-services.md), with the `ScannedService`. Same pattern as `onComponentScanned`, and a service never goes through that hook: it has its own list, `manifest.services`.

```typescript
onServiceScanned(service) {
  return {
    ...service,
    meta: { ...service.meta, myPlugin: { setupEntries: service.api.setup.length } },
  };
}
```

`service.api` holds the extracted API (members, setup, types). Its shape is experimental until 23.0.0 and may change in a 22.x minor release; `className`, `importPath`, `showcaseConfig`, `provision` and `meta` are stable. The hook only runs when some plugin has a panel that [applies to services](#panels-for-services-and-pipes), otherwise the build only counts the services, without reading them, and leaves them out.

### `onPipeScanned`

Called once per `@Showcase`-decorated [pipe](guide/showcasing-pipes.md), with the `ScannedPipe`. Same pattern as `onServiceScanned`, and a pipe never goes through that hook or `onComponentScanned`: it has its own list, `manifest.pipes`.

```typescript
onPipeScanned(pipe) {
  return {
    ...pipe,
    meta: { ...pipe.meta, myPlugin: { signatures: pipe.api.transform.length } },
  };
}
```

`pipe.api` holds the extracted API (`transform` signatures, setup, types). Its shape is experimental until 23.0.0 and may change in a 22.x minor release; `className`, `pipeName`, `pure`, `importPath`, `showcaseConfig` and `meta` are stable. The hook only runs when some plugin has a panel that [applies to pipes](#panels-for-services-and-pipes), otherwise the build only counts the pipes, without reading them, and leaves them out. Services and pipes are decided apart: a panel for services alone does not keep the pipes.

### `onPageScanned`

Called once per `StyleguidePage` (both `CustomPage` and `ComponentPage`). Same mutation pattern as `onComponentScanned`.

```typescript
onPageScanned(page) {
  if (page.type === 'custom') {
    page.data = { ...page.data, processedAt: Date.now() };
  }
}
```

### `onManifestReady`

Called once with the full `PrismManifest` after all components and pages have been processed. Use for cross-component transformations or manifest-level additions.

```typescript
onManifestReady(manifest) {
  manifest.components = manifest.components.filter(
    (c) => !c.showcaseConfig.tags?.includes('internal'),
  );
}
```

### Async Hooks

All four hooks support returning a `Promise`. The pipeline awaits them before continuing.

```typescript
async onComponentScanned(component) {
  const data = await fetchExternalMetadata(component.className);
  component.meta = { ...component.meta, external: data };
}
```

## Runtime Contributions

Runtime contributions are evaluated in the browser. Do not place Node.js-only code here.

### `panels`

An array of `PanelDefinition` objects. Each registers a new panel tab.

```typescript
panels: [
  {
    id: 'my-panel',
    label: 'My Panel',
    loadComponent: () => import('./my-panel.component.js').then(m => m.MyPanelComponent),
    placement: 'addon',
  },
],
```

See [PanelDefinition](api/ng-prism-plugin.md#paneldefinition) for all fields.

#### Panels for services and pipes

A [service](guide/showcasing-services.md) or [pipe](guide/showcasing-pipes.md) page (since `22.7.0`) has no canvas, so it offers only the view panels that say they apply to it. Without `appliesTo` (since `22.7.0`), a panel is a component panel and does not appear there.

```typescript
panels: [
  {
    id: 'service-notes',
    label: 'Notes',
    placement: 'view',
    appliesTo: ['service'],
    loadComponent: () => import('./service-notes.component.js').then(m => m.ServiceNotesComponent),
  },
],
```

- `appliesTo: ['component']` is the default, `['service']` is for services only, `['pipe']` for pipes only, and a list names several, for example `['component', 'service', 'pipe']`.
- The panel component gets the input `activeService` (`RuntimeService | null`) when it applies to services, `activePipe` (`RuntimePipe | null`) when it applies to pipes, and `activeComponent` when it applies to components. It only gets the inputs of the targets it names, so a panel written before services and pipes existed is not affected.
- Use `placement: 'view'`: a service or pipe page shows view tabs only. An addon panel appears on component pages alone, so for it `appliesTo` only decides whether it applies to `'component'`: with `['service']` or `['pipe']` it shows nowhere.
- `isVisible` and `badge` take a component and are only called on component pages.
- The build reads `placement` and `appliesTo` from the panels the plugin's **Node entry** declares, to decide whether anything shows services or pipes: only a view panel that applies to services counts for services, and one that applies to pipes for pipes. A plugin with a [browser entry](api/ng-prism-plugin.md#example-a-complete-navigation-decoration-plugin) declares the same `placement` and `appliesTo` in both.

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

`activeService()?.meta.api` is the extracted API of the service (`ServiceApi`, experimental until 23.0.0). On a pipe page, a panel with `appliesTo: ['pipe']` declares `readonly activePipe = input<RuntimePipe | null>(null);` and reads `activePipe()?.meta.api.transform` (`PipeApi`, experimental until 23.0.0) and `activePipe()?.meta.pipeName`. On a component page, a panel reads `activeComponent()?.meta.api` (`ComponentApi`, experimental until 23.0.0). The manifest only carries it when a plugin in the config sets `componentApi: true`, so a plugin whose panel reads it sets the flag in its Node entry; it is also absent on a component that a hook built from scratch.

### `controls`

An array of `ControlDefinition` objects. Each registers a custom input control for inputs whose type matches `matchType`.

```typescript
controls: [
  {
    matchType: (input) => input.rawType === 'ColorValue',
    component: ColorPickerControlComponent,
  },
],
```

The Controls panel checks registered `ControlDefinition` entries in plugin registration order before falling back to the built-in controls.

### `wrapComponent`

> **Deprecated since 22.6.0, removed in 23.0.0.** `wrapComponent` has been on `NgPrismPlugin` since the first release, but nothing has ever read it, so setting it never had an effect. While a plugin sets it, the build prints a notice; remove it. A component that needs providers gets them from `defineConfig({ appProviders })` or a [component page](guide/component-pages.md).

## Header and Panel Widgets

`@ng-prism/core` (the main entry, not `@ng-prism/core/plugin`) exports two presentational components for building a `headerWidgets` entry or a panel's own chrome, so a plugin does not have to invent its own metric pill or reimplement icon rendering:

```typescript
import { PrismMetricBadgeComponent, PrismIconComponent } from '@ng-prism/core';
```

### `PrismMetricBadgeComponent`

The pill every built-in header widget (a11y, coverage, visual regression) renders through.

| Input     | Type                         | Required | Description                                                                                                           |
| --------- | ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `icon`    | `string`                     | yes      | Icon name from the registry. Reuse the same one the source uses for its `navigationDecorations` marker and panel tab. |
| `value`   | `string`                     | yes      | Already-formatted figure, e.g. `'87%'`.                                                                               |
| `label`   | `string`                     | yes      | Metric name, composed into the accessible name as `"label: value"`.                                                   |
| `title`   | `string`                     | no       | Tooltip text. Defaults to `label`.                                                                                    |
| `variant` | `'ok' \| 'warn' \| 'danger'` | no       | Colour role. Default `'ok'`, which draws no accent colour at all.                                                     |

### `PrismIconComponent`

Renders one glyph from the same registry `PanelDefinition.icon` resolves against, as a sized inline `<svg>`.

| Input  | Type     | Required | Description                                 |
| ------ | -------- | -------- | ------------------------------------------- |
| `name` | `string` | yes      | Icon name from the registry (`ICON_NAMES`). |
| `size` | `number` | no       | Width/height in pixels. Default `16`.       |

### Example

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
            <prism-metric-badge icon="shield-check" label="Library coverage" [value]="d.score + '%'" [variant]="d.variant" />
        }
    `
})
export class CoverageHeaderBadgeComponent {
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
    protected readonly data = computed(() => {
        const meta = this.manifest.meta?.['coverage'] as { total?: { found: boolean; score: number } } | undefined;
        return meta?.total?.found ? { score: meta.total.score, variant: 'ok' as const } : null;
    });
}
```

Registered like any other `headerWidgets` entry; see [`HeaderWidgetDefinition`](api/ng-prism-plugin.md#headerwidgetdefinition). Full field reference: [`PrismMetricBadgeComponent`](api/ng-prism-plugin.md#prismmetricbadgecomponent) and [`PrismIconComponent`](api/ng-prism-plugin.md#prismiconcomponent).

## PanelDefinition Fields

| Field                  | Type                  | Description                                                                                                                                           |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | `string`              | Unique panel identifier                                                                                                                               |
| `label`                | `string`              | Tab label                                                                                                                                             |
| `component`            | `Type<unknown>`       | Static panel component                                                                                                                                |
| `loadComponent`        | `() => Promise<Type>` | Lazy-loaded panel component (use when importing browser-only APIs)                                                                                    |
| `overlayComponent`     | `Type<unknown>`       | Canvas overlay component                                                                                                                              |
| `loadOverlayComponent` | `() => Promise<Type>` | Lazy-loaded canvas overlay                                                                                                                            |
| `icon`                 | `string`              | Icon name (optional)                                                                                                                                  |
| `position`             | `'bottom' \| 'right'` | _Deprecated since 22.6.0, removed in 23.0.0. Never had an effect; where a panel appears is `placement`._                                              |
| `placement`            | `'addon' \| 'view'`   | `addon` = bottom tab bar, `view` = top view toolbar                                                                                                   |
| `appliesTo`            | `PanelTarget[]`       | `['component']` (default), `['service']`, `['pipe']` or several (since `22.7.0`), see [Panels for services and pipes](#panels-for-services-and-pipes) |
| `providers`            | `Provider[]`          | Providers scoped to this panel's injector                                                                                                             |

> **Note:** Always use `loadComponent` rather than `component` if your panel component imports anything from `@angular/platform-browser` or any other browser-only package. The config file is loaded in Node.js during the build, and a static import of a browser component crashes the builder.

## Example: Minimal Panel Plugin

```typescript
// my-notes-plugin.ts
import type { NgPrismPlugin } from '@ng-prism/core/plugin';

export function myNotesPlugin(): NgPrismPlugin {
    return {
        name: 'my-notes-plugin',
        panels: [
            {
                id: 'notes',
                label: 'Notes',
                loadComponent: () => import('./notes-panel.component.js').then((m) => m.NotesPanelComponent),
                placement: 'addon'
            }
        ]
    };
}
```

```typescript
// notes-panel.component.ts
import { Component, inject } from '@angular/core';
import { PrismNavigationService } from '@ng-prism/core';

@Component({
    selector: 'app-notes-panel',
    standalone: true,
    template: `
        <div class="notes">
            <h4>Notes for {{ componentTitle() }}</h4>
            <textarea placeholder="Write notes here…"></textarea>
        </div>
    `
})
export class NotesPanelComponent {
    private readonly nav = inject(PrismNavigationService);

    componentTitle() {
        return this.nav.activeComponent()?.meta.showcaseConfig.title ?? '—';
    }
}
```

## Example: Custom Control Plugin

```typescript
import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { ColorSwatchControlComponent } from './color-swatch-control.component.js';

export function colorSwatchPlugin(): NgPrismPlugin {
    return {
        name: 'color-swatch-plugin',
        controls: [
            {
                matchType: (input) => input.rawType?.startsWith('Color') === true || input.name.toLowerCase().includes('color'),
                component: ColorSwatchControlComponent
            }
        ]
    };
}
```

The `ColorSwatchControlComponent` receives `inputMeta` and `rendererService` as inputs from the Controls panel, so there is no need to `inject()` the service:

```typescript
@Component({
    selector: 'app-color-swatch-control',
    standalone: true,
    template: ` <input type="color" [value]="currentValue()" (change)="onChange($event)" /> `
})
export class ColorSwatchControlComponent {
    readonly inputMeta = input.required<InputMeta>();
    readonly rendererService = input.required<PrismRendererService>();

    currentValue = computed(() => (this.rendererService().inputValues()[this.inputMeta().name] as string) ?? '#000000');

    onChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.rendererService().updateInput(this.inputMeta().name, value);
    }
}
```
