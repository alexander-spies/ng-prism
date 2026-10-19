---
name: write-plugin
description: Use when writing your own ng-prism plugin (NgPrismPlugin from @ng-prism/core/plugin) - build-time hooks (onComponentScanned, onPageScanned, onManifestReady), panels and canvas overlays, custom input controls, header widgets, sidebar navigation decorations - or packaging one for npm. Not for adding an official plugin (skill setup) and not for developing ng-prism itself.
---

# Writing an ng-prism plugin

A plugin is a factory function that returns an `NgPrismPlugin`, registered in `ng-prism.config.ts`
(`plugins: [notesPlugin()]`). That file runs twice: in Node inside the builder, where the hooks run, and in the
browser, where the styleguide picks up panels, controls, widgets and decorations. Whatever a plugin imports at the top
level has to load on both sides.

## The installed version decides

Read `version` in `node_modules/@ng-prism/core/package.json`. Where this skill and the installed package disagree, the
package is right:

- Every type below, with JSDoc: `node_modules/@ng-prism/core/dist/plugin/plugin.types.d.ts`.
- A field this skill names that those typings don't have is newer than the installed version: don't use it, suggest an
  update at most.
- Guides: `https://ng-prism.github.io/ng-prism/`, served as raw Markdown you can fetch directly, e.g.
  `https://ng-prism.github.io/ng-prism/plugins/writing-plugins.md`. The pages for this skill are listed at the end.

## Build-time hooks

```ts
import type { NgPrismPlugin } from '@ng-prism/core/plugin';

export function notesPlugin(): NgPrismPlugin {
    return {
        name: 'notes',
        onComponentScanned(component) {
            const variants = component.showcaseConfig.variants ?? [];
            component.showcaseConfig.meta = { ...component.showcaseConfig.meta, notes: { variants: variants.length } };
            return component;
        }
    };
}
```

- `onComponentScanned(component)` runs once per component, `onPageScanned(page)` once per page from the config's
  `pages` (not the component pages registered in `main.ts`), `onManifestReady(manifest)` once at the end.
- Plugins run in registration order, one after the other, and each gets the previous one's result. Return the changed
  object, a new one, or nothing to keep it as it is; `async` is fine.
- What a user wrote in `@Showcase({ meta })` arrives as `component.showcaseConfig.meta`, a variant's as
  `component.showcaseConfig.variants[i].meta`.
- Store per-component results in `component.showcaseConfig.meta[<your key>]`, as the official plugins do. Data for the
  whole library goes into `manifest.meta`, read in the browser with `inject(PRISM_MANIFEST).meta`.
- The manifest that carries these results to the browser is generated source code: only JSON-like data survives. In
  a component's showcase meta a function becomes `undefined`, and a `Date`, `Map`, `Set` or class instance becomes a
  plain object of its own enumerable fields (`{}` for the built-ins). `manifest.meta` is written with `JSON.stringify`:
  functions are dropped, a `Date` becomes an ISO string.
- Import Node-only modules inside the hook (`const { readFile } = await import('node:fs/promises')`), never at the top
  of the file: the same file is bundled for the browser.
- A hook that throws stops the build with `ng-prism: plugin "<name>" failed in <hook> for …`; during `serve`, a failed
  rescan keeps the previous manifest.

## Runtime contributions

| Field                   | Definition                                                                                                                              | The component receives                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `panels`                | `{ id, label, loadComponent, icon?, placement?: 'addon' \| 'view', isVisible?, badge?, keepAlive?, providers?, loadOverlayComponent? }` | input `activeComponent: RuntimeComponent \| null` |
| overlay                 | `loadOverlayComponent` on a panel, drawn over the canvas while that panel is active                                                     | input `rendererService: PrismRendererService`     |
| `controls`              | `{ matchType: (input: InputMeta) => boolean, component }`                                                                               | inputs `inputMeta` and `rendererService`          |
| `headerWidgets`         | `{ id, loadComponent, placement?: 'start' \| 'end', order? }`                                                                           | nothing                                           |
| `navigationDecorations` | `{ id, icon, order?, badge: (c) => { variant: 'warn' \| 'danger', label } \| null }`                                                    | (no component)                                    |

- Components are standalone. Load panels, overlays and header widgets lazily:
  `loadComponent: () => import('./notes-panel.component').then((m) => m.NotesPanelComponent)`. An eager `component`
  pulls its imports into the file that also runs in Node. Controls only have `component`.
- `RuntimeComponent.meta` is the whole scanned component, so the user's showcase meta is
  `activeComponent()?.meta.showcaseConfig.meta`.
- The selected variant and its inputs: inject `PrismRendererService` from `@ng-prism/core` (`activeVariantIndex()`,
  `inputValues()`, `renderedElement()`, `selectVariant()`, `updateInput()`). `PrismNavigationService.activeComponent`
  is the selection. `PRISM_MANIFEST`, `PRISM_CONFIG` and `ICON_NAMES` (the valid `icon` values) come from
  `@ng-prism/core/plugin`.
- `isVisible`, `badge` and a decoration's `badge` run during change detection: keep them pure and cheap, and decide
  verdicts in `onComponentScanned`.
- Panel ids are not deduplicated: prefix yours and avoid the built-in `overview`, `controls`, `events` and `a11y`.
- Decoration ids are deduplicated: built-ins first (only `a11y`), then plugins in registration order. The first
  definition of an id wins, later ones are dropped silently. The orders 10, 20 and 30 belong to a11y, visual regression
  and coverage.
- The first control whose `matchType` matches wins, in registration order.
- `wrapComponent` and a panel's `position` are in the typings, but nothing has ever read them; they are deprecated
  (removed in 23.0.0). Don't use them. Where a panel appears is `placement`.

## Packaging for npm

The official plugins with build-time hooks split into a Node entry with everything and a browser entry with the
runtime contributions only:

```json
{
    "type": "module",
    "exports": {
        "./package.json": "./package.json",
        ".": {
            "types": "./dist/index.d.ts",
            "browser": "./dist/index.browser.js",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "peerDependencies": { "@angular/core": ">=20.0.0", "@ng-prism/core": "^22.5.0-0" }
}
```

- `index.ts` exports the factory with hooks and contributions; `index.browser.ts` exports a factory of the same name
  without the hooks. Both export the same names, since they share one `index.d.ts`.
- Angular and `@ng-prism/core` are `peerDependencies`, never bundled.
- Optional `ng add`: a schematic that calls `addPluginToConfig(tree, path, { importName, importFrom, call })` from
  `@ng-prism/core/schematics/utils`, with `path` pointing at `ng-prism.config.ts`.

## A plugin inside your repo

A plugin doesn't have to be a package. Import its file from `ng-prism.config.ts` with the `.ts` extension
(`import { notesPlugin } from './prism/notes-plugin.ts';`) and add `"rewriteRelativeImportExtensions": true` to the
`compilerOptions` of the styleguide app's `tsconfig.app.json`, so the browser build accepts that path. In the builder,
Node loads the file as it is, which needs Node 22.18 or newer; without `"type": "module"` in the root `package.json` it
prints a harmless `MODULE_TYPELESS_PACKAGE_JSON` warning. That file and whatever it imports statically may only
use TypeScript Node can strip: `import type` for types, no `enum`, no decorators, no constructor parameter properties.
Write its own relative imports with `.ts` as well; Node adds no extension. Keep components behind `loadComponent`,
which only the browser runs. That rules out `controls`: a control's `component` is eager, so its decorator would have
to run in Node. Restart `ng run <lib>:prism` after changing a hook: Node caches the imported plugin module, so a rescan
doesn't reload it.

## Testing

- Hooks are plain functions: unit-test them with a hand-built `ScannedComponent`.
- Then run the styleguide (`ng run <lib>:prism`), check the hook's effect in the log and open the panel; the showcase
  skill's screenshot script with `--shell` shows the UI.

## Guides

- `plugins/writing-plugins.md`, `architecture/plugin-hooks.md`, `api/ng-prism-plugin.md`, `api/services.md`
