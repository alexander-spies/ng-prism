# ng-prism warnings: cause and fix

The builder prints these lines while it scans, with the prefix `⚠ ng-prism:` unless noted. `<Class>` is the component
class, `<where>` is `@Showcase` or a path into it such as `variants[2] "Disabled" › inputs.size`. Each distinct message
is printed once per run.

## Values the builder dropped

These count for `strictShowcase: true`, which ends the build with
`ng-prism: strictShowcase is enabled and N @Showcase value(s) were dropped; see the warnings above.`

- **`<Class> › <where> — "<source>" (<file>:<line>:<col>) cannot be evaluated statically and was dropped`**: an
  expression the builder can't read: a function call, a ternary, `??`, `&&`, the or-operator, a comparison. Write the
  value out, or move it into a `const` built from literals, enum members and arithmetic.
- **`… cannot be evaluated statically, so the component is skipped`**: the argument of `@Showcase(…)` as a whole isn't
  an object literal the builder can read, e.g. `@Showcase(makeConfig())`. Write the object literally.
- **`… is a runtime value (function, class or instance) and cannot be part of the static manifest; it was dropped`**: a
  function, class, `new …` or object method in the config. Remove it; behaviour that needs code belongs in a component
  page.
- The dropped-value lines can end with the reason a constant couldn't be read:
    - **`… is declared with let; only const declarations can be read`** (or `var`): make it `const`.
    - **`… is declared without a value, as in a .d.ts file or with declare`**: a `declare`d value, or a constant from a
      compiled package that isn't a plain literal there. Use a local `const` or the literal.
    - **`… refers back to itself`**: a circular constant. Break the cycle.
    - **`… is a function or class, which only exists at runtime`**: use a value, not a function or class.
- **`<Class> declares @Showcase providers (…), which are deprecated and will be removed in 23.0.0; …`**: move them to
  `defineConfig({ appProviders })` in `ng-prism.config.ts`, or use a component page.
- **`<Class> has @Showcase without a "title" field, skipping. …`**: add a `title`.
- **`<Class> declares invalid status "<value>", expected one of: stable, beta, wip, deprecated. Skipping.`**: use a
  listed value.
- **`<Class> declares invalid bg "<value>", expected one of: …. Skipping.`**, also per variant as
  `<Class> variant "<name>" declares invalid bg …`: use `dots`, `plain`, `light`, `dark` or `transparent`.
- **`<Class> declares invalid canvasLayout "<value>", …`**, also per variant: use `fit` or `stretch`.
- **`<Class> variant "<name>" declares invalid pseudo <json>, expected an object mapping pseudo states to true or selectors. Skipping.`**:
  write `pseudo: { hover: true }` or `pseudo: { hover: '.btn' }`.
- **`… declares unknown pseudo state "<state>", expected one of: hover, active, focus, focus-visible, focus-within. Skipping.`**:
  use a listed state.
- **`… declares pseudo state "<state>" with an empty selector. Skipping.`**, **`… with an empty selector list. Skipping.`**,
  **`… with <values> in its selector list, expected non-empty strings. …`** and
  **`… with invalid target <json>, expected true, a selector or a list of selectors. Skipping.`**: the target must be
  `true`, a selector or a list of selectors.

## Notices

Same prefix, but they don't count for `strictShowcase`.

- **`<Class> declares bg "checker", which is deprecated and will be removed in 23.0.0; use 'transparent' for the same look with a capture that keeps its alpha, or 'light'/'dark' for an absolute colour.`**
- **`<Class> uses @Input() decorators which are not fully supported. …`** or
  **`<Class> inherits @Input() decorators from <Base>, …`**: migrate the inputs to `input()` / `model()`.
- **`<Class> inherits <inputs> from <Base>, which only exists as a declaration (…); without its source these inputs cannot be read, …`**:
  the base class comes from a compiled package, so its inputs are missing from the manifest and variants can't set them.
- **`<Class> is exported by multiple entry points; keeping the first occurrence (importPath: …).`**: export the class
  from one entry point.
- **`entryPoint "<path>" resolves to no entry file: …`**: the `entryPoint` directory has no `ng-package.json` with an
  existing `lib.entryFile`, and no secondary entry points. Point `entryPoint` at the library's barrel file.
- **`source file not found for entry point <file>, skipping.`**: `lib.entryFile` in an `ng-package.json` points to a
  file that doesn't exist.
- **`failed to resolve exports for <file>: <message>`** (an error): the entry file doesn't compile; fix what the message
  names.
- **`[ng-prism] @Showcase host="<host>" could not be parsed and will fall back to <div>. Supported forms: …`** (prefix
  `[ng-prism]`): write the host as `<tag>`, `<tag attrs>`, `<tag />` or `<tag>text</tag>`, or as
  `{ selector, import: { name, from } }`.
- **`<config file> sets "<option>", which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.`**
  (for `ui`, `themeStylesheet`, `headless` or `appComponent`),
  **`plugin "<name>" sets wrapComponent, which is deprecated and will be removed in 23.0.0. …`**,
  **`plugin "<name>" sets position on panel "<id>", which is deprecated and will be removed in 23.0.0. …`** and
  **`perfPlugin() option "<option>" is deprecated and will be removed in 23.0.0. …`**: delete the option; nothing
  changes, since it never had an effect.
- **`ng-prism: plugin "<name>" failed in <hook> for …: <cause>`** (an error): a plugin's build hook threw. On the first
  build this stops `serve` and `prism-build`; on a rescan the previous manifest stays.

## In the browser console

- **`[ng-prism] Variant "<name>" references unknown input "<key>" on <Class>, ignoring.`** and
  **`[ng-prism] Unknown input "<key>" on <selector>, skipping. Remove it from @Showcase variants.`**: a key under
  `inputs` isn't an input of the component. Check the spelling, write the class member name (also for an input with
  an `alias`), and make sure the member is an `input()` or `model()`. Up to 22.5.0 an alias lands here too.
- **`NG0303: Can't set value of the '<member>' input on the '<Class>' component.`** (Angular, dev mode), up to 22.5.0:
  the member is an input with an `alias`, which a variant can't set there, by either name. Leave it out and tell the
  user.
- **`[ng-prism] Variant <index> of <Class> failed to render:`** followed by the error: the component threw while
  rendering that variant in the **Overview** tab, the only place that logs this line. The Overview catches the error per
  cell, so that cell stays empty and the others render. The error that follows says why, for example a missing
  `input.required()`. Fix the variant's `inputs`, or the component.
  The single-variant canvas (Playground, and `scripts/screenshot.mjs`) doesn't catch it: Angular logs `ERROR` followed
  by the error, the canvas shows nothing or a half-built component, and `.demo-wrap` never gets its
  `data-prism-rendered` marker. The script then exits `1` with "Variant never rendered" and lists the error under the
  browser console errors. The fix is the same.
- **`[ng-prism] "<selector>" in forced pseudo states is not a valid selector, skipping it.`**: fix the CSS selector
  in `pseudo`.
- **`[ng-prism] Could not force a pseudo state for "<selector>".`** and
  **`[ng-prism] Cannot force pseudo states in <stylesheet>: its rules are cross-origin and cannot be read. …`** (dev
  mode only): the browser rejected the rewritten selector, or the stylesheet comes from another origin. Serve it from
  the same origin, or with CORS and a `crossorigin` attribute.

## The component is missing from the sidebar

Check the log line `ng-prism: Generated manifest with N component(s)` first, then:

1. `0 component(s)` and the `entryPoint` of the `prism` target names the library directory? Up to 22.5.0 that finds
   nothing without secondary entry points. Point `entryPoint` (on `prism` and `prism-build`) at the barrel file, the
   `lib.entryFile` of the library's `ng-package.json`, e.g. `projects/<lib>/src/public-api.ts`.
2. Is the class exported by the entry point the `prism` target scans (its `entryPoint` option), directly or through
   `export *`?
3. Up to 22.5.0: does the library have secondary entry points (`ng-package.json` files without `dest`)? Then only those
   are scanned: export the component from one of them.
4. Is the decorator written `@Showcase({ … })`, imported under that name, with an argument? An aliased import or
   `@Showcase()` without an argument is skipped without a warning.
5. Did the log warn about a missing `title` or a config that "cannot be evaluated statically, so the component is
   skipped"?

## The styleguide build fails with NG8002

`NG8002: Can't bind to '<member>' since it isn't a known property of '<tag>'`, reported in
`ng-prism-cache/<lib>-prism/prism-manifest.ts`, up to 22.5.0: a directive with `@Showcase` declares an input with an
`alias`, and the generated host binds the member name, which the directive doesn't accept. There the only ways out are
to drop the alias or the `@Showcase`; ask the user which. Later versions bind the alias.

## An input has no effect

- The key isn't the member name: look for the browser console messages above.
- Up to 22.5.0: the input has an `alias`, which a variant can't set there.
- The value was dropped: look for a `⚠ ng-prism:` line that names `inputs.<key>`.
- The input is an `@Input()`: migrate it to `input()`.

## Projected content lands in the wrong slot

- **`[ng-prism] Variant content "<key>" matches no <ng-content> of <Class>, skipping it.`** (browser console): the key
  isn't the `select` of any `<ng-content>` in the template. Copy the selector exactly; `default` is the unnamed slot.
- Up to 22.5.0 an object `content` fills the slots by position, not by their `select`: `default` goes into the first
  slot of the template, the other keys into the following ones in the order written. A component whose template puts
  a named slot before the unnamed one shows the contents swapped there, and reordering the keys can't fix it. Leave
  the component's template as it is; use a component page or tell the user.
