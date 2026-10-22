# Configuration

ng-prism is configured through an `ng-prism.config.ts` file at the workspace root (the builders' `configFile` option can point elsewhere). The file exports a default `NgPrismConfig` object created with `defineConfig()`.

```typescript
// ng-prism.config.ts (workspace root)
import { defineConfig } from '@ng-prism/core';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
    plugins: [jsDocPlugin()],
    theme: {
        '--prism-primary': '#6366f1',
        '--prism-primary-from': '#6366f1',
        '--prism-primary-to': '#8b5cf6'
    }
});
```

`defineConfig()` is an identity function. It only exists for TypeScript inference on the config object.

## Full Reference

See [NgPrismConfig](api/ng-prism-config.md) for the complete interface.

The most commonly used fields:

| Field             | Type                     | Description                                                           |
| ----------------- | ------------------------ | --------------------------------------------------------------------- |
| `title`           | `string`                 | Header title text (default: the ng-prism wordmark)                    |
| `subtitle`        | `string`                 | Secondary text below the title (monospace, muted)                     |
| `plugins`         | `NgPrismPlugin[]`        | List of plugins to activate                                           |
| `pages`           | `StyleguidePage[]`       | Config-declared custom pages                                          |
| `appProviders`    | `Provider[]`             | Angular providers added to the Prism app bootstrap                    |
| `theme`           | `Record<string, string>` | CSS custom property overrides                                         |
| `themeStylesheet` | `string`                 | _Deprecated since 22.6.0, never had an effect._                       |
| `ui`              | object                   | _Deprecated since 22.6.0, never had an effect._                       |
| `headless`        | `boolean`                | _Deprecated since 22.6.0, never had an effect._                       |
| `urlState`        | `boolean`                | Disable URL state sync (default: `true`)                              |
| `buildInfo`       | `object`                 | Show version / git hash pill in header                                |
| `strictShowcase`  | `boolean`                | Fail the build when a `@Showcase` value is dropped (default: `false`) |

## Adding Global Providers

Use `appProviders` for services that every showcase component needs, for example a mock API service or router:

```typescript
import { defineConfig } from '@ng-prism/core';
import { provideRouter, withHashLocation } from '@angular/router';

export default defineConfig({
    appProviders: [provideRouter([], withHashLocation()), { provide: MyApiService, useClass: MockApiService }]
});
```

Only for a provider that one component needs and the others must not see, render that component through a [component page](guide/component-pages.md) and declare the provider there. `@Showcase({ providers })` never worked and is deprecated.

## Theming

Override CSS custom properties to match your design system:

```typescript
export default defineConfig({
    theme: {
        '--prism-primary': '#0ea5e9',
        '--prism-bg': '#0f172a',
        '--prism-font-sans': '"Inter", sans-serif'
    }
});
```

See [Theming](guide/theming.md) for the full list of available properties.

## Branding

Replace the default ng-prism logo, title, and subtitle in the header:

```typescript
export default defineConfig({
    title: 'My Component Library',
    subtitle: 'acme/design-system',
    logo: {
        light: 'assets/logo-on-light.svg',
        dark: 'assets/logo-on-dark.svg'
    }
});
```

| Field        | Type     | Description                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------- |
| `title`      | `string` | Header title, in plain text. Default: the ng-prism wordmark in the brand gradient |
| `subtitle`   | `string` | Smaller text below the title (monospace, muted). Optional.                        |
| `logo.light` | `string` | Logo image URL for light backgrounds                                              |
| `logo.dark`  | `string` | Logo image URL for dark backgrounds                                               |

Since 22.7 the header is a navy band in both themes, so `logo.dark` is shown whenever it is set, and `logo.light` only when it is the one you provided. Without a logo the ng-prism symbol is shown. The brand gradient belongs to the ng-prism wordmark: a `title` of your own is set in the regular text colour, and ng-prism stays credited as "Powered by ng-prism" in the sidebar footer.

### Build Info

Show the deployed version and git hash as a pill in the header:

```typescript
export default defineConfig({
    buildInfo: {
        version: packageJson.version,
        gitHash: environment.gitHash
    }
});
```

The pill appears left of the header action buttons. Both fields are optional, and the git hash is automatically truncated to 7 characters.

> **Note:** A small "Powered by ng-prism" notice is always visible at the bottom of the sidebar.

## Category Groups

Organize categories into collapsible parent groups using `/` in the `@Showcase` category:

```typescript
@Showcase({ title: 'Button', category: 'Atoms' })
@Showcase({ title: 'Dialog', category: 'Overlays' })
```

Categories without a separator remain top-level. See [Showcase Decorator](guide/showcase-decorator.md#category) for details.

## Plugins

Plugins are registered in order. Each is activated during the build pipeline and at runtime:

```typescript
import { defineConfig } from '@ng-prism/core';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
    plugins: [jsDocPlugin(), figmaPlugin()]
});
```

See [Plugin Overview](plugins/overview.md) for a description of each official plugin.
