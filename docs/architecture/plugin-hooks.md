# Plugin Hooks

Plugin hooks are the build-time extension points of ng-prism. They run inside the Angular builder (Node.js) as part of the pipeline between scanning and manifest writing.

## Hook Execution Order

For each pipeline run, hooks execute in this sequence:

```
For each component (in scan order):
  → plugin[0].onComponentScanned(component)
  → plugin[1].onComponentScanned(component)
  → ...

For each service (in scan order, only when a plugin shows services):
  → plugin[0].onServiceScanned(service)
  → plugin[1].onServiceScanned(service)
  → ...

For each page (in config order):
  → plugin[0].onPageScanned(page)
  → plugin[1].onPageScanned(page)
  → ...

Once, with the full manifest:
  → plugin[0].onManifestReady(manifest)
  → plugin[1].onManifestReady(manifest)
  → ...
```

Plugins run in registration order within each phase. The output of one plugin is the input to the next, so hooks chain.

## `onComponentScanned`

Called once per `@Showcase`-decorated component after all metadata has been extracted by the scanner.

```typescript
onComponentScanned(component: ScannedComponent): ScannedComponent | void | Promise<ScannedComponent | void>
```

**Mutation pattern:** mutate the object in place and return `void`, or return a new object. Returning `void` (or `undefined`) keeps the previous value.

```typescript
onComponentScanned(component) {
  component.meta = {
    ...component.meta,
    myPlugin: { extractedAt: Date.now() },
  };
  // no return → keeps mutated object
}
```

**Return new object:**

```typescript
onComponentScanned(component) {
  return {
    ...component,
    meta: { ...component.meta, extra: 'value' },
  };
}
```

**Chaining:** When plugin A and plugin B both implement `onComponentScanned`, the `ScannedComponent` passed to plugin B is the (possibly modified) output from plugin A.

**Typical uses:**

- Extract JSDoc from `component.filePath` using `ts.createSourceFile()` (JSDoc plugin)
- Fetch external metadata keyed on `component.className`
- Validate that required `meta` fields are present and warn if missing

## `onServiceScanned`

Called once per `@Showcase`-decorated [service](guide/showcasing-services.md), after the scanner has extracted its API.

```typescript
onServiceScanned(service: ScannedService): ScannedService | void | Promise<ScannedService | void>
```

The same mutation, return and chaining rules as `onComponentScanned`, and the same error handling: a hook that throws stops the build with `ng-prism: plugin "<name>" failed in onServiceScanned for service "<ClassName>": <cause>`.

```typescript
onServiceScanned(service) {
  return {
    ...service,
    meta: { ...service.meta, myPlugin: { setupEntries: service.api.setup.length } },
  };
}
```

**A separate hook, not a second kind of component.** A service has no inputs, outputs, selector or canvas, and the four plugins that implement `onComponentScanned` (coverage, jsdoc, perf and visual regression) read exactly those. Giving services their own list and hook means none of them is ever called with one, and the manifest they write stays what it was. The JSDoc plugin does not need the hook: its service page reads `service.api` in the browser.

**It may not run.** Services go into the manifest only when some plugin has a view panel (`placement: 'view'`) with `appliesTo` including `'service'`. Without one the pipeline drops them before the hooks, so `onServiceScanned` is not called, and logs a hint, see the services gate in the [Build Pipeline](architecture/pipeline.md). `onManifestReady` receives `manifest.services` only when they were kept.

`service.api` is experimental until 23.0.0: its shape may change in a 22.x minor release. Add your own data to `service.meta`, which is stable, and read `service.api` knowing it can change.

**No navigation decorations.** `navigationDecorations` are not called for a service. The `badge()` of a decoration takes a component, and coverage, a11y and visual regression measure what renders.

## `onPageScanned`

Called once per `StyleguidePage` after all pages are collected (both `config.pages` entries and Component Pages).

```typescript
onPageScanned(page: StyleguidePage): StyleguidePage | void | Promise<StyleguidePage | void>
```

Same mutation/return pattern as `onComponentScanned`.

```typescript
onPageScanned(page) {
  if (page.type === 'custom' && page.data['markdown']) {
    page.data = {
      ...page.data,
      html: renderMarkdown(page.data['markdown'] as string),
    };
  }
}
```

## `onManifestReady`

Called once with the complete `PrismManifest` after all `onComponentScanned`, `onServiceScanned` and `onPageScanned` hooks have finished.

```typescript
onManifestReady(manifest: PrismManifest): PrismManifest | void | Promise<PrismManifest | void>
```

Use for cross-component transformations or manifest-level filtering.

```typescript
onManifestReady(manifest) {
  // Filter out components tagged 'internal'
  manifest.components = manifest.components.filter(
    (c) => !c.showcaseConfig.tags?.includes('internal'),
  );
}
```

Return a new manifest object for immutable transforms:

```typescript
onManifestReady(manifest) {
  return {
    ...manifest,
    components: manifest.components.map(addGlobalMeta),
  };
}
```

Use `manifest.meta` for library-wide values that runtime components (e.g. header widgets) should read:

```typescript
onManifestReady(manifest) {
  return {
    ...manifest,
    meta: {
      ...manifest.meta,
      coverage: { total: readTotalCoverage(path), thresholds },
    },
  };
}
```

`manifest.meta` is serialized into the runtime manifest and accessible via the `PRISM_MANIFEST` injection token in the browser.

## Navigation Decorations

`NgPrismPlugin.navigationDecorations` lets a plugin mark a component's sidebar item with a small icon. The built-in a11y, visual regression and coverage sources all use it to flag a component whose latest report needs attention. It is a runtime contribution (its `badge()` callback runs in the browser), but the verdict it displays has to be decided here, at build time. This section explains why.

### The two-zone principle

Every component's navigation item has two places a marker can live:

- **The leading icon** carries _lifecycle_: what the author declared with `@Showcase({ status })`. It uses shape only: `box` for a normal component, `circle-dashed` for `'wip'`, a struck-through name for `'deprecated'`. Never colour.
- **The trailing slot** carries _health_: what a report measured. It uses colour only: `warn` (amber) or `danger` (red), via `NavigationDecoration.variant`.

Before `navigationDecorations` existed, the work-in-progress marker was a 6px amber dot in the trailing slot, the same position and colour a health signal uses. A coverage or a11y marker there would have been indistinguishable from it: a reader could not tell "the author isn't done with this yet" from "the last audit found a problem". With lifecycle in the leading slot as shape and health in the trailing slot as colour, colour in the sidebar only ever means measured quality.

### Why the threshold decision has to happen in a hook

A `NavigationDecorationDefinition.badge()` callback receives one `RuntimeComponent` and nothing else: no injected services, no access to the plugin's configured thresholds, no view of any other component in the library. That is enough to read a verdict but not to decide one: it cannot tell whether 72% coverage is fine or a regression, because "fine" is a library-wide threshold the badge callback never sees.

That decision is made once, in `onComponentScanned`, which has everything it needs (the plugin's resolved thresholds, closed over from `options`, and the one component's raw numbers) and is only ever run at build time, in Node.js, never on every change-detection tick. The hook writes its verdict into `component.showcaseConfig.meta` as an already-decided `{ variant, label }` pair, conventionally under a `summary` field. `badge()` then only reads that field back:

```typescript
// packages/plugin-coverage/src/coverage-contributions.ts (shipped)
badge: (component) => {
  const meta = componentMeta(component);
  if (!meta?.found || !meta.summary) return null;
  if (meta.summary.variant === 'ok') return null;
  return { variant: meta.summary.variant, label: meta.summary.label };
},
```

Note that `meta.summary.variant` above is three-valued (`'ok' | 'warn' | 'danger'`). It is the plugin's own build-time verdict type (`CoverageSummary`, `VrtStat`, ...), and it has to include `'ok'` because the hook that writes it needs a way to say "healthy". The public `NavigationDecoration` returned by `badge()` is two-valued (`'warn' | 'danger'`, no `'ok'`). The `if (... === 'ok') return null;` line above does that narrowing.

All three built-in sources follow this split. See `packages/plugin-visual-regression/src/panel-contributions.ts` and `packages/plugin-coverage/src/coverage-contributions.ts` for the shipped chain from `onComponentScanned` through `summary` to `badge()`, and [`NavigationDecorationDefinition`](api/ng-prism-plugin.md#navigationdecorationdefinition) for the full field reference and the reserved `order` values.

## Async Hooks

All four hooks accept `Promise` return values. The pipeline runner uses `await` for each hook:

```typescript
async onComponentScanned(component) {
  const result = await fetch(`https://api.example.com/meta/${component.className}`);
  const data = await result.json();
  component.meta = { ...component.meta, remote: data };
}
```

The pipeline is sequential and does not parallelize hook calls within a phase. If a hook is slow, it blocks the full rebuild. Keep async hooks lightweight.

## Error Handling

If a hook throws, the error propagates out of `runPluginHooks()` and is caught by the builder, which logs it and marks the build as failed. The Angular dev server is not started if the pipeline fails.

## What Cannot Be Done in Hooks

Build-time hooks run in Node.js. The following are not available:

- Browser globals (`window`, `document`, `navigator`)
- Angular APIs that require the browser (`@angular/platform-browser`, CDK)
- Lazy-loaded Angular components

For browser-only functionality, use `panels` and `controls` runtime contributions instead, since they are only loaded in the browser.
