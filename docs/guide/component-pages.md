# Component Pages

Component Pages are free-form Angular components registered as styleguide pages. They live in the sidebar alongside `@Showcase` components but render an arbitrary Angular component instead of a generic canvas.

## When to Use @Showcase vs Component Pages

| Situation                                                                        | Recommendation                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Standard component with `input()` signals                                        | `@Showcase`                                                                                    |
| Component with components or directives in its content (frame and control)       | `@Showcase` with a variant [`template`](guide/content-projection.md#compiled-content-template) |
| Directive that belongs in a frame, or one of several radios in a group           | `@Showcase` with a [`host: { template }`](guide/directive-hosting.md#host-template)            |
| Component needing complex template projections that a composition cannot express | `@Showcase` + `renderPage`                                                                     |
| Pattern overview page (multiple components together)                             | Component Page                                                                                 |
| Color palette, token display, icon catalog                                       | Component Page                                                                                 |
| Component with mock data that requires Angular bindings                          | Component Page                                                                                 |

### Composition or Page

A [composition](guide/content-projection.md#compiled-content-template) (since `22.7.0`) renders the showcased component or directive together with other parts of your library, as one compiled Angular template. It is the better choice whenever the parts are all classes of your library and the point is how they work together: a form field with its input, a radio group with its radios, a select with its options. The subject keeps everything a showcase has. The Overview, `states`, Controls, the Events panel, the code snippet and the Perf render marks all work on it, and the variants can be compared side by side.

A page replaces the canvas with a component of your own, and gives up part of that, see [What a Page Gives Up](#what-a-page-gives-up). Reach for it when the demo needs something a template of library classes cannot hold: a service or provider that only the demo has, mock data wired to state that the page owns, a component of the styleguide app that is not part of the library, or a view that is not one subject at all, such as a palette or an icon catalog.

## Creating a Page Component

A Component Page is a standard Angular standalone component. Place it in your showcase app (`projects/my-lib-prism/src/`), not in the library itself. Angular class references cannot be JSON-serialized and must not pass through the build pipeline.

```typescript
// projects/my-lib-prism/src/pages/button-patterns.page.ts
import { Component } from '@angular/core';
import { ButtonComponent } from 'my-lib';

@Component({
    selector: 'app-button-patterns',
    standalone: true,
    imports: [ButtonComponent],
    template: `
        <h2>Button Patterns</h2>
        <section>
            <lib-button label="Primary Action" variant="primary" />
            <lib-button label="Secondary" variant="secondary" />
            <lib-button label="Danger" variant="danger" [disabled]="true" />
        </section>
    `
})
export class ButtonPatternsPageComponent {}
```

## Following the Theme

A page renders in the styleguide's own document, on the dark or light background the theme toggle in the header picks. A fixed colour only works on one of them: dark text written for a white page all but disappears in the dark theme. Take colours from the theme tokens instead. They sit on `<html>` and switch with the theme:

```css
.tokens-page {
    color: var(--prism-text);
}

.tokens-page__intro {
    color: var(--prism-text-2);
}

.tokens-page code {
    font-family: var(--prism-font-mono);
    color: var(--prism-text-muted);
}

.tokens-page h2 {
    border-bottom: 1px solid var(--prism-border-strong);
}
```

Text without a colour of its own inherits `--prism-text-2` and the styleguide's sans font. Headings, paragraphs, lists, code and links without styles of their own get the styleguide's defaults (links in `--prism-link`, underlined). Those defaults carry no more weight than a single attribute selector, so any rule your page sets for the same element wins. [Theming](guide/theming.md) lists every token with its dark and light value. For anything a token cannot express, such as an image per theme, `data-theme` on `<html>` reads `dark` or `light`, see [Dark and Light Themes](guide/theming.md#dark-and-light-themes).

## Registering Pages

Register pages via the third argument to `providePrism()` in `main.ts`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { PrismShellComponent, providePrism } from '@ng-prism/core';
import { componentPage } from '@ng-prism/core';
import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism';
import config from 'ng-prism.config';
import { ButtonPatternsPageComponent } from './pages/button-patterns.page.js';

bootstrapApplication(PrismShellComponent, {
    providers: [
        providePrism(PRISM_RUNTIME_MANIFEST, config, {
            componentPages: [
                componentPage({
                    title: 'Button Patterns',
                    category: 'Atoms',
                    categoryOrder: 1,
                    order: 99,
                    component: ButtonPatternsPageComponent
                })
            ]
        })
    ]
});
```

## Page Fields

| Field           | Type            | Description                          |
| --------------- | --------------- | ------------------------------------ |
| `title`         | `string`        | Display name in the sidebar          |
| `category`      | `string`        | Groups the page alongside components |
| `categoryOrder` | `number`        | Controls category sort order         |
| `order`         | `number`        | Sort position within the category    |
| `component`     | `Type<unknown>` | The Angular component to render      |

## Mixing Pages and Components in One Category

Pages and `@Showcase` components can share the same category. They appear interleaved in the sidebar, sorted by `order` / `componentOrder`.

```typescript
// Component in library
@Showcase({ title: 'Button', category: 'Atoms', componentOrder: 1 })
export class ButtonComponent { ... }

// Page in showcase app
componentPage({ title: 'Button Patterns', category: 'Atoms', order: 99 })
```

## Linking a Page to a Component with `renderPage`

Use `renderPage` on `@Showcase` to replace the default canvas with a Component Page. This is useful for complex components where the automatic rendering is not expressive enough.

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',  // must match the ComponentPage title exactly
  variants: [
    { name: 'Empty' },
    { name: '10 rows', inputs: { rowCount: 10 } },
  ],
})
@Component({ ... })
export class DataTableComponent { ... }
```

The page component is shown in the canvas area while the Controls panel and variant tabs stay. Their values only reach the page when it reads them, see [Reacting to Controls Panel Changes](#reacting-to-controls-panel-changes).

### What a Page Gives Up

The canvas renders the page instead of the component, so what depends on the component itself is not there:

| Feature                                   | On a `renderPage` component                                      |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Overview                                  | Hidden: every cell would show the same page                      |
| `states`                                  | Dropped by the scanner, with a warning                           |
| Controls                                  | Only what the page reads from `PrismRendererService.inputValues` |
| Events panel                              | Stays empty: the outputs of the component are not subscribed to  |
| Perf render marks                         | None: the Performance panel has no render timings for the page   |
| Code snippet                              | Shows the selector of the showcased component, not the page      |
| a11y, Box Model, measuring, Figma and VRT | Work, on the root element of the page                            |

If the page only composes library components, a [`template`](guide/content-projection.md#compiled-content-template) or a [`host: { template }`](guide/directive-hosting.md#host-template) gives the same picture without giving any of this up.

## Reacting to Controls Panel Changes

A Component Page linked via `renderPage` can inject `PrismRendererService` to read the current input values and active variant index:

```typescript
import { Component, inject, computed } from '@angular/core';
import { PrismRendererService } from '@ng-prism/core';

@Component({
    selector: 'app-data-table-demo',
    standalone: true,
    template: ` <lib-data-table [rows]="rows()" [loading]="loading()" /> `
})
export class DataTableDemoComponent {
    private readonly renderer = inject(PrismRendererService);

    readonly rows = computed(() => {
        const rowCount = (this.renderer.inputValues()['rowCount'] as number) ?? 0;
        return Array.from({ length: rowCount }, (_, i) => ({
            id: i,
            name: `Row ${i}`
        }));
    });

    readonly loading = computed(() => (this.renderer.inputValues()['loading'] as boolean) ?? false);
}
```

## Custom Pages via Config

For pages that don't require Angular components (e.g. static data rendered by a shared page template), use `CustomPage` entries in `ng-prism.config.ts`:

```typescript
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
    pages: [
        {
            type: 'custom',
            title: 'Changelog',
            category: 'Meta',
            data: { version: '2.1.0', entries: [] }
        }
    ]
});
```

Custom pages require a plugin with an `onPageScanned` hook and a matching panel to render `data`. See [Writing a Plugin](plugins/writing-plugins.md).
