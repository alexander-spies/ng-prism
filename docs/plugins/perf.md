# Perf Plugin

`@ng-prism/plugin-perf` profiles the render and re-render performance of your components using the browser's Performance API and reports timing metrics per variant.

## What It Does

- Adds a **Performance** panel to the view toolbar
- Tracks `prism:render` marks (initial render) and `prism:rerender` marks (subsequent renders after input changes)
- Displays render duration, re-render duration, and frame budget usage
- Analyzes bundle size, import tree depth, and dependency count
- Tracks memory allocation per render cycle

## Install

```bash
ng add @ng-prism/plugin-perf
```

This installs the package and registers `perfPlugin()` in your `ng-prism.config.ts` automatically. To install manually: `npm install @ng-prism/plugin-perf`.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { perfPlugin } from '@ng-prism/plugin-perf';

export default defineConfig({
    plugins: [
        perfPlugin({
            bundle: { maxTreeDepth: 5 }
        })
    ]
});
```

## Options

### `bundle.maxTreeDepth`

How deep the import tree of a component is followed for the bundle estimate. Default: `5`.

### Deprecated: `thresholds`, `bundle.excludeImports`, `render`, `memory`

> **Deprecated since 22.6.0, removed in 23.0.0.** These options have been on `PerfPluginOptions` since the first release, but nothing has ever read them, so setting them never had an effect; the same goes for the `PERF_PLUGIN_CONFIG` token. While one is set, the build prints `⚠ ng-prism: perfPlugin() option "<option>" is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.` Remove them.

The panel colours its values against these built-in thresholds:

| Threshold      | Value | Meaning                                                  |
| -------------- | ----- | -------------------------------------------------------- |
| `renderWarnMs` | `5`   | Render time warning threshold (ms)                       |
| `renderCritMs` | `16`  | Render time critical threshold (ms), one frame at 60 fps |
| `bundleWarnKb` | `20`  | Bundle size warning threshold (KB)                       |
| `bundleCritKb` | `50`  | Bundle size critical threshold (KB)                      |
| `memoryWarnMb` | `5`   | Memory warning threshold (MB)                            |
| `memoryLeakMb` | `0.5` | Memory leak detection threshold per render (MB)          |

## Metrics

### Render Panel

Shows timing for the last N renders with a mini sparkline chart. Values are color-coded against the built-in thresholds:

- Green: within warning threshold
- Yellow: between warning and critical
- Red: exceeds critical threshold

### Bundle Panel

Analyzes the component's static import graph at build time:

| Metric         | Description                            |
| -------------- | -------------------------------------- |
| Source size    | Raw source bytes of the component file |
| Gzip estimate  | Estimated gzip-compressed size         |
| Direct imports | Number of direct `import` statements   |
| Import list    | All resolved imports                   |
| Tree depth     | Maximum depth of the import graph      |

### Memory Panel

Measures heap usage before and after rendering the component, using `performance.memory` (Chromium-only). Detects potential memory leaks by tracking heap growth across re-renders.
