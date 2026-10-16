# Box Model Plugin

`@ng-prism/plugin-box-model` overlays CSS box model dimensions on the rendered component, letting you inspect margin, padding, border, and content dimensions without leaving the showcase.

## What It Does

- Adds a **Box Model** panel to the view toolbar
- Overlays color-coded regions on the canvas when active: margin (orange), padding (green), border (blue), content (center)
- Displays the computed pixel values for each region
- Updates live when inputs change or the component re-renders

## Install

```bash
ng add @ng-prism/plugin-box-model
```

This installs the package and registers `boxModelPlugin()` in your `ng-prism.config.ts` automatically. To install manually: `npm install @ng-prism/plugin-box-model`.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { boxModelPlugin } from '@ng-prism/plugin-box-model';

export default defineConfig({
    plugins: [boxModelPlugin()]
});
```

## Using the Inspector

1. Open any component in the showcase.
2. Click the **Box Model** button in the view toolbar to activate the overlay.
3. The overlay draws colored outlines around the margin, border, padding, and content areas of the root element.
4. Exact values are displayed in a floating tooltip and in the panel below the canvas.

The overlay targets the root element rendered by the component. For directives or components with multiple root elements, the inspector targets the first element.

## Interactive Overlay

Hovering over child elements within the canvas highlights their individual box model. Click to lock the selection. The panel updates to reflect the selected element's computed styles.

## Options

```typescript
boxModelPlugin({
    // highlight child elements on hover (default: true)
    interactive: true
});
```
