# @ng-prism/plugin-box-model

CSS box model inspector plugin for [@ng-prism/core](https://github.com/alexander-spies/ng-prism). Overlays margin, padding, border, and content dimensions on the rendered component.

> **Full documentation:** [ng-prism Docs: Box Model Plugin](https://alexander-spies.github.io/ng-prism/#/plugins/box-model)

## Installation

```bash
npm install @ng-prism/plugin-box-model
```

### Peer Dependencies

| Package          | Version    |
| ---------------- | ---------- |
| `@ng-prism/core` | `>=21.0.0` |
| `@angular/core`  | `>=20.0.0` |

## Setup

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { boxModelPlugin } from '@ng-prism/plugin-box-model';

export default defineConfig({
    plugins: [boxModelPlugin()]
});
```

## What It Does

- Adds a **Box Model** panel to the styleguide
- Shows an interactive overlay on the rendered component displaying:
    - Content dimensions (width x height)
    - Padding values (top, right, bottom, left)
    - Border widths
    - Margin values
- Updates live when inputs change via the Controls panel
- Color-coded layers (content, padding, border, margin)

## How It Works

The plugin registers a panel with an overlay component. The overlay reads the rendered element from `PrismRendererService.renderedElement` and uses `getComputedStyle()` to extract box model values. Values update reactively when the component re-renders.

## License

MIT
