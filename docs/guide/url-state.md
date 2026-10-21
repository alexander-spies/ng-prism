# State Preservation

ng-prism keeps the UI state alive across full-page reloads, which helps a lot during component-driven development. Two layers cooperate:

- **URL** carries shareable state (component, service or pipe, variant, state, view, panel tab), so links are bookmarkable and deep-linkable.
- **sessionStorage** carries per-session ephemeral state (control panel input overrides, a11y sub-tab, perspective) and keeps it off the URL.

After editing a SCSS file in your library and waiting for the dev-server reload, you land back on the same component, same variant, with the same control overrides applied. No more clicking your way back to where you were.

## URL Parameters

| Parameter   | Example                        | Description                                                                                                                                                             |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component` | `?component=ButtonComponent`   | Active component class name                                                                                                                                             |
| `service`   | `?service=NotificationService` | Active [service](guide/showcasing-services.md) class name. Services have their own parameter, so a tool that sets `?component=` never lands on one                      |
| `pipe`      | `?pipe=TimeAgoPipe`            | Active [pipe](guide/showcasing-pipes.md) class name. Pipes have their own parameter as well, so neither `?component=` nor `?service=` lands on one                      |
| `page`      | `?page=Button%20Patterns`      | Active page title (URL-encoded)                                                                                                                                         |
| `variant`   | `?variant=1`                   | Active variant index (0-based)                                                                                                                                          |
| `state`     | `?state=1`                     | Active component-level state: the 0-based index into the component's `states`. Written only while a state is active; a value that is no index into `states` is ignored. |
| `view`      | `?view=overview`               | Active view tab (e.g. `overview`, `docs`, `a11y`)                                                                                                                       |
| `panel`     | `?panel=a11y`                  | Active addon panel tab (default: `controls`, omitted when default)                                                                                                      |
| `capture`   | `?capture=1`                   | Read-only input flag. Enables [capture isolation mode](guide/external-tooling.md#capture-isolation-mode) for screenshot tooling. Never written back to the URL.         |

Example URL:

```
http://localhost:4200?component=ButtonComponent&variant=2&view=docs&panel=a11y
```

A service page is addressed by `service` and a pipe page by `pipe`, with the view tab in `view`. The API tab of the JSDoc plugin has the id `jsdoc`:

```
http://localhost:4200?service=NotificationService&view=jsdoc
http://localhost:4200?pipe=TimeAgoPipe&view=jsdoc
```

`variant` and `state` mean nothing for a service or a pipe and are never written for one. When a URL carries more than one of `component`, `service`, `pipe` and `page`, the first in that order wins. A class name that is not a service or pipe in the manifest is ignored, like an unknown component.

## Deep-Linking

Share a URL pointing directly to a specific component and variant. Anyone opening the link lands on the same state.

```
http://localhost:4200?component=AlertComponent&variant=1
```

Add `state` to open the variant in one of the component's `states` (`@Showcase({ states })`):

```
http://localhost:4200?component=AlertComponent&variant=1&state=1
```

The state is part of the address next to the variant. It stays in the URL when you switch variants, and goes when you switch components.

## Browser Back/Forward

Selecting another component or page pushes a new browser history entry. Changing the variant, the state, the view or the panel tab rewrites the current entry instead, so stepping through variants does not fill the history. The browser back and forward buttons move between components and pages, and an entry holds the variant, state, view and panel its component was last left in.

## Control Panel & A11y State (sessionStorage)

URL state does not carry control panel overrides, since long input strings would bloat every link. Instead, ng-prism mirrors these to `sessionStorage` under the key `ng-prism:state`:

- Control input overrides, keyed by `className` + `variantIndex`. Each component keeps its own bucket; switching components does not discard the others.
- A11y panel `activeTab` (`violations` | `keyboard` | `tree` | `sr`) and `perspective` (`visual` | `screen-reader`).

Writes are debounced 200ms, so rapid keystrokes in a text input do not thrash storage. On reload, the persisted bucket is applied only if the persisted `variantIndex` still matches the active variant restored from the URL. That keeps stale overrides from leaking into a different variant.

> Layout, theme, and canvas (zoom/background) are persisted independently to `localStorage` by their own services (`ng-prism-layout`, `ng-prism-theme`, `ng-prism-canvas`) and survive across browser sessions.

## Opting Out

Disable each layer independently:

```typescript
export default defineConfig({
    urlState: false, // disables URL sync
    persistState: false // disables sessionStorage for controls + a11y
});
```

When `urlState` is `false`, the URL never changes and no state is read from it on load. When `persistState` is `false`, control overrides and the a11y sub-tab reset on every reload.

## How It Works

`PrismUrlStateService` reads the URL on startup via `window.location.search` and sets the initial navigation state. It then subscribes to navigation signal changes and calls `history.pushState()` (or `replaceState()` when only sub-state changes) to keep the URL in sync.

`PrismPersistenceService` reads `sessionStorage` after the URL service has selected the active component, then applies persisted control values that match the current `className` + `variantIndex`. It subscribes to the same signals and debounce-writes back on change. Schema-version, corrupted JSON, quota-exceeded, and missing-`sessionStorage` are all handled gracefully without crashing the app.

Both services are initialized automatically by `PrismShellComponent` in this order: `urlStateService.init()`, then `persistenceService.init()`. If you use a custom shell component (`appComponent`), call them manually during bootstrap:

```typescript
@Component({ ... })
export class MyShellComponent {
  constructor() {
    inject(PrismUrlStateService).init();
    inject(PrismPersistenceService).init();
  }
}
```
