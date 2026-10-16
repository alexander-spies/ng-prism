# Build Pipeline

The ng-prism build pipeline transforms library source files into a TypeScript `prism-manifest.ts` file that the showcase app imports at bootstrap. Everything runs inside the Angular builder process (Node.js).

## Pipeline Steps

`runPrismPipeline()` in `src/builder/shared/prism-pipeline.ts` executes these steps in order:

```
Config load
    ↓
Entry point scan  (TypeScript Compiler API)
    ↓
Merge config pages
    ↓
Plugin hooks  (onComponentScanned, onPageScanned, onManifestReady)
    ↓
Runtime manifest generation  (TypeScript source string)
    ↓
Atomic write  (skip if unchanged)
```

### 1. Config Load

`loadConfig()` uses `ts.transpileModule()` to compile `prism.config.ts` to an `.mjs` file in a temp directory, imports it via `import(pathToFileURL(...))`, and cleans up the temp file. This avoids spawning a separate `tsc` process and works with TypeScript config syntax.

### 2. Entry Point Scan

`scanEntryPoints()` resolves the library root and then dispatches to `discoverSecondaryEntryPoints()`:

- **Directory:** used as the library root directly
- **File:** `findLibraryRoot()` walks upward to the nearest `ng-package.json` and uses that directory as the library root. If no `ng-package.json` is found above the file, or if discovery returns no entries, the pipeline falls back to scanning the file directly (back-compat for non-ng-packagr setups).

Discovery returns one entry per `ng-package.json` (excluding the primary `dest`-rooted one). All discovered entry points are fed into a single `Scanner` instance that is cached on `PrismPipelineState.scanner`. The import path attached to each scanned component (`my-lib`, `my-lib/atoms`, ...) is derived from the entry-point's relative directory.

On rebuild, the same `Scanner` instance is reused. It passes the previous `ts.Program` to `ts.createProgram()` as `oldProgram`, together with a compiler host that returns the already parsed `SourceFile` of every unchanged file, so only changed files are re-parsed (see [How the Scanner Works](architecture/scanner.md#incremental-builds-the-createscanner-factory)). See [PrismPipelineState](#prismpipelinestate-scanner-reuse-across-rebuilds) below for how the cached scanner is invalidated when the entry-point set itself changes.

### 3. Merge Config Pages

`CustomPage` and `ComponentPage` entries from `config.pages` are appended to the page list produced by the scan.

### 4. Plugin Hooks

`runPluginHooks()` iterates over registered plugins in registration order:

1. `onComponentScanned` called once per component
2. `onPageScanned` called once per page
3. `onManifestReady` called once with the full `PrismManifest`

All hooks are awaited, so async plugins are fully supported.

### 5. Runtime Manifest Generation

`generateRuntimeManifest()` converts the `PrismManifest` (plain JSON-safe data) into a TypeScript source string that the showcase app can import. The generated file contains real `import` statements:

```typescript
// ng-prism-cache/<prism-project>/prism-manifest.ts (generated)
import { ButtonComponent } from 'my-lib';
import { CardComponent } from 'my-lib/molecules';

export default {
  components: [
    { meta: { className: 'ButtonComponent', ... }, type: ButtonComponent },
    { meta: { className: 'CardComponent', ... }, type: CardComponent },
  ],
};
```

This avoids JSON serialization of Angular class references and keeps tree-shaking intact.

### 6. Atomic Write (Skip If Unchanged)

`writeManifestIfChanged()` reads the existing manifest and compares it string-for-string with the new content. If identical, the write is skipped and `result.written` is `false`.

When the file must be written, it is first written to `prism-manifest.ts.tmp` then renamed to `prism-manifest.ts`. This prevents the Angular dev server from seeing a partially-written file mid-recompile.

### Manifest Output Location

The generated `prism-manifest.ts` is written to `<workspaceRoot>/ng-prism-cache/<prism-project>/prism-manifest.ts`. It is a build artifact only: `main.ts` imports it through a wildcard `tsconfig.json` path mapping (`"prism-manifest/*": ["ng-prism-cache/*/prism-manifest.ts"]`), with the prism project name in the import specifier (`from 'prism-manifest/<prism-project>'`). The file stays out of the source tree, needs no per-project `.gitignore` entry (one workspace-wide `ng-prism-cache/` is enough), and multi-project workspaces resolve without collisions. For CI sandboxes or unusual setups the builders accept a `cacheDir` option as an override (relative paths resolve against the workspace root).

## PrismPipelineState: Scanner Reuse Across Rebuilds

```typescript
export interface PrismPipelineState {
    scanner: Scanner | undefined;
    lastEntrySetKey: string | undefined;
}
```

The builder creates one `PrismPipelineState` per builder run (not per file change). It is passed into every `runPrismPipeline()` call and caches two things:

- **`scanner`:** a single `Scanner` instance that owns the underlying `ts.Program`. When it is reused across rebuilds, the previous program is passed in as `oldProgram` and the scanner's source-file cache hands TypeScript every unchanged `SourceFile`, so only changed files are re-parsed.
- **`lastEntrySetKey`:** the sorted-and-joined list of entry-file paths from the previous run. It acts as a fingerprint of the entry-point set.

Before each scan the pipeline computes a fresh entry-set key. If it differs from `lastEntrySetKey` (for example because a new secondary entry point was added or removed), the cached `scanner` is discarded (`state.scanner = undefined`) so the next call constructs a fresh one with the new entry set. Otherwise the existing scanner is reused, preserving its incremental-compilation state for fast rebuilds.

## Serve Builder

The serve builder orchestrates the full dev experience:

1. Creates `PrismPipelineState`
2. Runs `runPrismPipeline()` once before starting the Angular dev server
3. Calls `context.scheduleTarget()` to delegate to the Angular dev server
4. **Subscribes to `run.output`** (Observable), not `run.result` (Promise). `run.result` resolves on the first output event, which is long before the server stops. The builder must stay alive until `run.output` completes.
5. Starts a chokidar file watcher via `startWatcher()`

### Watch Mode with chokidar

`startWatcher()` uses chokidar (not `fs.watch`) because `fs.watch({ recursive: true })` does not fire events reliably on macOS.

`createChangeHandler()` wraps the rebuild callback with:

- **300 ms debounce:** rapid saves (e.g. auto-format on save) trigger only one rebuild
- **`isRebuilding` guard:** prevents overlapping rebuild runs
- **Extension filter:** only `.ts`, `.scss`, `.css`, `.svg` changes trigger rebuilds

After a successful rebuild, if the manifest content changed, the Angular dev server detects the file write and triggers a browser reload.

## Build Builder

The build builder runs a single `runPrismPipeline()` call, then delegates to `context.scheduleTarget()` for the Angular production build. It awaits `run.result` (Promise) since it only needs the final outcome.
