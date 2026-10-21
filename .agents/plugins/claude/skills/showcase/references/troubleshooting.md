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
- **`<Class> declares invalid states <value>, expected a list of { name, pseudo }. Skipping.`**: write
  `states: [{ name: 'Hover', pseudo: { hover: '.btn' } }]`.
- **`<Class> states[<i>] is <value>, expected { name, pseudo }. Its column stays empty.`**,
  **`<Class> states[<i>] has no name, expected a non-empty string. Calling it "State <n>".`**,
  **`<Class> state "<name>" declares no pseudo states. Its column stays empty.`** and
  **`<Class> state "<name>" repeats the name of states[<i>]; only the first one is used. Its column stays empty.`**:
  every entry needs a unique `name` and a non-empty `pseudo`. An entry that is not an object, a repeated name and a
  missing, empty or unusable `pseudo` keep their position as an empty state, so the ones behind it keep their index;
  an empty state fits no variant (`forces no state`). An entry without a name is not one of them: it is called
  `State <n>` and works as a state if its `pseudo` is usable, but give it a name.
- **`<Class> declares states together with renderPage; a component page has no Overview to show them in. Skipping states.`**:
  use one or the other. A component that needs states renders itself, without `renderPage`.
- **`<Class> variant "<name>" declares invalid states <value>, expected false. Skipping.`**: the only value a variant's
  `states` takes is `false`, which keeps it out of the component's states.

- **`<Class> › setup — "<source>" (<file>:<line>:<col>) must be an arrow function returning an array literal, e.g. setup: () => [provideX]; setup was dropped.`**
  (a service): `setup` has to be an arrow function whose body is an array literal, or a block with that one `return`.
  `as const`, a spread, a condition, a call, a plain array and a constant that holds the list are all rejected. Write
  `setup: () => [provideX, X_TOKEN]` directly in the `@Showcase({ … })` object.
- **`<Class> › setup[<i>] — "<source>" (<file>:<line>:<col>) is neither a function nor an InjectionToken; it was dropped.`**:
  the entry is a class, a plain value or a call. List a function declaration, a `const` arrow or function, or a
  `const` of type `InjectionToken`, by name or as `ns.name`.
- **`<Class> › setup[<i>] — "<source>" (<file>:<line>:<col>) is not exported from any library entry point, so the styleguide cannot show where to import it from; it was dropped.`**:
  export the function or token from an entry point the `prism` target scans.
- **`<Class> › setup (<file>:<line>:<col>) only applies to services (@Injectable or @Service); it was dropped.`**:
  `setup` sits on a component or directive. Remove it, or check that the class has `@Injectable` or `@Service` from
  `@angular/core` under that name.

## Notices

Same prefix, but they don't count for `strictShowcase`.

- **`<Class> is an @Injectable/@Service with @Showcase and declares <fields>, so it is still treated as a component. From 23.0.0 it will be shown as a service and these fields will be dropped; remove them, or move the page to a componentPage.`**:
  the class has a field only a component can use (`variants`, `states`, `providers`, `bg`, `canvasLayout`, `host` or
  `renderPage`), so it stays a component until 23.0.0 (deprecated since 22.7.0, removed in 23.0.0). To make it a service now, remove the fields and move the demo to
  a component page; otherwise leave it, nothing is lost.
- **`ng-prism: <n> service(s) with @Showcase found, but no plugin shows services; add jsDocPlugin() to ng-prism.config.ts to list them.`**
  (no `⚠`, an info line of the normal log): no plugin has a panel that applies to services, so the build left every
  service out. Add `jsDocPlugin()` (skill setup).

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

## `screenshot.mjs --state` exits with 4

`<Class> variant <n> × state <m> is excluded: <reason>`: the styleguide rendered the variant, but the state doesn't fit
it, so nothing is forced and the script takes no screenshot. It is the answer for that combination, not a fault of the
script. The reason says why:

- **`states: false`**: the variant opts out of the component's `states`. Leave it, or remove `states: false` if the
  variant should take the state.
- **`forces no state`**: the state declares no pseudo-class to force. The scanner couldn't evaluate it; look for a
  `⚠ ng-prism:` line for that `states` entry.
- **`<target> matches nothing`**: nothing in the variant's rendered component matches the selector (`<target>` is the
  selector, a list joined with `, `, or `the component`). Check the selector against the variant's template, or pick a
  variant that renders it.
- **`<target> is disabled`** or **`<target> is inert`**: a `focus` or `focus-visible` state, and no match can take
  focus. A disabled or `[inert]` element can't be focused. For `the component`, every element in it that could take
  focus (a button, a field, a link, `[tabindex]`) is disabled or inert.
- **`<target> has pointer-events: none`**: a `hover` or `active` state, and every match ignores the pointer.

Exit `1` with `<Class> has no state <m> (it declares <n>).` means the index is out of range: states are 0-based, in the
order written in `@Showcase({ states })`.

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

## The service is missing from the sidebar

Look at the log first. `ng-prism: … service(s) with @Showcase found, but no plugin shows services; …` means the
config has no `jsDocPlugin()` (or another plugin with a panel that has `appliesTo: ['service']`): add it. Otherwise:

1. Is the log line `ng-prism: Generated manifest with N component(s), M service(s)` and M is lower than expected?
2. Is the class exported from an entry point the `prism` target scans?
3. Does it carry `@Injectable` or `@Service`, imported from `@angular/core` under that name? A decorator imported under
   another name, or a `@Service` from another DI library, makes no service.
4. Does it have `@Component` or `@Directive` too? Then it is a component. Does it declare `variants`, `renderPage` or
   another component-only field? Then it is still a component until 23.0.0 (deprecated since 22.7.0), with a notice in the log.
5. Is the `@Showcase` argument an object literal with a `title`, readable by the builder? Otherwise the service is
   skipped with a warning, like a component.

A service is addressed as `?service=<ClassName>`; `?component=` never selects one.

## A service page is missing something

- **A setup function or token is not listed:** look for a `⚠ ng-prism:` line naming `setup` or `setup[<i>]`.
- **A config table is missing:** the first parameter of the setup function has to be an interface, an object literal
  type or an object type alias (also in `Partial`, `Required` or `Readonly`). A class, an array, a primitive, or a token
  whose type argument is a class gets none.
- **A default shows `—`:** the option needs `@default <value>` in its JSDoc. Prose isn't read.
- **A type isn't a link:** it must be an interface, class, type alias or enum that a scanned entry point exports and
  that isn't `@internal`. A type imported under another name stays unlinked.
- **A property isn't listed:** `private`, `protected`, `#x`, `_x`, statics, `@internal` and constructor parameter
  properties (`constructor(public readonly x: T)`) aren't, and a lifecycle hook never is.
- **A panel of your own doesn't show on a service page:** it needs `appliesTo: ['service']` and `placement: 'view'`.

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
