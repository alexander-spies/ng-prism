# ng-prism

**ng-prism** is the Angular-native Storybook alternative. A lightweight component showcase tool that scans your library at build time and renders interactive demos. Annotate components with `@Showcase`; no separate story files needed.

[![Angular](https://img.shields.io/badge/Angular-20%20%7C%2021%20%7C%2022-dd0031)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**[Live Demo](https://ng-prism.github.io/ng-prism/demo/?component=ButtonComponent)** · **[Documentation](https://ng-prism.github.io/ng-prism/)**

## Features

- **Zero-config discovery**: TypeScript Compiler API scans your library at build time
- **Signal-native**: works with `input()` / `output()` signals
- **Directive support**: showcase directives with configurable host elements
- **Services and pipes**: `@Showcase` on a service or pipe gives it an API page, no canvas needed
- **Plugin architecture**: JSDoc, A11y, Figma, Performance, Box Model, Coverage
- **Live Controls**: auto-generated input controls with type-aware editors
- **Code Snippets**: live-updating Angular template snippets per variant
- **Component Pages**: free-form demo pages for complex components
- **Deep-linking**: URL state sync for sharing specific component/variant/view
- **Themeable**: full CSS custom property system, replaceable UI sections

## Quick Start

### 1. Install

```bash
npm install @ng-prism/core
```

### 2. Add `@Showcase` to a component

```typescript
import { Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Button',
    category: 'Atoms',
    description: 'Primary action button',
    variants: [
        { name: 'Primary', inputs: { variant: 'primary', label: 'Click me' } },
        { name: 'Danger', inputs: { variant: 'danger', disabled: true } }
    ]
})
@Component({
    selector: 'my-button',
    standalone: true,
    template: `<button [class]="variant()">{{ label() }}</button>`
})
export class ButtonComponent {
    variant = input<'primary' | 'secondary' | 'danger'>('primary');
    label = input('Button');
    disabled = input(false);
    clicked = output<void>();
}
```

### 3. Run the schematic

```bash
ng add @ng-prism/core
```

This creates the prism app project, configures Angular builders, and generates `ng-prism.config.ts`.

### 4. Start the dev server

```bash
ng run my-lib:prism
```

Open `http://localhost:4400`. Your component appears in the sidebar with live controls, code snippets, and variant tabs.

Using Claude Code? The [ng-prism plugin](https://ng-prism.github.io/ng-prism/#/guide/ai-agents) teaches it to write showcases, check them in the browser and set up ng-prism.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
    plugins: [jsDocPlugin()],

    theme: {
        '--prism-primary': '#00a67e',
        '--prism-font-sans': "'Inter', sans-serif"
    },

    appProviders: [provideAnimationsAsync(), provideHttpClient()]
});
```

## Directives

Directives need a host element. Use `host` to wrap them:

```typescript
@Showcase({
  title: 'Tooltip',
  host: {
    selector: 'my-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Hover me' },
  },
  variants: [
    { name: 'Top', inputs: { position: 'top', text: 'Tooltip!' } },
  ],
})
@Directive({ selector: '[myTooltip]' })
export class TooltipDirective { ... }
```

## Component Pages

For complex components that need template projections or mock data:

```typescript
providePrism(PRISM_RUNTIME_MANIFEST, config, {
    componentPages: [{ title: 'Table Demo', category: 'Data', component: TableDemoPage }]
});
```

Link to a `@Showcase`-decorated component for combined API docs + custom rendering:

```typescript
@Showcase({
  title: 'Table',
  renderPage: 'Table Demo',
  variants: [{ name: 'Default', inputs: { height: '400px' } }],
})
```

## Official Plugins

| Plugin    | Package                              | Description                                                                 |
| --------- | ------------------------------------ | --------------------------------------------------------------------------- |
| JSDoc     | `@ng-prism/plugin-jsdoc`             | API pages for components, directives, services and pipes, with linked types |
| Figma     | `@ng-prism/plugin-figma`             | Figma design embed + visual diff                                            |
| Box Model | `@ng-prism/plugin-box-model`         | CSS box model inspector                                                     |
| Perf      | `@ng-prism/plugin-perf`              | Render performance profiling                                                |
| Coverage  | `@ng-prism/plugin-coverage`          | Per-component test coverage from Istanbul/v8                                |
| VRT       | `@ng-prism/plugin-visual-regression` | Per-variant visual regression report from a screenshot runner               |

> **Note:** Accessibility auditing (axe-core) is built into ng-prism core, so no plugin is needed.

## Requirements

- Angular >= 20 (Angular 20, 21, and 22 are supported)
- TypeScript >= 5.5
- Components must use `input()` / `output()` signals

## License

[MIT](./LICENSE)
