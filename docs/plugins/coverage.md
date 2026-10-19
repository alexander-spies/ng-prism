# Coverage Plugin

`@ng-prism/plugin-coverage` displays per-component test coverage metrics from your existing test runner output. It reads Istanbul/v8 `coverage-summary.json` at build time and renders a coverage panel with a score circle in the tab bar.

## What It Does

- Adds a **Coverage** panel to the addon tab bar
- Shows a **library-wide coverage pill** in the header (average across all four metrics, color-coded against your thresholds: green ≥ target, orange ≥ 75% of target, red below)
- Shows a **score circle** (like the A11y panel) with the average coverage percentage per component
- Displays 4 metric bars: Statements, Branches, Functions, Lines
- Color-coded thresholds: green (>= 80%), yellow (>= 50%), red (< 50%)
- Works with any test runner that outputs Istanbul-compatible coverage (Jest, Karma, Vitest, nyc, c8)

## Install

```bash
ng add @ng-prism/plugin-coverage
```

This installs the package and registers `coveragePlugin()` in your `ng-prism.config.ts` automatically. To install manually: `npm install @ng-prism/plugin-coverage`.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { coveragePlugin } from '@ng-prism/plugin-coverage';

export default defineConfig({
    plugins: [
        coveragePlugin({
            coveragePath: 'coverage/coverage-summary.json'
        })
    ]
});
```

## Options

| Option         | Default                            | Description                                                                                                                                                                                                                               |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coveragePath` | `'coverage/coverage-summary.json'` | Path to the Istanbul coverage summary file (relative to workspace root)                                                                                                                                                                   |
| `thresholds`   | `80` for all metrics               | Minimum acceptable percentage per metric. Files below the threshold are highlighted in red in the per-file table. Accepts a number (applied to all metrics) or a partial object with `lines`, `branches`, `functions`, `statements` keys. |

### Thresholds

Highlights values in the per-file coverage table when they fall below the configured threshold. Defaults to `80` for every metric.

```typescript
// Single value, applied to lines, branches, functions, statements
coveragePlugin({ thresholds: 90 });

// Per-metric: keys you omit fall back to the default (80)
coveragePlugin({
    thresholds: { lines: 95, branches: 70 }
});
```

The thresholds affect only the red highlighting in the per-file table. The score circle and its color levels are independent (see [Score Levels](#score-levels)).

## Usage

### 1. Generate coverage

Run your test suite with coverage enabled:

```bash
# Jest
npx nx test my-lib --coverage

# Karma
ng test my-lib --code-coverage

# Vitest
npx vitest run --coverage
```

This creates a `coverage-summary.json` file in your coverage output directory.

### 2. Start the showcase

```bash
ng run my-lib:prism
```

The plugin reads the coverage summary at build time and maps each file to its corresponding component. The Coverage tab shows the per-component metrics with a score circle.

### 3. Keep coverage up to date

Run your tests with coverage before starting or rebuilding the showcase. In watch mode, the plugin detects file changes to `coverage-summary.json` and reloads automatically.

## Metrics

The panel displays four coverage categories per component:

| Metric     | Description                                               |
| ---------- | --------------------------------------------------------- |
| Statements | Percentage of statements executed                         |
| Branches   | Percentage of branches (if/else, switch, ternary) covered |
| Functions  | Percentage of functions called                            |
| Lines      | Percentage of lines executed                              |

The score shown in the tab circle is the average of all four metrics, rounded to the nearest integer.

## Score Levels

| Score  | Color  | Level   |
| ------ | ------ | ------- |
| >= 80% | Green  | Good    |
| >= 50% | Yellow | Warning |
| < 50%  | Red    | Bad     |

## File Matching

The plugin matches coverage data to components using the file path from the scanner. It uses a multi-tier matching strategy:

1. **Exact match:** full path comparison
2. **Suffix match:** handles different workspace roots
3. **Last 3 segments:** fallback for divergent path structures

This ensures coverage data is found even when the test runner and the ng-prism scanner report different absolute paths (e.g. in monorepo setups).

## No Coverage Data

If no `coverage-summary.json` exists or no entry matches a component, the panel shows a hint to run tests with coverage enabled.
