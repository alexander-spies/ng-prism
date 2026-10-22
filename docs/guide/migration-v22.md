# Migration to v22

`@ng-prism/core@22.0.0` moves the auto-generated `prism-manifest.ts` out of your source tree into a workspace-level cache directory and switches the import to a tsconfig path mapping. This is a **breaking change**: the previous layout will not work against the new pipeline.

> **This guide is for existing ng-prism installations** being upgraded from `21.x` to `22.x`. If you have not used ng-prism in this workspace before, you want a fresh install instead; see [Installation & Setup](installation.md).

## Prerequisites

- Angular CLI **22+** in your workspace. The migration schematic is shipped as ESM; older CLI versions silently skip it or report "package does not provide any `ng add` actions". Run `ng version` to check.
- Node.js **22+** (Angular CLI 22 requirement).

## TL;DR: upgrade an existing 21.x install

Update core and every installed `@ng-prism/plugin-*` in a single call so peer dependencies resolve together. While `22.0.0` is in beta, use the `@beta` dist-tag:

```bash
ng update @ng-prism/core@beta \
  @ng-prism/plugin-box-model@beta \
  @ng-prism/plugin-coverage@beta \
  @ng-prism/plugin-figma@beta \
  @ng-prism/plugin-jsdoc@beta \
  @ng-prism/plugin-perf@beta
```

Drop any plugins you don't have installed. Once `22.0.0` stable is published, the `@beta` suffix can be omitted:

```bash
ng update @ng-prism/core @ng-prism/plugin-box-model @ng-prism/plugin-coverage \
  @ng-prism/plugin-figma @ng-prism/plugin-jsdoc @ng-prism/plugin-perf
```

The Angular CLI will pull in the new versions, run the migration schematic, and leave your workspace in the new layout. Manual `main.ts` customizations (component pages, zoneless setup, custom providers) are preserved. Only the manifest import line is touched.

> **Why core + plugins together?** Each plugin declares `@ng-prism/core` as a peer dependency pinned to its major. If you update core to `22` without bumping plugins, npm rejects the install with a peer-dependency conflict. Bundling them in one `ng update` call lets the CLI resolve the whole set at once.

If you see peer-dependency warnings about `@angular-devkit/architect`, `@angular-devkit/core`, or `@angular-devkit/schematics`, those packages are available transitively via `@angular/cli` / `@angular-devkit/build-angular` in any Angular workspace. npm warns because they are not declared directly. Add `--force` to acknowledge:

```bash
ng update @ng-prism/core@beta @ng-prism/plugin-...@beta --force
```

After the update, verify:

```bash
ng run my-lib:prism        # dev server still starts
ng run my-lib:prism-build  # production build still succeeds
```

You should see the manifest generated at `<workspaceRoot>/ng-prism-cache/<my-lib>-prism/prism-manifest.ts` (where `<my-lib>` is your library project name).

## Troubleshooting

**`ng update` says "Package '@ng-prism/core' does not exist within the registry"**

You probably used `--next=true`. That flag looks for a `next` dist-tag specifically; ng-prism uses `beta` instead. Use `@beta` (or pin the explicit version) as shown above.

**`ng update` says "already up to date"**

No older ng-prism is installed, so there is nothing to migrate. If you intended a fresh install, use `ng add @ng-prism/core@beta` (see [Installation & Setup](installation.md)). If `ng add` reports "Package does not provide any `ng add` actions", run the schematic directly:

```bash
ng generate @ng-prism/core:ng-add --project=<your-library>
```

(Replace `<your-library>` with the name of your Angular library project from `angular.json`.)

**`ng update` runs but my `main.ts` and `tsconfig.json` look unchanged**

Confirm your Angular CLI is on version 22 or newer (`ng version`). ng-prism's schematics are ESM modules; older CLI versions cannot load them and may skip them silently. Upgrade CLI first:

```bash
ng update @angular/cli @angular/core --next
```

Then re-run the ng-prism migration.

**`ng update` fails with "Incompatible peer dependencies found"**

You probably bumped `@ng-prism/core` without also bumping the plugin packages (which still pin to the previous major). Re-run the combined update above so core and every installed `@ng-prism/plugin-*` move in lockstep.

**Build fails with `TS6059: File '...prism-manifest.ts' is not under rootDir`**

Your `projects/<lib>-prism/tsconfig.app.json` doesn't widen `rootDir` to the workspace root. The migration in v22.0.0-beta.0 missed this update. Open the file and add both `rootDir` and the include glob:

```diff
  "compilerOptions": {
    "outDir": "../../out-tsc/app",
+   "rootDir": "../..",
    "types": []
  },
  ...
  "include": [
    "src/**/*.d.ts",
+   "../../ng-prism-cache/<lib>-prism/**/*.ts"
  ]
```

Fixed automatically in v22.0.0-beta.1 onward.

**Build fails with `TS5090: Non-relative paths are not allowed when 'baseUrl' is not set`**

Your root `tsconfig.json`'s `paths` values lack a `./` prefix. The migration in v22.0.0-beta.0 wrote the path mapping value without it. Open `tsconfig.json` and add the prefix:

```diff
- "prism-manifest/*": ["ng-prism-cache/*/prism-manifest.ts"]
+ "prism-manifest/*": ["./ng-prism-cache/*/prism-manifest.ts"]
```

Same applies to any other ng-prism path mappings (`ng-prism.config`, `<lib>`) if they lack the prefix. Fixed automatically in v22.0.0-beta.1 onward.

## What the migration does

The migration schematic runs four steps per prism project found in your `angular.json`, plus one workspace-level step:

### 1. Rewrites `main.ts` import

```diff
- import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
+ import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/<lib>-prism';
```

The new specifier is project-specific (it ends with your prism project name), so multiple prism projects can coexist in one workspace (see the [wildcard mapping section](#wildcard-path-mapping) below).

The regex tolerates whitespace and quote-style variations and is anchored to line-start, so commented-out lines (`// import ...`) are left untouched.

### 2. Adds a wildcard path mapping to `tsconfig.json`

```diff
  "compilerOptions": {
    "paths": {
      "ng-prism.config": ["./ng-prism.config.ts"],
      "my-lib": ["./projects/my-lib/src/public-api.ts"],
+     "prism-manifest/*": ["./ng-prism-cache/*/prism-manifest.ts"]
    }
  }
```

### 3. Deletes the legacy in-tree manifest

```
- projects/<lib>-prism/src/prism-manifest.ts
```

(If you previously committed the file by accident, `git status` will show it as deleted after the migration. Stage the deletion as part of your migration commit.)

### 4. Removes the stale `.gitignore` entry

```diff
- projects/<lib>-prism/src/prism-manifest.ts
```

### 5. Adds a single workspace-wide ignore (runs once, not per project)

```diff
+ ng-prism-cache/
```

### 6. Updates each prism `tsconfig.app.json`

```diff
  "compilerOptions": {
    "outDir": "../../out-tsc/app",
+   "rootDir": "../..",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": [
    "src/**/*.d.ts",
+   "../../ng-prism-cache/<lib>-prism/**/*.ts"
  ]
```

Both changes are required:

- `include` tells TypeScript that the cache file is part of the project (otherwise it isn't loaded into the compilation).
- `rootDir: ../..` widens the project's root to the workspace so the cache file is _under_ rootDir. Without this, TypeScript rejects with `TS6059: File ... is not under rootDir` even when the file is included.

An existing user-defined `rootDir` is preserved; the migration only sets the default when no `rootDir` is declared.

## Wildcard path mapping

If you have multiple prism projects in the same workspace, the wildcard mapping resolves each one to its own cache file:

```jsonc
"prism-manifest/*": ["./ng-prism-cache/*/prism-manifest.ts"]
```

So `from 'prism-manifest/test-lib-prism'` resolves to `./ng-prism-cache/test-lib-prism/prism-manifest.ts`, and `from 'prism-manifest/test-ui-kit-prism'` resolves to `./ng-prism-cache/test-ui-kit-prism/prism-manifest.ts`. Each project's `main.ts` imports its own specifier, so no per-tsconfig.app.json overrides are needed.

## Manual migration

If you can't use `ng update` (e.g., locked CLI version, vendored dependencies), apply the same edits by hand. For each prism project in your `angular.json`:

### Step 1: Edit `projects/<lib>-prism/src/main.ts`

Change the import line:

```diff
- import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
+ import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/<lib>-prism';
```

Replace `<lib>-prism` with the actual prism project name (the value of `prismProject` in your `@ng-prism/core:serve` builder options, typically `<library-name>-prism`).

### Step 2: Edit `tsconfig.json`

Add the wildcard mapping under `compilerOptions.paths`:

```jsonc
{
    "compilerOptions": {
        "paths": {
            // ... your existing mappings ...
            "prism-manifest/*": ["./ng-prism-cache/*/prism-manifest.ts"]
        }
    }
}
```

This single workspace-wide entry covers all prism projects via the `*` wildcard. The leading `./` is required for TypeScript 6 when `baseUrl` is not set.

### Step 3: Delete the legacy manifest file

```bash
rm projects/<lib>-prism/src/prism-manifest.ts
```

Plus the `.d.ts` companion if it exists:

```bash
rm projects/<lib>-prism/src/prism-manifest.d.ts
```

### Step 4: Update `.gitignore`

Remove any per-project manifest lines:

```diff
- projects/<lib>-prism/src/prism-manifest.ts
```

Add a single workspace-wide ignore:

```diff
+ ng-prism-cache/
```

### Step 5: Update `projects/<lib>-prism/tsconfig.app.json`

Two changes:

```diff
  "compilerOptions": {
    "outDir": "../../out-tsc/app",
+   "rootDir": "../..",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": [
    "src/**/*.d.ts",
+   "../../ng-prism-cache/<lib>-prism/**/*.ts"
  ]
```

`include` adds the cache file to the program; `rootDir: ../..` makes the workspace root the project root so the cache file is _under_ rootDir. Without both, TypeScript fails with `TS6059`.

### Step 6: Run a build to populate the cache

```bash
ng run my-lib:prism-build
```

The pipeline will generate `<workspaceRoot>/ng-prism-cache/<lib>-prism/prism-manifest.ts` on first run. The Angular bundle should compile cleanly.

## What if I skip the migration?

If you upgrade to `@ng-prism/core@22.0.0` and don't run `ng update` or apply the manual steps, expect one of two outcomes:

- **Stale `src/prism-manifest.ts` still present** (the file was previously generated): your `main.ts` still imports the old file via the relative path. The build succeeds, but the data is stale: components added since the last pipeline run won't appear in your styleguide. Run `ng update @ng-prism/core` to fix.
- **Old file deleted** (e.g., wiped by `git clean -fdx`): TypeScript fails with `Cannot find module './prism-manifest'`.

In either case, run `ng update @ng-prism/core` or follow the manual steps above.

## Angular version compatibility

`@ng-prism/core@22.0.0` supports Angular 20, 21 and 22 in a single release (peerDependency `>=20.0.0`). You do not need to be on Angular 22 to upgrade. If you're on 20 or 21, the manifest cache-dir migration is independent of your Angular major.

## `cacheDir` builder option

A new optional `cacheDir` option on both `@ng-prism/core:serve` and `@ng-prism/core:build` lets you override the default cache directory. Useful for CI sandboxes with constrained filesystem layouts or non-standard workspace setups.

```json
{
    "architect": {
        "prism": {
            "builder": "@ng-prism/core:serve",
            "options": {
                "entryPoint": "projects/my-lib",
                "prismProject": "my-lib-prism",
                "cacheDir": "tmp/prism-cache"
            }
        }
    }
}
```

Relative paths resolve against `workspaceRoot`. If you set this option, also update the tsconfig path mapping target accordingly.

## Breaking changes in 22.2.0

`22.2.0` reduces the fixed chrome above the canvas. The component head's description, tags, selector and stat row moved into a details popover, the canvas tools left the layout for a floating rail, and the panel tabs picked up a consistent icon per tab. All new tokens are additive and every existing token is kept. The breaking changes are small and affect application code only, not `ShowcaseConfig`:

- **`PrismLayoutService.templatePopoverVisible`, `toggleTemplatePopover()` and `closeTemplatePopover()` are gone.** The Angular-template popover now uses the platform [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API): open and close are wired through `popovertarget`/`popovertargetaction` attributes instead of a service call. If your own code called any of these three members directly, replace the call with a `popovertarget="prism-template"` attribute on your trigger element; there is no programmatic open/close anymore.
- **`Alt+T` toggles only the variant rail now.** The component head no longer hides with it, because it carries the Playground/API view switcher. If you built tooling that asserts on the component head disappearing after `Alt+T`, update it to expect only the variant ribbon to hide.
- **Four internal class names are gone from the DOM:** `.comp-desc`, `.comp-tags`, `.comp-selector`, `.comp-head-stats` on the component head, and the variant ribbon's `--vc` custom property. None of these were documented public API, but a `themeStylesheet` or browser extension that targeted them will no longer match. The description and tags now render inside the component head's details popover (behind the ⓘ glyph); the selector lives there too; the stat row was replaced by the head gauge. The variant ribbon no longer assigns a per-tab colour via `--vc`. Each tab reads a slice of `--prism-spectrum` instead, positioned with `--i`/`--n`.
- **The canvas toolbar is no longer a band.** It used to occupy a fixed-height strip between the variant ribbon and the canvas stage; it is now a floating rail (`.prism-toolrail`) absolutely positioned inside `.prism-canvas-wrap`, plus a popover menu for the background and zoom choosers. See [Theming: Marks, Measurement and Stage Tokens](theming.md#marks-measurement-and-stage-tokens) for the recommendation marker's replacement (a tinted border instead of a star).
- **The gauge readout in the component head shows three values instead of five:** coverage, a11y score and VRT diff. The variant count moved to the details popover behind the ⓘ glyph, next to the selector and the tags, because it is a property of the component and has no threshold. The bundle-size figure was dropped: `bundleSize()` read `gzipKb`/`sizeKb` while `@ng-prism/plugin-perf` writes `sourceSize`/`gzipEstimate`, so the value was always `null`.

None of this affects `ShowcaseConfig`, the manifest format, or any plugin's public API. See [`PrismMetricBadgeComponent` and `PrismIconComponent`](../plugins/writing-plugins.md#header-and-panel-widgets) if you are building a header widget and want the same building blocks the built-in gauge uses.

## Breaking changes and deprecations in 22.7.0

`22.7.0` adds [services](showcasing-services.md) and [pipes](showcasing-pipes.md) to the styleguide. Everything else is additive: for components and directives, `PrismManifest.components`, `RuntimeManifest.components`, `__PRISM_MANIFEST__`, `onComponentScanned` and the panels you already have see the same entries as before, and the `@ng-prism/core` peer dependency stays `>=20.0.0`. The exception is a class with `@Showcase` and `@Injectable`, `@Service` or `@Pipe`, which used to be scanned as a component and now leaves `components`, as described below. Its Playground never rendered it, so nothing that worked is lost; a tool that enumerated `components` simply no longer sees it. The one breaking change in application code is a type-level one. The deprecation below changes nothing in 22.x.

Before 22.7.0 every class with `@Showcase` was a component, so a class with `@Showcase` and `@Pipe` was in `components` (with the selector `''`), in `__PRISM_MANIFEST__` and in `onComponentScanned`, and its Playground never rendered it. In 22.7.0 it depends on the pipe:

- **Standalone, without component-only fields:** it leaves `components`, `__PRISM_MANIFEST__` and `onComponentScanned`. With `jsDocPlugin()` from `@ng-prism/plugin-jsdoc` 22.7.0 or newer it is listed under **Pipes** and goes through `onPipeScanned`; without it the build leaves it out and says so once, see [Showcasing Pipes: Without the JSDoc plugin](showcasing-pipes.md#without-the-jsdoc-plugin).
- **`standalone: false`, or a `name` the scanner cannot read, without component-only fields:** it is dropped with a warning, which fails a [`strictShowcase`](../api/ng-prism-config.md#strictshowcase) build.
- **With a component-only field** such as `renderPage`: it stays a component until 23.0.0, with a notice, see [the deprecation below](#deprecation-injectables-and-pipes-with-component-only-fields). From 23.0.0 a standalone pipe is shown as a pipe and one declared in an NgModule is dropped.

A class with `@Injectable` or `@Service` moves the same way: without component-only fields it leaves `components`, `__PRISM_MANIFEST__` and `onComponentScanned`, and with `jsDocPlugin()` 22.7.0 or newer it is listed under **Services** and goes through `onServiceScanned`, see [Showcasing Services](showcasing-services.md).

### Breaking change: NavigationItem has two new kinds

`NavigationItem` is exported from `@ng-prism/core` and gains `{ kind: 'service'; data: RuntimeService }` and `{ kind: 'pipe'; data: RuntimePipe }`. It only affects code of your own that narrows a `NavigationItem` by `kind` and reads `data`, for example a custom page or a plugin panel reading `PrismNavigationService.activeItem()`. That code needs a `'service'` and a `'pipe'` branch. A plain two-way check now fails to compile, because the other branch is `RuntimeService | RuntimePipe | StyleguidePage`:

```typescript
// before 22.7.0
function label(item: NavigationItem): string {
    return item.kind === 'component' ? item.data.meta.showcaseConfig.title : item.data.title;
}

// from 22.7.0
function label(item: NavigationItem): string {
    switch (item.kind) {
        case 'component':
        case 'service':
        case 'pipe':
            return item.data.meta.showcaseConfig.title;
        case 'page':
            return item.data.title;
    }
}
```

The same goes for a `switch` that ends in `never` and for a lookup typed on the union. At runtime nothing changes until your styleguide actually contains a service or a pipe. The members `PrismNavigationService.activeService`, `selectService()`, `activePipe` and `selectPipe()` and the `service` and `pipe` URL parameters are new and change nothing for existing code. See [`NavigationItem`](../api/types.md#navigationitem).

### Deprecation: injectables and pipes with component-only fields

**Deprecated since 22.7.0, removed in 23.0.0. Nothing changes in 22.x.** Before services and pipes had a page, a class with `@Showcase` and `@Injectable` or `@Pipe` landed in `components`, and with `renderPage` it had a working page. It keeps that page in 22.x: a class with `@Injectable`, `@Service` or `@Pipe` that declares `variants`, `states`, `providers`, `bg`, `canvasLayout`, `host` or `renderPage` stays a component, and the build prints a notice (it does not count for [`strictShowcase`](../api/ng-prism-config.md#strictshowcase)). From 23.0.0 it is shown as a service or a pipe and those fields are dropped. To switch now, remove the fields, or move the page to a [component page](component-pages.md) and keep the service or pipe on its own. See [Showcasing Services: Compatibility until 23.0.0](showcasing-services.md#compatibility-until-2300) and [Showcasing Pipes: Compatibility until 23.0.0](showcasing-pipes.md#compatibility-until-2300).

A `@Pipe` declared in an NgModule (`standalone: false`) goes one step further. ng-prism shows standalone pipes only, so such a pipe without component-only fields is already dropped with a warning in 22.7.0 (see above), and one with component-only fields keeps its page in 22.x and loses it in 23.0.0. The notice in 22.x says so: `From 23.0.0 it will be dropped, because ng-prism shows standalone pipes only; make the pipe standalone and remove the fields, or move the page to a componentPage.` Make the pipe standalone and remove the fields to have it shown as a pipe, or move the page to a component page.

## Related

- Issue [#13](https://github.com/ng-prism/ng-prism/issues/13)
- Follow-up RFC [#14](https://github.com/ng-prism/ng-prism/issues/14): drop the separate `<lib>-prism` project entirely
