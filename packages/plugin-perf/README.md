# @ng-prism/plugin-perf

Render performance profiling plugin for [@ng-prism/core](https://github.com/alexander-spies/ng-prism). Tracks component render and re-render timing via the Performance API.

> **Full documentation:** [ng-prism Docs: Perf Plugin](https://alexander-spies.github.io/ng-prism/#/plugins/perf)

## Installation

```bash
npm install @ng-prism/plugin-perf
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
import { perfPlugin } from '@ng-prism/plugin-perf';

export default defineConfig({
    plugins: [perfPlugin()]
});
```

## What It Does

- Adds a **Performance** view tab to the styleguide
- Profiles component lifecycle:
    - Initial render time (`prism:render`)
    - Re-render time on input changes (`prism:rerender`)
- Uses the browser's native Performance API (`performance.mark` / `performance.measure`)
- Displays timing metrics per variant
- Memory usage tracking

## How It Works

The plugin hooks into ng-prism's renderer lifecycle via `PrismRendererHooks` (`onBeforeCreate`, `onAfterCreate`, `onAfterDestroy`). Performance marks are placed around component creation and input updates. The panel component reads `performance.getEntriesByName()` to display the results.

## License

MIT
