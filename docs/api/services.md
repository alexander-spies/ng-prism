# Runtime Services

All services are provided in `root` and injectable anywhere in the Prism app, for example in component pages and plugin components. Import from `@ng-prism/core`.

---

## PrismManifestService

Manages the runtime manifest, i.e. the in-memory representation of all discovered components, services and pages.

```typescript
import { PrismManifestService } from '@ng-prism/core';

@Component({ ... })
export class MyComponent {
  private readonly manifest = inject(PrismManifestService);
}
```

| Member                     | Type                                      | Description                                                            |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `manifest`                 | `Signal<RuntimeManifest>`                 | Full runtime manifest (read-only)                                      |
| `components`               | `Signal<RuntimeComponent[]>`              | All registered components                                              |
| `services`                 | `Signal<RuntimeService[]>`                | All registered [services](guide/showcasing-services.md), `[]` for none |
| `pages`                    | `Signal<StyleguidePage[]>`                | All registered pages                                                   |
| `categories`               | `Signal<string[]>`                        | Distinct category names, sorted by `categoryOrder` then alphabetically |
| `groupedByCategory`        | `Signal<Map<string, RuntimeComponent[]>>` | Components keyed by category                                           |
| `updateManifest(manifest)` | `void`                                    | Replace the entire manifest (used by HMR)                              |

---

## PrismNavigationService

Manages which component, service or page is currently selected in the sidebar.

| Member                   | Type                                     | Description                                                                        |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `activeItem`             | `WritableSignal<NavigationItem \| null>` | Currently active navigation item                                                   |
| `activeComponent`        | `Signal<RuntimeComponent \| null>`       | Derived from `activeItem` if kind is `'component'`                                 |
| `activeService`          | `Signal<RuntimeService \| null>`         | Derived from `activeItem` if kind is `'service'`                                   |
| `activePage`             | `Signal<StyleguidePage \| null>`         | Derived from `activeItem` if kind is `'page'`                                      |
| `sectionTree`            | `Signal<SectionNode[]>`                  | Sidebar tree of sections and their categories, filtered by search, sorted by order |
| `select(comp)`           | `void`                                   | Select a `RuntimeComponent`                                                        |
| `selectService(service)` | `void`                                   | Select a `RuntimeService`                                                          |
| `selectPage(page)`       | `void`                                   | Select a `StyleguidePage`                                                          |
| `selectFirst()`          | `void`                                   | Select the first component, service or page in the manifest                        |

---

## PrismRendererService

Tracks the active variant and input values for the currently rendered component.

| Member                        | Type                                                    | Description                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeVariantIndex`          | `WritableSignal<number>`                                | Index of the active variant tab (0-based)                                                                                                                                                                                                                                                                                                                         |
| `activeStateIndex`            | `WritableSignal<number \| null>`                        | Position in `ShowcaseConfig.states` of the component-level state on the canvas, `null` for none. Survives a variant change; reset when the component changes                                                                                                                                                                                                      |
| `inputValues`                 | `WritableSignal<Record<string, unknown>>`               | Current input values (merged defaults + variant + user overrides)                                                                                                                                                                                                                                                                                                 |
| `activeContent`               | `Signal<string \| Record<string, string> \| undefined>` | Content projected into the canvas                                                                                                                                                                                                                                                                                                                                 |
| `renderedElement`             | `WritableSignal<Element \| null>`                       | Reference to the root DOM element of the rendered component                                                                                                                                                                                                                                                                                                       |
| `resetForComponent(comp)`     | `void`                                                  | Full reset: resets variant index, state, inputs, and content to variant 0                                                                                                                                                                                                                                                                                         |
| `reconcileForComponent(comp)` | `void`                                                  | Runs on every component change, in any view, and again when the renderer mounts. Full reset when `comp` is another component than the last one; otherwise a soft reset that preserves variant index, state and user-overridden inputs (HMR, a cell opened from the Overview or restored from the URL) and merges input defaults when there was no prior component |
| `selectVariant(index)`        | `void`                                                  | Change variant and apply its inputs                                                                                                                                                                                                                                                                                                                               |
| `selectState(index)`          | `void`                                                  | Set `activeStateIndex`; `null` clears the state                                                                                                                                                                                                                                                                                                                   |
| `updateInput(name, value)`    | `void`                                                  | Update a single input value (merges into `inputValues`)                                                                                                                                                                                                                                                                                                           |

Use `inputValues()` in Component Pages to react to Controls panel changes:

```typescript
readonly rowCount = computed(() =>
  this.renderer.inputValues()['rowCount'] as number ?? 0
);
```

---

## PrismSearchService

Provides sidebar search and filtering.

| Member               | Type                         | Description                                                     |
| -------------------- | ---------------------------- | --------------------------------------------------------------- |
| `query`              | `Signal<string>`             | Current search query                                            |
| `filteredComponents` | `Signal<RuntimeComponent[]>` | Components matching the query (title, category, tags)           |
| `filteredServices`   | `Signal<RuntimeService[]>`   | Services matching the query (title, class name, category, tags) |
| `filteredPages`      | `Signal<StyleguidePage[]>`   | Pages matching the query (title, category)                      |
| `search(q)`          | `void`                       | Set the search query                                            |
| `clear()`            | `void`                       | Clear the search query                                          |

---

## PrismEventLogService

Records output events emitted by the rendered component for display in the Events panel.

| Member             | Type                      | Description                               |
| ------------------ | ------------------------- | ----------------------------------------- |
| `events`           | `Signal<EventLogEntry[]>` | List of logged events (most recent first) |
| `log(name, value)` | `void`                    | Append an event entry                     |
| `clear()`          | `void`                    | Clear all entries                         |

`EventLogEntry`:

```typescript
interface EventLogEntry {
    id: number;
    timestamp: number;
    name: string;
    value: unknown;
}
```

The built-in renderer calls `log()` automatically for all `output()` signals. Use `log()` manually only if you build a custom renderer.

---

## PrismPanelService

Controls which addon panel and view tab are active.

| Member          | Type                     | Description                                              |
| --------------- | ------------------------ | -------------------------------------------------------- |
| `activePanelId` | `WritableSignal<string>` | ID of the active addon panel tab (default: `'controls'`) |
| `activeViewId`  | `WritableSignal<string>` | ID of the active view tab (default: `'renderer'`)        |

---

## PrismLayoutService

Manages sidebar, variant rail, and panel visibility. State is persisted to `localStorage` under the key `ng-prism-layout`.

| Member                | Type                          | Description                                                                                                                                                                                  |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebarVisible`      | `Signal<boolean>`             | Whether the sidebar is visible                                                                                                                                                               |
| `addonsVisible`       | `Signal<boolean>`             | Whether the addon panel area is visible                                                                                                                                                      |
| `toolbarVisible`      | `Signal<boolean>`             | Whether the variant rail (the variant ribbon above the canvas) is visible. The name predates the removal of the canvas toolbar band, which is now a floating rail and has no visibility flag |
| `addonsOrientation`   | `Signal<'bottom' \| 'right'>` | Panel area orientation                                                                                                                                                                       |
| `sidebarWidth`        | `Signal<number>`              | Sidebar width in pixels (160–600)                                                                                                                                                            |
| `panelHeight`         | `Signal<number>`              | Addon panel height in pixels, used when orientation is `'bottom'` (100–600)                                                                                                                  |
| `panelWidth`          | `Signal<number>`              | Addon panel width in pixels, used when orientation is `'right'` (200–600)                                                                                                                    |
| `toggleSidebar()`     | `void`                        | Toggle sidebar visibility                                                                                                                                                                    |
| `toggleAddons()`      | `void`                        | Toggle addon panel visibility                                                                                                                                                                |
| `toggleToolbar()`     | `void`                        | Toggle variant rail visibility (`Alt+T`)                                                                                                                                                     |
| `toggleOrientation()` | `void`                        | Switch between bottom and right orientation                                                                                                                                                  |
| `setSidebarWidth(px)` | `void`                        | Set sidebar width with clamping                                                                                                                                                              |
| `setPanelHeight(px)`  | `void`                        | Set panel height with clamping                                                                                                                                                               |
| `setPanelWidth(px)`   | `void`                        | Set panel width with clamping                                                                                                                                                                |

---

## PrismPluginService

Provides aggregated plugin contributions (panels and controls) derived from `NgPrismConfig.plugins`.

| Member        | Type                          | Description                        |
| ------------- | ----------------------------- | ---------------------------------- |
| `panels`      | `Signal<PanelDefinition[]>`   | All panels from all plugins        |
| `addonPanels` | `Signal<PanelDefinition[]>`   | Panels with `placement !== 'view'` |
| `viewPanels`  | `Signal<PanelDefinition[]>`   | Panels with `placement === 'view'` |
| `controls`    | `Signal<ControlDefinition[]>` | All controls from all plugins      |

---

## PrismUrlStateService

Synchronizes navigation state with URL query parameters: `component`, `service`, `page`, `variant`, `state`, `view`, `panel`. Initialized automatically by `PrismShellComponent`.

| Member   | Description                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `init()` | Reads initial state from URL, starts sync effect, and registers `popstate` listener |

Disabled via `NgPrismConfig.urlState = false`. See [State Preservation](guide/url-state.md).

---

## PrismPersistenceService

Persists control panel input overrides (per `className` + `variantIndex`) and a11y sub-state (`activeTab`, `perspective`) to `sessionStorage` under the key `ng-prism:state`. Initialized automatically by `PrismShellComponent` immediately after `PrismUrlStateService`.

| Member   | Description                                                                               |
| -------- | ----------------------------------------------------------------------------------------- |
| `init()` | Reads sessionStorage, applies persisted state, and starts a debounced sync effect (200ms) |

Schema version, corrupted JSON, quota-exceeded errors, and a missing `sessionStorage` (Privacy/SecurityError) are all handled gracefully. Layout, theme, and canvas are persisted independently to `localStorage` by their own services.

Disabled via `NgPrismConfig.persistState = false`. See [State Preservation](guide/url-state.md).

`PrismShellComponent` calls both init methods, URL state first, then persistence.

---

## enablePrismHmr

A standalone function (not a service) that integrates with Vite/webpack HMR to hot-reload the manifest without a full page refresh.

```typescript
import { enablePrismHmr } from '@ng-prism/core';
import type { ApplicationRef } from '@angular/core';

// In your HMR accept handler:
enablePrismHmr(appRef, newManifest);
```

`enablePrismHmr(appRef, newManifest)` calls `PrismManifestService.updateManifest()` via the app's root injector. The showcase UI updates reactively without losing the active selection.
