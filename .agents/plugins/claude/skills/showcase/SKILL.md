---
name: showcase
description: Use when writing or changing an @Showcase decorator in an Angular library that uses @ng-prism/core (variants, inputs, content projection, directive hosts, states and pseudo states, canvas background and layout, status, component pages), when a build prints a "⚠ ng-prism:" warning, when a component is missing from the ng-prism styleguide or an input has no effect there, or when a showcase should be checked in the running styleguide with a screenshot. Also when someone asks for a "story" in a project that uses ng-prism instead of Storybook. Not for developing ng-prism itself.
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
   and keeps the rest. When the whole config can't be evaluated, the component is skipped. Constants imported from a
   compiled package (`.d.ts`) are readable only as plain literals. `defineConfig({ strictShowcase: true })` in
   `ng-prism.config.ts` turns every dropped value into a build error.
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
      needs a target that exists, and a focus target must not be `:disabled` or under `[inert]`, a hover or active
      target must take the pointer (not `pointer-events: none`). Otherwise nothing is forced and the cell is shown as
      not fitting, with the reason: `<target> matches nothing`, `<target> is disabled`, `<target> is inert`,
      `<target> has pointer-events: none`. That is intended, for example a remove-button state on a chip without that
      button, so don't widen the selector to make it fit. A state that fits no variant at all is usually a typo in its
      selector; the Overview warns about it in the browser console.
10. **Custom templates, mock data or several components together make a component page**: a
    `{ title, component, … }` entry in `componentPages`, the third argument of
    `providePrism(manifest, config, { componentPages })` in the styleguide app's `main.ts`, linked with
    `@Showcase({ renderPage: '<exact page title>' })`. The variant tabs and controls stay, but their values reach the
    page only if it injects `PrismRendererService` from `@ng-prism/core` and reads `inputValues()` and
    `activeVariantIndex()`.

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
   found. If the styleguide runs in a process you didn't start and you can't read its output, ask for the log or run
   `ng run <lib>:prism-build` once: it scans the same way and prints the same lines.
5. Check every variant you touched in the browser (next section) and look at each image.
6. Report the URL, the variant, what the screenshot shows and any warning that's left.
7. Stop the background process unless the user wants it running. Install nothing without asking.

## Checking in the browser

`scripts/screenshot.mjs` next to this file drives Playwright from the user's project. Run it from the project root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --variant 1
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --variant 1 --state 0
node "${CLAUDE_SKILL_DIR}/scripts/screenshot.mjs" --component ButtonComponent --shell
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
  the components and variants that do), the variant never rendered (it saves the full window for diagnosis), or the
  screenshot failed, e.g. for a component without a visible size (`--shell` still works). `2` invalid arguments. `3`
  Playwright or its Chromium is missing or won't start: suggest `npm i -D playwright && npx playwright install chromium`
  (on Linux with missing system libraries `npx playwright install --with-deps chromium`) and run it only if the user
  agrees. `4` the state doesn't fit the variant, see `--state` above and `references/troubleshooting.md`.

Without Playwright, use a browser tool if you have one (Playwright MCP, Chrome DevTools MCP, Claude in Chrome): open
`http://localhost:4400/?component=<ClassName>&variant=<index>&capture=1`, wait for
`.demo-wrap[data-prism-rendered="<ClassName>:<index>"]`, then take the screenshot. For a state add
`&state=<stateIndex>`, wait for `<ClassName>:<index>:<stateIndex>` and skip the screenshot when `.demo-wrap` has a
`data-prism-excluded` attribute (its value is the reason). Otherwise give the user that URL. This is ng-prism's public
External Tooling API; `window.__PRISM_MANIFEST__` lists every component, its variants and its states.

## Guides

- `guide/showcase-decorator.md`, `guide/variants.md`, `guide/content-projection.md`, `guide/directive-hosting.md`,
  `guide/component-pages.md`
- `api/showcase-config.md` (every field), `guide/external-tooling.md` (URL parameters, render marker, capture mode)
