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
    themeStylesheet?: string; // deprecated, no effect
    ui?: {
        // deprecated, no effect
        header?: Type<unknown>;
        sidebar?: Type<unknown>;
        componentHeader?: Type<unknown>;
        renderer?: Type<unknown>;
        controlsPanel?: Type<unknown>;
        eventsPanel?: Type<unknown>;
        footer?: Type<unknown>;
    };
    headless?: boolean; // deprecated, no effect
    appComponent?: Type<unknown>; // deprecated, no effect
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

An override of a token deprecated in 22.7.0 (`--prism-mark-nominal`, `--prism-mark-attention`, `--prism-mark-critical`, `--prism-spectrum`, `--prism-primary-from`, `--prism-primary-to`) in `theme`, `darkTheme` or `lightTheme` prints `⚠ ng-prism: ng-prism.config.ts sets <token> in "<option>": <token> is deprecated since 22.7.0 and will be removed in 23.0.0. <effect>; override <successor> instead.` at build time, and the styleguide warns once per token in the browser console. A mark's override still reaches its successor until 23.0.0; the others have no effect. See [Migration: mark, spectrum and primary gradient tokens](guide/migration-v22.md#deprecation-mark-spectrum-and-primary-gradient-tokens).

---

### Deprecated: `themeStylesheet`, `ui`, `headless`, `appComponent`

> **Deprecated since 22.6.0, removed in 23.0.0.** These four options have been on `NgPrismConfig` since the first release, but nothing has ever read them, so setting them never had an effect. While one is set, the build prints `⚠ ng-prism: ng-prism.config.ts sets "<option>", which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.` Remove them.

- `themeStylesheet` was meant to load a stylesheet into the styleguide app. Colours, fonts and density go through [`theme`](#theme), `darkTheme` and `lightTheme`.
- `ui` and `appComponent` were meant to replace regions of the styleguide or its whole shell. For your own content inside the styleguide, use a [component page](guide/component-pages.md); for panels, header widgets and sidebar markers, a [plugin](plugins/writing-plugins.md).
- `headless` was meant to strip the styleguide down to the canvas. For screenshots, [capture isolation mode](guide/external-tooling.md#capture-isolation-mode) does that.

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

The scanner reads `@Showcase` from the source and drops what it cannot use: a value it [cannot evaluate statically](guide/showcase-decorator.md#what-the-scanner-can-read), an invalid `bg`, `status` or `canvasLayout`, a [`pseudo`](guide/variants.md#per-variant-pseudo-states) state or target it cannot use, a [`states`](guide/variants.md#declaring-a-state) entry it cannot use (not an object, a repeated name, no usable `pseudo`; it keeps its place as an empty state, and an entry without a name is reported but kept under a generated name), `states` next to `renderPage`, a variant's `states` other than `false`, a [`template`](guide/content-projection.md#errors), `host: { template }` or `imports` value of the wrong type, an `imports` entry or an object host's `import` whose `name` is not an identifier, `content` set together with `template`, a composition that cannot be built (a syntax error in a template, an element left open, an unknown element or pipe, two library components on one element, a host template without a subject or with several, a value in `inputs` for an input the template sets on the subject, HTML `content` in a host template, a string or object host a variant `template` cannot render in, a subject that is not standalone, a failure of `@angular/compiler`, or the library's components, directives and pipes that could not be read), a config without a `title`, which costs the whole component, the deprecated `providers`, which never reach the styleguide, a service's or pipe's [`setup`](guide/showcasing-services.md#setup) that cannot be read or has an entry that is not a provider function or token, is not exported, or sits on a component, or a [pipe](guide/showcasing-pipes.md#warnings) that is declared with `standalone: false` or whose `name` cannot be evaluated. The losses of a service or a pipe only come up when a plugin shows services or pipes (`jsDocPlugin()`): without one the build does not read them, it only counts them. Each loss prints a warning. With `strictShowcase` on, the build stops after the scan, before a manifest is written:

```typescript
export default defineConfig({ strictShowcase: true });
```

```
ng-prism: strictShowcase is enabled and 2 @Showcase value(s) were dropped; see the warnings above.
```

`build` exits with an error, and `serve` does not start. When a watch-mode rebuild fails this way, the error is logged and the previous manifest stays in place. Deprecations that lose nothing, such as `bg: 'checker'`, remain warnings either way, and so do the notices about [services](guide/showcasing-services.md) and [pipes](guide/showcasing-pipes.md): the one for a class with component-only fields that is still treated as a component (deprecated since 22.7.0, removed in 23.0.0), the hint that no plugin shows services or pipes, and the notice for a class whose API the scanner could not read. The notices about [compositions](guide/content-projection.md#errors) are no diagnostics either: an `imports` entry ng-prism cannot read (Angular checks the template then, and an unknown element or pipe is a notice too), a library class that matches only by standard attributes, a library class that is not standalone, and a library selector Angular cannot parse, and so is the warning for a string or object `host` on a component, which a component has always ignored. So are the warnings the manifest generator prints for a host it cannot render as written, such as an object host without `import`, a selector that fits no host tag, or `content` on a void host.
