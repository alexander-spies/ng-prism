# NgPrismConfig

Configuration object returned by `defineConfig()` and exported as the default export of `ng-prism.config.ts`.

```typescript
import type { Provider, Type } from '@angular/core';
import type { NgPrismPlugin } from './plugin.types.js';
import type { StyleguidePage } from './page.types.js';

interface NgPrismConfig {
    title?: string;
    subtitle?: string;
    logo?: { light?: string; dark?: string };
    plugins?: NgPrismPlugin[];
    pages?: StyleguidePage[];
    appProviders?: Provider[];
    theme?: Record<string, string>;
    darkTheme?: Record<string, string>;
    lightTheme?: Record<string, string>;
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
    urlState?: boolean;
    persistState?: boolean;
    buildInfo?: { version?: string; gitHash?: string };
    a11y?: {
        thresholds?: {
            score?: number;
            critical?: number;
            serious?: number;
            moderate?: number;
        };
        reportPath?: string;
    };
    strictShowcase?: boolean;
}
```

## Fields

### `plugins`

Array of `NgPrismPlugin` objects to activate. Plugins run in registration order during both the build pipeline and at runtime.

```typescript
export default defineConfig({
    plugins: [jsDocPlugin(), figmaPlugin()]
});
```

---

### `pages`

Array of `StyleguidePage` entries declared in config. Supports `CustomPage` (type-safe data object) and is processed through the pipeline's `onPageScanned` hooks.

```typescript
export default defineConfig({
    pages: [
        {
            type: 'custom',
            title: 'Changelog',
            category: 'Meta',
            data: { version: '2.1.0' }
        }
    ]
});
```

For `ComponentPage` entries (Angular class references), use `providePrism(manifest, config, { componentPages: [...] })` in `main.ts` instead, because Angular classes cannot be serialized through the build pipeline.

---

### `appProviders`

Angular providers added to the Prism app's root injector at bootstrap. Use for library-wide services, mock backends, or global configuration that every component needs.

```typescript
export default defineConfig({
    appProviders: [provideHttpClient(), { provide: API_BASE_URL, useValue: 'http://localhost:3000' }]
});
```

---

### `theme`

Map of CSS custom property overrides. Applied on top of the built-in default theme.

```typescript
export default defineConfig({
    theme: {
        '--prism-primary': '#0ea5e9',
        '--prism-bg': '#0f172a',
        '--prism-font-sans': '"Inter", system-ui, sans-serif'
    }
});
```

See [Theming](guide/theming.md) for the full list of available properties.

---

### `themeStylesheet`

Path to a custom CSS/SCSS file loaded by the Prism app. Relative to the workspace root. Use for custom fonts, utility classes, or complex theming that cannot be expressed with CSS custom properties alone.

```typescript
export default defineConfig({
    themeStylesheet: 'projects/my-lib-prism/src/theme.scss'
});
```

---

### `ui`

Replace individual UI sections with custom Angular standalone components. All fields are optional. Omit a slot to keep the built-in component.

| Key               | Replaces                                                 |
| ----------------- | -------------------------------------------------------- |
| `header`          | Top header bar (logo, toolbar, theme toggle)             |
| `sidebar`         | Left navigation sidebar                                  |
| `componentHeader` | Title and description area above the canvas              |
| `renderer`        | Entire renderer region (canvas + variant tabs + snippet) |
| `controlsPanel`   | Built-in Controls addon panel                            |
| `eventsPanel`     | Built-in Events addon panel                              |
| `footer`          | Footer area below addon panels                           |

```typescript
export default defineConfig({
    ui: {
        header: MyBrandedHeaderComponent,
        footer: MyFooterComponent
    }
});
```

See [Custom UI Sections](guide/custom-ui.md) for examples.

---

### `headless`

> **Not yet implemented. Setting this has no effect.** The property exists on `NgPrismConfig` and is kept for forward compatibility.

When implemented, `true` will strip all built-in chrome (header, sidebar, toolbar, panels) and render only the component canvas. Default: `false`. For a custom shell today, use [`appComponent`](#appcomponent).

For screenshot isolation (a separate, working feature), see [capture isolation mode](guide/external-tooling.md#capture-isolation-mode).

---

### `appComponent`

Replace the entire application shell with a custom Angular component. When set, ng-prism renders this component instead of `PrismShellComponent` while still providing all services.

```typescript
export default defineConfig({
    appComponent: MyCustomShellComponent
});
```

---

### `urlState`

When `false`, disables URL query parameter synchronization. Default: `true`.

```typescript
export default defineConfig({ urlState: false });
```

See [State Preservation](guide/url-state.md).

---

### `persistState`

When `false`, disables `sessionStorage` persistence for control panel input overrides and a11y sub-state (active tab, perspective). Default: `true`.

```typescript
export default defineConfig({ persistState: false });
```

Layout, theme, and canvas settings are persisted independently to `localStorage` and are not affected by this flag.

See [State Preservation](guide/url-state.md).

---

### `buildInfo`

Display the deployed package version and/or git commit hash as a subtle pill in the header (left of the action buttons).

Both fields are optional. The pill shows whichever values are provided, separated by `·`. When neither is set, nothing is rendered.

```typescript
export default defineConfig({
    buildInfo: {
        version: packageJson.version,
        gitHash: environment.gitHash
    }
});
```

| Key       | Type     | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `version` | `string` | Package version, displayed as `v1.2.3`           |
| `gitHash` | `string` | Git commit hash, truncated to 7 characters in UI |

---

### `a11y`

Configuration for the library-wide accessibility audit. Drives both:

1. The **A11y header pill** (color-coded against `thresholds`).
2. The **build-time threshold check**: when an `a11y-report.json` exists and a threshold is violated, `nx run my-lib-prism:build` fails.

```typescript
export default defineConfig({
    a11y: {
        thresholds: {
            score: 85,
            critical: 0,
            serious: 0,
            moderate: 5
        },
        reportPath: 'reports/a11y.json'
    }
});
```

| Key                   | Default              | Description                                                                                                                                                           |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `thresholds.score`    | `80`                 | Minimum avg library score (0–100)                                                                                                                                     |
| `thresholds.critical` | `0`                  | Maximum allowed critical violations                                                                                                                                   |
| `thresholds.serious`  | `0`                  | Maximum allowed serious violations                                                                                                                                    |
| `thresholds.moderate` | unlimited            | Maximum allowed moderate violations                                                                                                                                   |
| `reportPath`          | `'a11y-report.json'` | Path (relative to workspace root) where the build pipeline reads the library-wide a11y report. Generating it is up to the consumer; see the guide for the JSON shape. |

See [Accessibility: Library-Wide A11y Score](guide/accessibility.md#library-wide-a11y-score--header-badge) for the report shape and integration workflow.

---

### `strictShowcase`

Fail the build when a `@Showcase` value is lost, instead of warning about it. Default: `false`.

The scanner reads `@Showcase` from the source and drops what it cannot use: a value it [cannot evaluate statically](guide/showcase-decorator.md#what-the-scanner-can-read), an invalid `bg`, `status` or `canvasLayout`, a [`pseudo`](guide/variants.md#per-variant-pseudo-states) state or target it cannot use, a config without a `title`, which costs the whole component, or the deprecated `providers`, which never reach the styleguide. Each loss prints a warning. With `strictShowcase` on, the build stops after the scan, before a manifest is written:

```typescript
export default defineConfig({ strictShowcase: true });
```

```
ng-prism: strictShowcase is enabled and 2 @Showcase value(s) were dropped; see the warnings above.
```

`build` exits with an error, and `serve` does not start. When a watch-mode rebuild fails this way, the error is logged and the previous manifest stays in place. Deprecations that lose nothing, such as `bg: 'checker'`, remain warnings either way.
