---
name: showcase
description: Use when writing or changing an @Showcase decorator in an Angular library that uses @ng-prism/core (variants, inputs, content projection, directive hosts, states and pseudo states, canvas background and layout, status, component pages, services with @Injectable or @Service and pipes with @Pipe, with their setup), when a build prints a "⚠ ng-prism:" warning, when a component, service or pipe is missing from the ng-prism styleguide or an input has no effect there, or when a showcase should be checked in the running styleguide with a screenshot. Also when someone asks for a "story" in a project that uses ng-prism instead of Storybook. Not for developing ng-prism itself.
---

# Writing and checking @Showcase configs

ng-prism builds a styleguide from `@Showcase` decorators on the components of an Angular library. The builder reads
them with the TypeScript compiler at build time and never executes them. A showcase is data, not code, and most
mistakes come from forgetting that.

## The installed version decides

Read `version` in `node_modules/@ng-prism/core/package.json`. Where this skill and the installed package disagree, the
package is right:

- Field reference, with JSDoc on every field and `@deprecated` notes:
  `node_modules/@ng-prism/core/dist/decorator/showcase.types.d.ts`.
- A field this skill names that those typings don't have is newer than the installed version: don't use it, suggest an
  update at most.
- Guides: `https://ng-prism.github.io/ng-prism/`. The site serves its pages as raw Markdown you can fetch directly,
  e.g. `https://ng-prism.github.io/ng-prism/guide/variants.md`. The pages for this skill are listed at the end.

## Rules

1. **Only values the builder can evaluate statically.** It reads literals, `const` declarations (imported ones too),
   enum members, arithmetic and string concatenation on those, template literals with such placeholders, property
   access on constants (`SIZES.md`), and arrays and objects, spreads included. It drops function calls, ternaries,
   `??` and `&&`, `let` and `var`, `declare`d values, functions, classes and `new`, each with a `⚠ ng-prism:` warning,
   and keeps the rest. The one function that works is the `setup: () => [...]` of a service or pipe: the builder reads the array
   literal from the source and never calls it. When the whole config can't be evaluated, the component is skipped.
   Constants imported from a compiled package (`.d.ts`) are readable only as plain literals.
   `defineConfig({ strictShowcase: true })` in `ng-prism.config.ts` turns every dropped value into a build error.
2. **The component must be exported by the library's entry point.** The builder scans what the `entryPoint` of the
   library's `prism` target exports, `export *` included: every secondary entry point (an `ng-package.json` without
   `dest` below the library), then the primary one. Up to 22.5.0 the primary entry file is skipped when secondary entry
   points exist, and without them a library directory as `entryPoint` finds no component at all, without a warning:
   there, name the barrel file (e.g. `projects/<lib>/src/public-api.ts`).
3. **`title` is required.** Without it the component is skipped with a warning.
4. **Signal inputs.** `input()`, `input.required()` and `model()` work; `@Input()` is read only partly and warns. The
   keys under a variant's `inputs` are the class member names. Write `@Showcase<ButtonComponent>({ … })` to get the
   keys and their values type-checked. An input with an `alias` is keyed by its member name too. Up to 22.5.0 such an
   input can't be set from a variant, by either name, and on a directive it fails the styleguide build with `NG8002`:
   don't work around it in the component, tell the user.
5. **`@Showcase` goes above `@Component` / `@Directive`**, imported from `@ng-prism/core` under its own name. An alias
   (`import { Showcase as S }`) or a namespace call is not recognized.
6. **No `providers`.** `@Showcase({ providers })` is deprecated since 22.4.0, removed in 23.0.0, and the build drops
   it: the manifest is static and can't hold providers. Put them into `defineConfig({ appProviders })` in
   `ng-prism.config.ts`, or use a component page.
7. **Directives need a `host`**: an HTML string such as `host: '<button class="btn">Save</button>'` (forms: `<tag>`,
   `<tag attrs>`, `<tag />`, `<tag>text</tag>`; anything else falls back to a `<div>` with a warning), or
   `{ selector, import: { name, from }, inputs? }` to put the directive on another component.
8. **Projected content is set per variant.** `content: 'Save'` fills the default `<ng-content>`; an object fills named
   slots by their `select`, written exactly as in the template, with `default` for the unnamed one:
   `content: { '[card-header]': '<h3>Title</h3>', default: '<p>Body</p>' }`. There is no component-level `content`.
   Up to 22.5.0 an object fills the slots by position instead (`default` first, then the keys in the order written),
   so a named slot before the unnamed one gets swapped content there: don't change the component's template for it,
   use a component page or tell the user.
9. **States an input can't reach** (hover, active, focus, focus-visible, focus-within) are forced with `pseudo`: `true`
   for every element of the component, or a selector (or a list) for specific ones, e.g.
   `{ 'focus-visible': '.btn' }`. The component's own CSS draws the state. Where it goes depends on who shares it:
    - **A condition that applies to several variants goes into `states` on the component** (since 22.6.0):
      `states: [{ name: 'Hover', pseudo: { hover: '.btn' } }, { name: 'Focus visible', pseudo: { 'focus-visible': '.btn' } }]`.
      Every variant is then combined with each of them, where the state fits. The Overview becomes a variant × state matrix, the tools menu
      gets a chip per state and a screenshot can address each combination. Don't write `Hovered`, `Pressed` and
      `Focus visible` as variants of every variant. `name` is required and unique; the position in the list is the
      state's index (the `state` URL parameter, `--state`), so append new states at the end and don't reorder. A
      variant that must not take part says `states: false`. `states` is not possible together with `renderPage`.
    - **A picture that belongs to one variant stays `pseudo` on that variant**: its own inputs plus a forced state, or a
      one-off mix of targets, e.g. `{ name: 'Typing', inputs: { value: 'Hello' }, pseudo: { focus: '.field__input' } }`.
      `pseudo` forces exactly what it says, with no fit rule.
    - **A state fits a variant only where the browser could put the component in it.** Every pseudo-class of the state
      needs a target that exists, and a focus target must not be `:disabled` or under `[inert]` (for `true`: one of the
      component's focusable elements, if it has any), a hover or active target must take the pointer (not
      `pointer-events: none`). Otherwise nothing is forced and the cell is shown as not fitting, with the reason:
      `<target> matches nothing`, `<target> is disabled`, `<target> is inert`, `<target> has pointer-events: none`.
      That is intended, for example a remove-button state on a chip without that button, so don't widen the selector to
      make it fit. A state that fits no variant at all is usually a typo in its selector; the Overview warns about it in
      the browser console.
10. **Custom templates, mock data or several components together make a component page**: a
    `{ title, component, … }` entry in `componentPages`, the third argument of
    `providePrism(manifest, config, { componentPages })` in the styleguide app's `main.ts`, linked with
    `@Showcase({ renderPage: '<exact page title>' })`. The variant tabs and controls stay, but their values reach the
    page only if it injects `PrismRendererService` from `@ng-prism/core` and reads `inputValues()` and
    `activeVariantIndex()`.

11. **A service is showcased on its class and gets a page without a canvas.** `@Showcase` on a class with `@Injectable`
    or `@Service`, both imported from `@angular/core` under their own name and with no `@Component` or `@Directive`
    beside them, lists the class under **Services** in the sidebar. The page shows the public API read from the code,
    the types it reaches, the `setup` entries and a generated usage snippet. It needs an installed version whose
    `showcase.types.d.ts` has `setup`. See "Showcasing a service" below.
12. **A pipe is showcased on its class too, and gets the same kind of page.** `@Showcase` on a class with `@Pipe`
    imported from `@angular/core` under its own name, with no `@Component` or `@Directive` beside it (an `@Injectable`
    next to `@Pipe` is fine), lists the class under **Pipes**. The page shows the template name, whether it is pure,
    every signature of `transform()`, the `setup` entries, the types and a generated usage snippet. Only standalone
    pipes with a readable `name`. It needs the same installed version as a service (`showcase.types.d.ts` has
    `setup`): both came in one release. See "Showcasing a pipe" below.

Other fields: `description` (Markdown), `category`, `categoryOrder`, `componentOrder`, `section`, `tags`, `status`
(`stable`, `beta`, `wip`, `deprecated`), `bg` (`dots`, `plain`, `light`, `dark`, `transparent`; `checker` is
deprecated), `canvasLayout` (`fit`, `stretch`), `meta` (data for plugins, e.g. `meta: { figma: '<url>' }`). A variant
can set its own `description`, `bg`, `canvasLayout`, `meta` and `pseudo`.

## Example

```ts
import { Component, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export enum ButtonTone {
    Primary = 'primary',
    Danger = 'danger'
}

@Showcase<ButtonComponent>({
    title: 'Button',
    category: 'Actions',
    status: 'stable',
    variants: [
        { name: 'Primary', content: 'Save' },
        { name: 'Danger', inputs: { tone: ButtonTone.Danger }, content: 'Delete' },
        { name: 'Disabled', inputs: { disabled: true }, content: 'Save' }
    ],
    // Combined with every variant. `Focus visible` is not forced on `Disabled`, whose button can't take focus:
    // that cell shows as not fitting. A variant that wants no states says `states: false`.
    states: [
        { name: 'Hover', pseudo: { hover: 'button' } },
        { name: 'Focus visible', pseudo: { 'focus-visible': 'button' } }
    ]
})
@Component({
    selector: 'lib-button',
    templateUrl: './button.component.html'
})
export class ButtonComponent {
    readonly tone = input(ButtonTone.Primary);
    readonly disabled = input(false);
}
```

## Showcasing a service

````ts
import { computed, Injectable, signal } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { NotificationOptions } from './notification.model';
import { NotificationRef } from './notification-ref';
import { provideNotifications } from './provide-notifications';

/**
 * Shows short messages in an overlay at the edge of the viewport, stacked newest first.
 *
 * @since 1.4.0
 * @example
 * ```ts
 * private readonly notifications = inject(NotificationService);
 * ```
 */
@Showcase({
    title: 'Notification Service',
    category: 'Feedback',
    setup: () => [provideNotifications]
})
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly open = signal<readonly NotificationRef[]>([]);

    /** How many notifications are open right now. */
    readonly count = computed(() => this.open().length);

    /**
     * Opens a notification. It closes by itself after its duration.
     * @param options What the notification shows and how long it stays.
     * @returns A handle to close this notification early.
     */
    show(options: NotificationOptions): NotificationRef {
        /* … */
    }
}
````

```ts
/** App-wide defaults, set once with `provideNotifications()`. */
export interface NotificationConfig {
    /**
     * Where the notifications stack.
     * @default 'bottom-right'
     */
    position?: NotificationPosition;
}
```

- **The JSDoc plugin draws the page.** Without `jsDocPlugin()` in `ng-prism.config.ts` (skill setup) the build drops all
  services from the manifest and logs, once, through the normal log and not as a warning:
  `ng-prism: <n> service(s) with @Showcase found, but no plugin shows services; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.`
  Add the plugin, or update `@ng-prism/plugin-jsdoc` to 22.7.0 or newer if it is already there; don't touch the
  services. `strictShowcase` doesn't fail over this hint.
- **Fields.** A service takes `title` (required), `description`, `category`, `categoryOrder`, `componentOrder`,
  `section` (default `Services`), `sectionOrder`, `tags`, `status`, `meta` and `setup`. `variants`, `states`,
  `providers`, `bg`, `canvasLayout`, `host` and `renderPage` need a canvas. **Until 23.0.0 one of them keeps an
  `@Injectable` class a component** (deprecated since 22.7.0, removed in 23.0.0), with a notice that does not count for `strictShowcase`:
  `<Class> is an @Injectable/@Service with @Showcase and declares <fields>, so it is still treated as a component. From 23.0.0 it will be shown as a service and these fields will be dropped; remove them, or move the page to a componentPage.`
  To make it a service, remove those fields and move the demo to a component page.
- **`setup` lists what configures the service**: provider functions and `InjectionToken` constants, e.g.
  `setup: () => [provideNotifications, NOTIFICATION_CONFIG]`. It is an arrow function on purpose: a direct list would
  read a `const` of a file that imports the service back, and `@Showcase(...)` runs when the class is defined (a
  `ReferenceError` in any library build that isn't stripped). The builder never calls it; it reads the array literal.
  So: an arrow function whose body is an array literal (or a block with one `return`), written in the `@Showcase({ … })`
  object itself, not behind a spread or a constant, without `as const`, a spread, a condition or a call. Each entry is
  a function declaration, a `const` arrow or function, or a `const` of type `InjectionToken`, exported from a scanned
  entry point. Anything else is dropped with a warning that counts for `strictShowcase`, and `setup` on a component
  or directive too.
- **The page is the code plus the JSDoc.** Every public property, getter and method is listed with its type, JSDoc or
  not (a component's API tab skips undocumented methods; a service page doesn't), and so is every constructor
  parameter property (`constructor(readonly id: number)`), described by the constructor's `@param`. Left out:
  `private`, `protected`, `#x`, `_x`, lifecycle hooks, the constructor itself, statics and `@internal`. Write JSDoc
  for what the types can't say: the class description (Markdown), `@since`, `@deprecated`, `@example` (a fenced
  block), `@param name text` on methods and setup functions (shown under each parameter), `@see` (a chip on the class
  and on type cards) and `@default` on each option of a config interface. A `@returns` text isn't shown: the return
  type comes from the code. The default column is filled from `@default` only: prose such as "Defaults to
  `'bottom-right'`." is not read. An override without a doc block takes the one of its base class.
- **Types get a card and a link** when a scanned entry point exports them and they aren't `@internal`. Export the
  config interface, the handle class and the union alias from the entry point, or they stay plain text.
- **Provision is read from the decorator**: `@Service()` and `providedIn: 'root' | 'platform' | 'any'` are automatic,
  `@Injectable()`, `autoProvided: false` and anything it can't read are by hand (no warning). The usage snippet adds
  `providers: [X]` for a by-hand service without `setup` only.
- **Not recognised as a service:** a `@Service` from another DI library, a decorator imported under another name, a
  class that isn't exported from an entry point, and a class that also has `@Pipe` (that is a pipe).
- **Known limits, don't work around them:** a `@returns` text isn't shown; a type imported or re-exported under
  another name appears under its declared name and may stay unlinked; a setup function or token exported under another
  name (`export { impl as provideToast }`) gets its declared name in the usage snippet's import; a token whose type
  argument is a class gets no option table; overloads show once, and generics and statics aren't listed; a panel of
  your own with `appliesTo: ['service']` needs `placement: 'view'`, since a service page has no addon area. The
  extracted API is experimental until 23.0.0.

## Showcasing a pipe

````ts
import { inject, Pipe, PipeTransform } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { provideTimeAgo, TIME_AGO_OPTIONS } from './provide-time-ago';
import { TimeAgoOptions } from './time-ago.model';

/**
 * Writes a point in time relative to now: `3 hours ago`, or `in 2 days` for a time ahead.
 *
 * @since 1.5.0
 * @example
 * ```html
 * <span>{{ comment.createdAt | timeAgo: { style: 'short' } }}</span>
 * ```
 */
@Showcase({
    title: 'Time Ago',
    category: 'Formatting',
    setup: () => [provideTimeAgo]
})
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
    private readonly defaults = inject(TIME_AGO_OPTIONS, { optional: true });

    /**
     * Writes the time relative to now, in the app-wide style.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     */
    transform(value: Date | number | string): string;
    /**
     * Writes the time relative to now, in the style given for this call.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     * @param options Overrides the app-wide options for this call.
     */
    transform(value: Date | number | string, options: Partial<TimeAgoOptions>): string;
    transform(value: Date | number | string, options: Partial<TimeAgoOptions> = {}): string {
        /* … */
    }
}
````

A pipe works like a service, so the rules of "Showcasing a service" apply: the same `setup`, the same JSDoc tags, the
same type cards and the same page without a canvas. What differs:

- **The JSDoc plugin draws the page.** Without `jsDocPlugin()` in `ng-prism.config.ts` the build drops all pipes from
  the manifest and logs, once, through the normal log and not as a warning:
  `ng-prism: <n> pipe(s) with @Showcase found, but no plugin shows pipes; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.`
  Add the plugin, or update `@ng-prism/plugin-jsdoc` to 22.7.0 or newer if it is already there; don't touch the
  pipes. `strictShowcase` doesn't fail over this hint.
- **Standalone and a readable name, or the pipe is dropped.** The name comes from `@Pipe({ name })`, a string
  literal or a `const`. Both cases are warnings that count for `strictShowcase`:
  `<Class> › @Pipe name (<file>:<line>:<col>) cannot be evaluated statically, so the pipe was dropped.` and
  `<Class> › @Pipe (<file>:<line>:<col>) is declared with standalone: false; ng-prism shows standalone pipes only, so it was dropped.`
  For the second, make the pipe standalone: the usage snippet puts it into a component's `imports`, which an NgModule
  pipe can't be. `pure` defaults to `true`; one the builder can't read only removes the Pure / Impure chip.
- **Fields.** The same as for a service, with `section` defaulting to `Pipes`. `variants`, `states`, `providers`,
  `bg`, `canvasLayout`, `host` and `renderPage` need a canvas, and **until 23.0.0 one of them keeps a `@Pipe` class a
  component** (deprecated since 22.7.0, removed in 23.0.0), with a notice that does not count for `strictShowcase`:
  `<Class> is a @Pipe with @Showcase and declares <fields>, so it is still treated as a component. From 23.0.0 it will be shown as a pipe and these fields will be dropped; remove them, or move the page to a componentPage.`
  For a pipe with `standalone: false` the notice ends differently, because such a pipe is gone in 23.0.0:
  `… From 23.0.0 it will be dropped, because ng-prism shows standalone pipes only; make the pipe standalone and remove the fields, or move the page to a componentPage.`
  This rule comes before the two warnings above: a NgModule pipe or a pipe with an unreadable name that has
  `renderPage` keeps its page in 22.x. To make it a pipe, remove those fields and move the demo to a component page.
- **The page is `transform()`.** Every overload signature gets its own row, with its parameters, `@param` texts and
  return type, and the implementation signature is left out when there are overloads. No other member of the class is
  listed. An overload without a doc block takes the implementation's, then the first documented overload's (only its
  description and `@param` texts, not its tags, so `@deprecated` stays on the overload it is written on), then the
  one of the nearest base class that has one, so documenting the implementation or the first overload is enough. A
  pipe without a `transform()` of its own takes it from its base class, `class LocalDatePipe extends DatePipe {}`
  from `@angular/common` included. Without type annotations the page shows the types the compiler infers.
- **The usage snippet** has the imports, the `providers` entries of `setup`, the component's `imports` entry and a
  template line from the first signature: each required parameter after the value becomes `: name`, up to the last
  required one (`{{ value | sgDate: pattern }}`); optional and rest parameters after that are left out.
- **A panel of your own** with `appliesTo: ['pipe']` needs `placement: 'view'`, like one for services. The extracted
  API (`PipeApi`) is experimental until 23.0.0.

## Workflow

1. Read the component: its `input()` / `model()` members and their types, its `<ng-content>` slots, whether it is a
   directive.
2. Write the showcase: one variant per combination of inputs worth seeing, named for what it shows. A hover, pressed or
   focus condition is a `states` entry, not another variant. Variant and state indexes are 0-based, in this order.
3. Run the styleguide as a background process: `ng run <lib>:prism` (Nx: `npx nx run <lib>:prism`). It is ready when
   `http://localhost:4400/` answers (the target's `port` option may say otherwise) and rescans on every change.
4. Read the build log. Each `⚠ ng-prism:` line is a dropped value or a deprecated option;
   `references/troubleshooting.md` has the cause and the fix for each. The line
   `ng-prism: Generated manifest with N component(s)` (or `Verified (unchanged)`) tells you whether the component was
   found. A service shows as `with N component(s), M service(s)` and a pipe as `, K pipe(s)`; when that part is missing and
   the "no plugin shows services" or "no plugin shows pipes" hint is in the log, they were left out. If the styleguide runs in a process you didn't start and
   you can't read its output, ask for the log or run `ng run <lib>:prism-build` once: it scans the same way and prints
   the same lines.
5. Check every variant you touched in the browser (next section) and look at each image. For a service or a pipe,
   capture its API page with `--service` or `--pipe` and check that its JSDoc reads cleanly there.
6. Report the URL, the variant, service or pipe, what the screenshot shows and any warning that's left.
7. Stop the background process unless the user wants it running. Install nothing without asking.

## Checking in the browser

`scripts/screenshot.mjs` next to this file drives Playwright from the user's project. Run it from the project root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --variant 1
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --variant 1 --state 0
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --shell
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --service NotificationService
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --pipe TimeAgoPipe
```

- By default it opens the variant in capture mode (`?capture=1`: the component alone on its background, motion
  frozen) and screenshots `.demo-wrap`. `--shell` takes the whole window, styleguide UI included.
- A variant without `bg`, or with `bg: 'transparent'`, comes back with a transparent background (a PNG with alpha).
  Viewers show transparent pixels differently; if a light or dark component is hard to judge, look at `--shell` too.
- `--state <index>` captures the variant in one of the component's `states` (`@Showcase({ states })`; 0-based, in
  source order, listed in `window.__PRISM_MANIFEST__`). Without it no state is active. A state doesn't fit every
  variant, for example one with `states: false`, or one whose target the variant doesn't render. The script then prints
  `<Class> variant <n> × state <m> is excluded: <reason>`, takes no screenshot and exits `4`. That is a result, not a
  failure: report the cell as excluded, with the reason.
- `--url` (default `http://localhost:4400`, https with a self-signed certificate works), `--out <file.png>` (default:
  the system temp dir, `prism-<Class>-<variant>.png`, with `-s<state>` after the variant for a state),
  `--timeout <ms>` (default 30000).
- It prints the URL and the PNG path and lists browser console errors. Open the PNG and look at it.
- It selects the variant and the state through URL parameters, like the URL below, and `urlState: false` in
  `ng-prism.config.ts` turns them off. The script then times out with "Variant never rendered"; ask before switching `urlState` back on.
- Exit codes: `0` saved. `1` the styleguide doesn't answer, the component, variant or state doesn't exist (it lists
  the components and variants that do), the variant or the service or pipe page never rendered (it saves the full window for diagnosis), or the
  screenshot failed, e.g. for a component without a visible size (`--shell` still works). `2` invalid arguments. `3`
  Playwright or its Chromium is missing or won't start: suggest `npm i -D playwright && npx playwright install chromium`
  (on Linux with missing system libraries `npx playwright install --with-deps chromium`) and run it only if the user
  agrees. `4` the state doesn't fit the variant, see `--state` above and `references/troubleshooting.md`.

A service has no canvas: its page shows nothing but what its JSDoc says, rendered by `jsDocPlugin()` in the API tab.
`--service <ClassName>` captures that page at its full length, without the sidebar and header, so you can check that
the JSDoc you wrote comes out clean: the description and its Markdown, the usage snippet, the setup table with its
defaults, the members with their `@param` texts, and the type cards with their links. It opens
`?service=<ClassName>&view=jsdoc` and waits for `[data-prism-service-rendered="<ClassName>"]` and the highlighted
code blocks. It can't be combined with `--component`, `--variant`, `--state` or `--shell` (exit `2`), and the PNG goes
to `prism-service-<Class>.png` in the system temp dir unless `--out` says otherwise. Services aren't listed in
`window.__PRISM_MANIFEST__`, so a wrong class name, a service the build left out (no `jsDocPlugin()` 22.7.0 or newer,
see "Showcasing a service") and `urlState: false` all look the same: the page never renders, the script saves the
full window for diagnosis and exits `1`. Check the build log line `with N component(s), M service(s)` first. A page
taller than 15000 px is cut there.

`--pipe <ClassName>` does the same for a pipe: it opens `?pipe=<ClassName>&view=jsdoc`, waits for
`[data-prism-pipe-rendered="<ClassName>"]` and the highlighted code blocks, and captures the page at its full length,
where you check the description, the usage snippet with its template line, the setup table and every `transform()`
row with its overloads, parameters and `@param` texts. It can't be combined with `--service`, `--component`,
`--variant`, `--state` or `--shell` (exit `2`), and the PNG goes to `prism-pipe-<Class>.png`. Pipes aren't listed in
`window.__PRISM_MANIFEST__` either: a wrong class name, an NgModule pipe, a pipe the build left out (no
`jsDocPlugin()` 22.7.0 or newer, see "Showcasing a pipe") and `urlState: false` all end in the page never rendering
and exit `1`. The build log line says `, K pipe(s)` when the pipe was kept.

Without Playwright, use a browser tool if you have one (Playwright MCP, Chrome DevTools MCP, Claude in Chrome): open
`http://localhost:4400/?component=<ClassName>&variant=<index>&capture=1`, wait for
`.demo-wrap[data-prism-rendered="<ClassName>:<index>"]`, then take the screenshot. For a state add
`&state=<stateIndex>`, wait for `<ClassName>:<index>:<stateIndex>` and skip the screenshot when `.demo-wrap` has a
`data-prism-excluded` attribute (its value is the reason). For a service open
`http://localhost:4400/?service=<ClassName>&view=jsdoc` and wait for `[data-prism-service-rendered="<ClassName>"]`; for
a pipe open `?pipe=<ClassName>&view=jsdoc` and wait for `[data-prism-pipe-rendered="<ClassName>"]`.
Otherwise give the user that URL. This is ng-prism's public External Tooling API; `window.__PRISM_MANIFEST__` lists
every component, its variants and its states, but no services or pipes.

## Guides

- `guide/showcase-decorator.md`, `guide/variants.md`, `guide/content-projection.md`, `guide/directive-hosting.md`,
  `guide/component-pages.md`, `guide/showcasing-services.md` (services and `setup`), `guide/showcasing-pipes.md`,
  `plugins/jsdoc.md`
- `api/showcase-config.md` (every field), `guide/external-tooling.md` (URL parameters, render marker, capture mode)
