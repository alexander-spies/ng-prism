---
name: prism-plugin
description: Creates ng-prism plugins following the NgPrismPlugin interface. Triggers on "create plugin", "new plugin", "add plugin", "plugin for".
---

# ng-prism Plugin Creation Guide

Create plugins that extend ng-prism via the `NgPrismPlugin` interface.

## Plugin Interface

```typescript
interface NgPrismPlugin {
    name: string;

    // Build-time hooks (run in Node.js during scanning)
    onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void | Promise<ScannedComponent | void>;
    // Services (@Showcase + @Injectable/@Service) never reach onComponentScanned; they get this hook (since 22.7.0)
    onServiceScanned?: (service: ScannedService) => ScannedService | void | Promise<ScannedService | void>;
    // Pipes (@Showcase + @Pipe) have their own hook and list as well, apart from components and services (since 22.7.0)
    onPipeScanned?: (pipe: ScannedPipe) => ScannedPipe | void | Promise<ScannedPipe | void>;
    onPageScanned?: (page: StyleguidePage) => StyleguidePage | void | Promise<StyleguidePage | void>;
    onManifestReady?: (manifest: PrismManifest) => PrismManifest | void | Promise<PrismManifest | void>;

    // Runtime contributions (embedded in the Prism app)
    panels?: PanelDefinition[];
    controls?: ControlDefinition[];
    headerWidgets?: HeaderWidgetDefinition[];
    navigationDecorations?: NavigationDecorationDefinition[];
    wrapComponent?: Type<unknown>; // deprecated since 22.6.0, never had an effect
}
```

## Plugin Template

```typescript
// packages/plugin-example/src/example-plugin.ts
import type { NgPrismPlugin, ScannedComponent, PrismManifest } from '@ng-prism/core/plugin';

export interface ExamplePluginOptions {
    enabled?: boolean;
}

export function examplePlugin(options: ExamplePluginOptions = {}): NgPrismPlugin {
    return {
        name: 'example',

        onComponentScanned(component: ScannedComponent) {
            // Modify or enrich component metadata
            component.meta = {
                ...component.meta,
                example: { processed: true }
            };
            return component;
        },

        onManifestReady(manifest: PrismManifest) {
            // Post-process the full manifest
            console.log(`[example] Scanned ${manifest.components.length} components`);
            return manifest;
        }
    };
}
```

## Plugin Registration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { examplePlugin } from '@ng-prism/plugin-example';

export default defineConfig({
    plugins: [examplePlugin({ enabled: true })],
    appProviders: []
});
```

## Plugin with Panels

```typescript
import type { NgPrismPlugin, PanelDefinition, InputMeta } from '@ng-prism/core/plugin';
import { Type } from '@angular/core';

export function a11yPlugin(): NgPrismPlugin {
    return {
        name: 'a11y',

        panels: [
            {
                id: 'a11y',
                label: 'Accessibility',
                // Lazy — see the PR checklist: plugin runtime components are loaded
                // on demand, not pulled into the main bundle via `component:`.
                loadComponent: () => import('./a11y-panel.component').then((m) => m.A11yPanelComponent),
                icon: 'accessibility'
            }
        ]
    };
}
```

### PanelDefinition — full shape

```typescript
interface PanelDefinition {
    id: string;
    label: string;
    component?: Type<unknown>; // eager — prefer loadComponent
    loadComponent?: () => Promise<Type<unknown>>; // lazy, the default choice
    overlayComponent?: Type<unknown>; // canvas overlay
    loadOverlayComponent?: () => Promise<Type<unknown>>;
    icon?: string;
    position?: 'bottom' | 'right'; // deprecated since 22.6.0, never had an effect
    placement?: 'addon' | 'view';
    // Default ['component']. 'service' and 'pipe' only count on a view panel: they give the inputs activeService and
    // activePipe, and the build keeps services (pipes) in the manifest only when such a panel exists for them, decided
    // apart (read from the Node entry). Since 22.7.0.
    appliesTo?: readonly ('component' | 'service' | 'pipe')[];
    providers?: Provider[];
    isVisible?: (component: RuntimeComponent) => boolean; // components only
    badge?: (component: RuntimeComponent) => PanelBadge | null;
    keepAlive?: boolean;
}
```

## Plugin with Custom Controls

```typescript
export function colorPlugin(): NgPrismPlugin {
    return {
        name: 'color-controls',

        controls: [
            {
                matchType: (input: InputMeta) => input.type === 'string' && (input.name.includes('color') || input.name.includes('Color')),
                component: ColorPickerControlComponent
            }
        ]
    };
}
```

## Package Structure (official plugins)

```
packages/plugin-example/
  src/
    index.ts                   # Node entry (build-time hooks)
    index.browser.ts           # Browser entry (runtime panels/controls)
    example-plugin.ts          # Build-time plugin factory
    example-plugin.browser.ts  # Runtime plugin factory
    example-plugin.spec.ts
    example-panel.component.ts # plus .html / .css next to it
    example.types.ts
    __fixtures__/
    test-setup.ts
    schematics/                # ng-add schematic
  schematics/collection.json
  package.json                 # name: @ng-prism/plugin-example
  project.json
  tsconfig.lib.json
  jest.config.cjs
  .spec.swcrc
```

Note the flat `src/` — there is no `src/lib/`. The `.browser.ts` split is the
load-bearing part: `package.json`'s `exports` maps the `browser` condition to
`index.browser.js`, which keeps Node-only build-time code out of the bundle the
Prism app ships.

## Conventions

- Plugin factory function returns `NgPrismPlugin` (Vite-style)
- Options object as parameter with sensible defaults
- `name` must be unique — used for debugging and conflict detection
- Build-time hooks are async-compatible (can return Promise)
- Runtime components (panels, controls, header widgets) must be standalone
- Official plugins: `packages/plugin-*/` → npm: `@ng-prism/plugin-*`

## Checklist

- [ ] Plugin factory function with options parameter
- [ ] Unique `name` property
- [ ] Build-time hooks return modified object or void
- [ ] Runtime components are standalone Angular components
- [ ] Exported from package index
- [ ] Tests for hook behavior
- [ ] Registered via `defineConfig({ plugins: [...] })`
