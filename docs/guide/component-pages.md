# Component Pages

Component Pages are free-form Angular components registered as styleguide pages. They live in the sidebar alongside `@Showcase` components but render an arbitrary Angular component instead of a generic canvas.

## When to Use @Showcase vs Component Pages

| Situation                                               | Recommendation             |
| ------------------------------------------------------- | -------------------------- |
| Standard component with `input()` signals               | `@Showcase`                |
| Component needing complex template projections          | `@Showcase` + `renderPage` |
| Pattern overview page (multiple components together)    | Component Page             |
| Color palette, token display, icon catalog              | Component Page             |
| Component with mock data that requires Angular bindings | Component Page             |

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

The page component is shown in the canvas area while the Controls panel and variant tabs still work normally.

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
