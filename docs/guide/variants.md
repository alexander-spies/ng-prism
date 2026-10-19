# Variants

Variants are named tabs displayed above the component canvas. Each variant defines a different combination of inputs, content, metadata and forced pseudo states. When every variant should also be shown hovered, pressed or focused, declare those once as [states](#states) instead of as variants of their own.

## Variant Interface

```typescript
interface Variant<T = unknown> {
    name: string;
    inputs?: Partial<InputsOf<T>>;
    content?: string | Record<string, string>;
    description?: string;
    meta?: Record<string, unknown>;
    bg?: 'dots' | 'plain' | 'light' | 'dark' | 'checker' | 'transparent';
    canvasLayout?: 'fit' | 'stretch';
    pseudo?: Partial<Record<'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within', true | string | readonly string[]>>;
    states?: false;
}
```

`T` is the component class. Supply it via `@Showcase<MyComponent>({...})` to type the `inputs` against the component's signal inputs. Without it, `inputs` accepts any `Record<string, unknown>`. See [Type-safe inputs](#type-safe-inputs) below.

## Defining Variants

```typescript
@Showcase({
  title: 'Alert',
  variants: [
    {
      name: 'Info',
      inputs: { message: 'Operation completed.', severity: 'info' },
      description: 'Used for neutral informational messages.',
    },
    {
      name: 'Error',
      inputs: { message: 'Something went wrong.', severity: 'error' },
      description: 'Draws immediate attention to failures.',
    },
  ],
})
```

When no variants are defined, a single unlabeled canvas is shown and all controls start at their default values.

Variant values are read from the source without running it, so a `let` variable or a function call is dropped with a warning. Constants and enum members work. See [What the scanner can read](guide/showcase-decorator.md#what-the-scanner-can-read).

## Type-safe inputs

Pass the component class as a type argument to `@Showcase` to get autocomplete and compile-time type-checking on every variant's `inputs`:

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  variants: [
    { name: 'Primary', inputs: { label: 'Save',  variant: 'primary' } },
    { name: 'Danger',  inputs: { label: 'Delete', variant: 'danger'  } },
  ],
})
@Component({ ... })
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  closed  = output<void>();
}
```

The compiler now enforces three things:

1. **Keys**: only declared signal inputs (`label`, `variant`) are accepted. A typo like `inputs: { lable: 'Save' }` fails to compile.
2. **Values**: each value must satisfy the input's declared type. `variant: 'tertiary'` would be rejected because the union does not include it.
3. **Output exclusion**: `output()` signals (e.g. `closed`) are not accepted as inputs.

For transform inputs (e.g. `input(false, { transform: booleanAttribute })`), the accepted type is the source type that the transform reads, not the parsed value, so you can write what you would in an Angular template.

Without the generic parameter, `inputs` falls back to `Record<string, unknown>` and behaves as before. The change is additive and opt-in; no existing call site needs to be updated.

See [`InputsOf<T>`](api/types.md#inputsof) for the type mapping rules.

An input declared with an `alias` (`size = input('md', { alias: 'buttonSize' })`) is still keyed by its member name, `inputs: { size: 'lg' }`; ng-prism binds it by the alias, and the code snippet shows `buttonSize="lg"`.

> Up to 22.5.0 an aliased input couldn't be set from a variant or the Controls panel, and on a directive it broke the styleguide build, see [Directive Hosting](guide/directive-hosting.md#aliased-inputs).

## Input Types and Controls

The TypeScript Compiler API extracts the type of each `input()` signal at build time and maps it to the appropriate control in the Controls panel:

| TypeScript type                            | Control                            |
| ------------------------------------------ | ---------------------------------- |
| `string`                                   | Text input                         |
| `number`                                   | Number input                       |
| `boolean`                                  | Checkbox                           |
| `'a' \| 'b' \| 'c'` (string literal union) | Select dropdown with those options |
| `object` / interface                       | JSON editor                        |
| Array                                      | JSON editor                        |
| Other / unknown                            | Text input (cast to string)        |

### Example

```typescript
@Component({ ... })
export class TagComponent {
  label    = input.required<string>();
  count    = input<number>(0);
  active   = input(false);
  size     = input<'sm' | 'md' | 'lg'>('md');
  style    = input<Record<string, string>>({});
}
```

The Controls panel renders:

- `label`: text input (required, no default)
- `count`: number input (default `0`)
- `active`: checkbox (default `false`)
- `size`: select with options `sm`, `md`, `lg` (default `md`)
- `style`: JSON editor (default `{}`)

## Default Values

Default values are read from the `input()` call:

```typescript
label = input('Click me'); // default: 'Click me'
variant = input<'primary'>('primary'); // default: 'primary'
```

When a variant does not specify a value for an input, the control falls back to the input's declared default. If no default exists and the input is not required, the value is `undefined` (omitted from the rendered snippet).

## Inherited Inputs

Inputs and outputs declared in a base class belong to the showcased component as well. Variants can set them, and the Controls panel lists them:

```typescript
@Directive()
export abstract class ListboxField<T> {
  options = input.required<T[]>();
  value = model<T | null>(null);
}

@Showcase<CountryPickerComponent>({
  title: 'Country picker',
  variants: [{ name: 'Countries', inputs: { options: ['de', 'jp'], value: 'de' } }],
})
@Component({ ... })
export class CountryPickerComponent extends ListboxField<string> {}
```

The component's own inputs come first, then those of each base class. An input the subclass redeclares replaces the one in its base class. The type parameter of a generic base class resolves to what the subclass passes, so `options` above is a `string[]` input. An input that does not use a type parameter keeps its declared type, alias names included.

Angular only inherits inputs and outputs from a base class with `@Directive()` or `@Component()`, and so does the scan. An undecorated base class compiles without an error, but its inputs are not inputs of the component, so they are left out.

When a subclass assigns an inherited input a value of its own (`override title = 'child'` for an `@Input() title = 'base'`), the input stays and its default becomes the subclass's value, since that is what the component starts out with. If that value cannot be read at build time, the input has no default.

Two kinds of base class are not read:

- A base class that only exists as a declaration has no `input()` call, required flag or default left to read. That is a base class from an npm package, which ships only its `.d.ts`, or one written with `declare`. The scan prints a warning naming the inputs it cannot see, by the names a template uses.
- A mixin (`extends withTracking(Base)`) ends the walk. Neither the mixin nor anything behind it contributes inputs.

## Explicit Keys Behavior

When you define `inputs` on a variant, only the keys you list are overridden. Other inputs keep their defaults or any value set via the Controls panel. They are not reset unless you navigate to a different variant.

```typescript
variants: [
  { name: 'Large', inputs: { size: 'lg' } },
  // 'label' keeps its default when this variant is selected
],
```

If you want a value to be explicitly absent for a specific variant (overriding a previous user change), set it to `undefined` in the variant inputs:

```typescript
variants: [
  { name: 'No Icon', inputs: { icon: undefined } },
],
```

## Per-Variant Content

Use `content` on a variant to project HTML into the component's `<ng-content>`:

```typescript
variants: [
  {
    name: 'With Icon',
    content: '<svg>...</svg> Save',
  },
  {
    name: 'Text Only',
    content: 'Save',
  },
],
```

For multi-slot content projection, use a record. See [Content Projection](guide/content-projection.md).

## Per-Variant Plugin Metadata

Plugins like Figma support variant-level metadata to link each variant to a different design node:

```typescript
variants: [
  {
    name: 'Primary',
    inputs: { variant: 'primary' },
    meta: { figma: 'https://www.figma.com/design/abc?node-id=1-1' },
  },
  {
    name: 'Danger',
    inputs: { variant: 'danger' },
    meta: { figma: 'https://www.figma.com/design/abc?node-id=1-2' },
  },
],
```

## Per-Variant Background

A variant can declare a recommended canvas background. When the user selects the variant, the canvas switches to that background automatically, overriding both `ShowcaseConfig.bg` and the user's global default. The override is transient: the user can change it from the **Canvas** group in the tools menu (opened from the sliders button on the floating canvas rail), but switching variants resets to the recommendation.

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'On light', inputs: { variant: 'primary' }, bg: 'light' },
    { name: 'On dark',  inputs: { variant: 'primary' }, bg: 'dark'  },
  ],
})
```

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`, `'transparent'`.

`'transparent'` draws the same checkerboard as `'checker'` while browsing. The canvas has no way to show the difference, because the difference is what a [capture](guide/visual-regression.md#capturing-transparency) does: `'transparent'` yields a screenshot with a real alpha channel, `'checker'` one on the themed surface. It is also what a variant resolves to when nothing declares a background.

`'checker'` is deprecated since 22.2.0 and removed in 23.0.0. It draws the same checkerboard as `'transparent'` while browsing, so the canvas cannot tell them apart. But it captures as `--prism-bg-surface`, a theme token, which makes a baseline recorded on it depend on the theme the runner's browser started in. Use `'transparent'` for the same look with a capture that keeps its alpha, or `'light'`/`'dark'` for an absolute colour. The build warns for every component and variant that still declares it. It stays in the tools menu's **Canvas** group until then, because that group marks the active and the recommended background, and a value missing from it is a value the UI cannot show.

The matching background's button in that group carries a tinted border, signalling which background is recommended for the active variant; the active background's button carries the filled state, and both can be the same button.

See [Showcase Decorator: bg](guide/showcase-decorator.md#bg) for the component-level fallback and the full override-reset behavior.

## Per-Variant Canvas Layout

A variant can override the wrapper layout used in the canvas. The default is `'fit'`: the wrapper shrinks to the component's intrinsic size and the canvas stage centers it via flexbox. Switch to `'stretch'` for variants where you need a real container width, e.g. a horizontal divider (no intrinsic width because it's just a `border-bottom`) or a "full width" button variant (`width: 100%` only resolves against a sized parent).

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'Default',    inputs: { variant: 'primary' } },
    { name: 'Full width', inputs: { variant: 'primary', fullWidth: true }, canvasLayout: 'stretch' },
  ],
})
```

```typescript
@Showcase({
  title: 'Divider',
  // Set at component level, since most variants need stretch.
  canvasLayout: 'stretch',
  variants: [
    { name: 'Horizontal', inputs: { orientation: 'horizontal' } },
    // Vertical dividers are intrinsic-sized, so opt back into 'fit'.
    { name: 'Vertical',   inputs: { orientation: 'vertical' }, canvasLayout: 'fit' },
  ],
})
```

In `'stretch'` mode `.demo-wrap` becomes `display: block; width: 100%; max-width: 800px`, giving children a real container width to size against. The variant-level value always wins over the component-level value.

See [Showcase Decorator: canvasLayout](guide/showcase-decorator.md#canvaslayout) for the component-level setting and the [`CanvasLayout`](api/types.md#canvaslayout) type for the wrapper styles applied in each mode.

## States

Hover, pressed and focus are conditions a component is in, not different components. Written as variants they multiply: `Hovered`, `Pressed` and `Focus visible` for the filled button, and the same three again for the outlined one. They also sit in the variant ribbon, so whoever plays with the controls there is looking at a button that stays hovered whatever they change.

`states` on the decorator declares them once, and a variant can be shown in each of them where it fits:

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  states: [
    { name: 'Hover', pseudo: { hover: '.btn' } },
    { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } },
    // The ring is an outline with an offset, drawn outside the button's box.
    { name: 'Focus visible', pseudo: { 'focus-visible': '.btn' } },
  ],
  variants: [
    { name: 'Filled', inputs: { variant: 'filled', label: 'Filled' } },
    { name: 'Outlined', inputs: { variant: 'outlined', label: 'Outlined' } },
    { name: 'Disabled', inputs: { variant: 'filled', label: 'Disabled', disabled: true } },
    { name: 'Full width', inputs: { variant: 'filled', label: 'Full width', fullWidth: true }, canvasLayout: 'stretch', states: false },
  ],
})
```

The ribbon still lists four variants. Each of them, `Full width` aside, is combined with hovered, pressed and focused, wherever the state fits (it does not fit every variant, see [When a state fits](#when-a-state-fits)):

- The [Overview](#overview-all-variants-at-once) shows variants against states as a matrix.
- The **State** group in the tools menu has a chip per state, to put it on the variant you are looking at, see [Showing a state while browsing](#showing-a-state-while-browsing).
- A screenshot runner addresses a combination with `?component=…&variant=…&state=…`, and `__PRISM_MANIFEST__` lists the states, see [States in a screenshot runner](#states-in-a-screenshot-runner).

### Declaring a state

A state has two fields:

- **`name`**: the column title in the Overview, the label of the chip in the tools menu and the name in a visual regression report. It has to be unique within the component.
- **`pseudo`**: the pseudo states the state forces, in the shape of [`Variant.pseudo`](#per-variant-pseudo-states): `hover`, `active`, `focus`, `focus-visible` and `focus-within`, each with `true`, a selector or a list of selectors. How the targets are resolved, how your own CSS draws the state and what cannot be forced are the same as there, see [Your CSS does the styling](#your-css-does-the-styling) and [Limits](#limits).

The position in the list identifies a state. The `state` URL parameter, the render marker, `__PRISM_MANIFEST__` and a visual regression report all use that index, so reordering the list moves them. Add new states at the end.

A variant with a `pseudo` of its own can be shown in a state as well. Both are forced then, and a pseudo-class both name is forced on the targets of both.

The scanner checks `states` the way it checks `pseudo`. An entry that is not an object, has no `name`, repeats the name of an earlier one or has no usable `pseudo` is reported as a warning, and `strictShowcase` turns that into a build error. A pseudo-class or target inside `pseudo` that cannot be used is dropped, and the rest of the entry stays. Three cases leave an empty state: an entry that is not an object, a name that repeats an earlier one (the first entry is used), and a `pseudo` that is missing or has nothing usable left. It keeps its position, forces nothing, fits no variant and shows as an empty column, so the states behind it keep their index. An entry without a `name` is not one of them: it is called `State 2` for the second entry and works as a state, as long as its `pseudo` is usable.

`states` needs the component itself to render. A component with [`renderPage`](guide/component-pages.md) has no Overview and renders a page that reads one global renderer state, so the scanner reports `states` there and drops it.

### When a state fits

A state does not suit every variant. `.sg-chip__remove` exists only while a chip is removable, the button of a disabled variant cannot take focus, and a card shows its hover style only when it is clickable. Forcing the state anyway would show a picture the browser could never produce, such as a focus ring on a disabled button. A state therefore fits a rendered variant only if every pseudo-class it forces has at least one target the browser could put into that state:

- A target has to exist: `true` is the host and everything inside it, a selector is matched against the host and everything inside it.
- **`focus` and `focus-visible`**: the target is not `:disabled` (what `<fieldset disabled>` passes on to its fields included) and does not sit under `[inert]` inside the component. An element with `aria-disabled="true"` still counts, because the browser can focus it.
- **`hover` and `active`**: the target, or something inside it, has a computed `pointer-events` other than `none`. A disabled button usually fails this, since components often set `pointer-events: none` on it. The styles are read with the variant's forced states and all of the state's own in place, so an action that takes the pointer only inside a hovered row counts when the variant or the state hovers that row, and a rule that sets `pointer-events: none` under its own `:hover` makes the state not fit, as the browser could not keep that element hovered either.
- **`focus-within`**: not filtered. Whether anything inside can take focus is not something the browser tells.

Only the targets that pass get the class. When no target of a pseudo-class does, the state does not fit and nothing is forced for it. The combination is never shown as the plain variant in its place: it is reported as not fitting, with one of these reasons. `<target>` is the selector the state forces for that pseudo-class (a list reads as its selectors joined with `, `), or `the component` for `true`:

| Reason                              | Why                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `<target> matches nothing`          | Nothing in the rendered component matches the selector                                       |
| `<target> is disabled`              | A `focus` or `focus-visible` state, and no match can take focus, a disabled one among them   |
| `<target> is inert`                 | A `focus` or `focus-visible` state, and no match can take focus, none being disabled         |
| `<target> has pointer-events: none` | A `hover` or `active` state, and every match, with everything inside it, ignores the pointer |
| `forces no state`                   | The state forces nothing, for example because the scanner dropped its `pseudo`               |
| `states: false`                     | The variant [opts out](#opting-a-variant-out)                                                |

A state with several pseudo-classes fits only if each of them does, and the reason names the first that does not, in the order `hover`, `active`, `focus`, `focus-visible`, `focus-within`.

The reason shows up where you look at the combination: an empty, dashed cell in the Overview, the tooltip of the chip in the tools menu and, for a runner, the `data-prism-excluded` attribute on `.demo-wrap`, see [A state that does not apply](guide/external-tooling.md#a-state-that-does-not-apply). The rule is checked again whenever the component's DOM changes, so switching the `removable` control of a chip on and off moves it between fitting and not fitting. A target that renders only later, behind `@defer` or after an HTTP call, is not there when the combination is first judged and reads as `matches nothing`.

The demo styleguide has an example of each:

| Component | State                                  | Fits                              | Does not fit                                                                                        |
| --------- | -------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Chip      | `Remove hovered` on `.sg-chip__remove` | `Removable`, `Selected Removable` | `Default`: `.sg-chip__remove matches nothing`                                                       |
| Card      | `Hover` on `.sg-card--clickable`       | `Clickable`                       | `Basic`: `.sg-card--clickable matches nothing`                                                      |
| Button    | `Hover` and `Focus visible` on `.btn`  | `Filled`, `Outlined`, `Text`      | `Disabled`: `Hover` reads `.btn has pointer-events: none`, `Focus visible` reads `.btn is disabled` |

A state that fits no variant at all is almost certainly a selector with a typo. The Overview warns once in the console (`[ng-prism] State "<name>" of <Class> fits no variant; check its selectors.`), and the header of its column says `fits 0 of <n>`. The scanner cannot catch this, because it does not render.

### Opting a variant out

`states: false` on a variant keeps it out of every combination with the component's states:

```typescript
{ name: 'Full width', inputs: { fullWidth: true }, canvasLayout: 'stretch', states: false },
```

The variant has a single cell in the Overview, spanning every column, and no state is forced on it. Its own `pseudo` still applies. A state requested for it anyway, with `?state=` or from the tools menu, stays selected but is not applied, and the combination reads `states: false`. `false` is the only valid value: anything else is reported and dropped.

### Showing a state while browsing

The **State** group in the tools menu (the sliders button on the floating canvas rail) starts with a row of chips, one per declared state, in declaration order. A chip carries the tinted border of a declared value. Pick one to show the variant you are looking at in that state, pick it again to turn it off. At most one is active, and the variant ribbon keeps listing variants only.

The active state is part of the address of what you see, next to the variant, not a browse toggle like a background override:

- It stays active when you pick another variant, so you can step through the variants in one state. It goes when you switch to another component.
- It is in the URL as `state`, see [State Preservation](guide/url-state.md), and it applies in capture mode.
- The Controls stay usable. Change an input while a state is on and you see the component with that input in that state.

A chip for a state that does not fit the shown variant has a dashed border, and its tooltip names the reason, for example `Hover does not fit this variant: .btn has pointer-events: none`. You can still pick it. It stays selected and forces nothing until the variant has a target for it, say after the `removable` control of a chip is switched on, and from then on it applies. The component head counts what is declared: `9 variants · 3 states`.

The row below the chips has the single toggles, `:hover` to `:focus-within`, see [Forcing a state while browsing](#forcing-a-state-while-browsing). The pseudo-classes of the active state count as declared there: they carry the tinted border and can be switched off one by one. Picking another state resets the toggles, as picking another variant does. The toggles are not subject to the fit rule.

### States in a screenshot runner

A runner drives to a combination with `state` next to `variant`, and waits for a render marker that ends in the state's index:

```
http://localhost:4200/?component=ButtonComponent&variant=1&state=2&capture=1
```

- `__PRISM_MANIFEST__` lists every component's `states` (`name`, `index` and `pseudo`) and marks a variant that opted out with `states: false`.
- `data-prism-rendered` reads `ButtonComponent:1:2` while a state is active. Without one it stays `ButtonComponent:1`, so a runner that knows nothing about states keeps working.
- A combination that does not fit still renders and still sets the marker. `.demo-wrap` also carries `data-prism-excluded` with the reason, and the runner reports the cell as `excluded` with that reason instead of taking a screenshot.
- Capture mode applies the state, and leaves room around the component for its focus ring, as it does for `pseudo`. An excluded combination gets no room, since nothing is forced there.

The loop that does this is in [A worked example](guide/visual-regression.md#a-worked-example), and the contract in [A state that does not apply](guide/external-tooling.md#a-state-that-does-not-apply). The [Visual Regression plugin](plugins/visual-regression.md) shows the results with one row per variant and state.

### States or `pseudo`

Both force pseudo states, and both stay:

- Use **`states`** for a condition that applies to many of the variants, and that you want to see next to them: hover, pressed, focus. You write it once, the Overview lines every variant up against it, the Playground can switch to it without losing the variant, and a runner gets every combination. The fit rule keeps it off variants it cannot apply to.
- Use **`pseudo` on a variant** for a picture that belongs to that variant alone: its own inputs plus a forced state, or a one-off mix of targets. The demo's Textarea has a `Focused` state, and its `Typing` variant, a filled textarea with a counter and focus, stays a variant with a `pseudo` of its own. `pseudo` has no fit rule. It forces the state on the elements you name, a disabled one included, the way it did before `states` existed. It is not deprecated.

## Per-Variant Pseudo States

Hover, active and focus states cannot be set through an input. Focusing an element by script does not hold either: only one element in the document can have focus, and the first click into the styleguide takes it away. `pseudo` forces these states for as long as the variant renders. It is the right tool for a picture that belongs to one variant; a state that applies to many variants is a [component state](#states).

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'Default' },
    { name: 'Hovered', pseudo: { hover: '.btn' } },
    { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } },
    { name: 'Focused', pseudo: { 'focus-visible': '.btn' } },
  ],
})
```

The keys are the states: `hover`, `active`, `focus`, `focus-visible` and `focus-within`. Each one takes a target:

- **`true`**: every element of the rendered component, the host included. Closest to what a pointer resting on the component does.
- **A selector, or a list of them**: only the matching elements, matched against the host element and everything inside it. Use it for the element the state belongs to, such as the inner `<button>` of a host component or a visually hidden `<input>` whose sibling draws the box.

```typescript
variants: [
  // A checkbox whose ring is drawn by `.checkbox__input:focus-visible + .checkbox__box::before`
  { name: 'Focused', pseudo: { 'focus-visible': '.checkbox__input' } },
  // Two states on two elements: the pill is hovered, its close button is focused
  { name: 'Hovered, close focused', inputs: { closeable: true }, pseudo: { hover: '.pill', 'focus-visible': '.pill__close' } },
  // Real focus on a field puts its container into :focus-within as well
  { name: 'Typing', pseudo: { focus: '.field__input', 'focus-within': '.field' } },
],
```

### Your CSS does the styling

Nothing has to be written twice. In every stylesheet rule whose selector uses one of the five pseudo-classes, the pseudo-class is widened to also match a class: `:focus-visible` becomes `:is(:focus-visible, .prism-pseudo--focus-visible)`. That class goes on the targeted elements, and the component's real focus styles apply to them the way the browser applies them on real focus:

- Sibling combinators (`input:focus-visible + .box::before`), pseudo-elements, `:has()`, `:is()`, `:where()` and `:not()` keep their meaning, and so do rules inside `@media`, `@supports`, `@layer` and `@container`, a `@media (forced-colors: active)` fallback included. A forced element counts as being in the state, so `:not(:hover)` stops matching it.
- Forced and real states combine. `.pill:hover .pill__close:focus-visible` applies when the close button is forced into `:focus-visible` and the pointer really rests on the pill, and the other way round.
- The cascade does not change. The rule stays where it is in the stylesheet, and `:is()` weighs what the pseudo-class weighed, so it wins and loses against the rules around it exactly as the real state would.
- A stylesheet is rewritten once, the first time a variant or a component state forces a state. Styles that arrive later, through a lazily rendered child component or a hot reload, are rewritten as they arrive.
- The classes come off when you switch to another variant, or when the state that forced them goes. Without them every widened selector matches exactly what it matched before, so the styleguide's own UI and every other variant render as before.

The selector is read token by token, so an escaped colon in a class name (`.md\:hover`, as Tailwind writes it) and an attribute value are left alone.

### Limits

- **A state after a pseudo-element stays real.** `::-webkit-scrollbar-thumb:hover` and `::part(label):hover` cannot be forced: `:is()` is not allowed in that position.
- **Real states are not switched off.** A forced variant still reacts to the pointer and the keyboard. Hovering the canvas adds real `:hover` on top, the same as it would on any other variant.
- **Cross-origin stylesheets cannot be read.** Their rules are not rewritten, and dev mode warns once per sheet. Serve them from the same origin, or with CORS and a `crossorigin` attribute.
- **Shadow DOM is not reached.** A component with `ViewEncapsulation.ShadowDom` keeps its styles and elements in a shadow root, which neither the rewrite nor the selectors look into.

The scanner reads `pseudo` from the source like any other variant value. An unknown state, a target that is neither `true` nor a selector, and an empty selector are reported as a warning and dropped; `strictShowcase` turns that into a build error. Whether a selector parses is up to the browser, which warns once when the variant renders.

### Forcing a state while browsing

Below the chips for the component's [states](#showing-a-state-while-browsing), the **State** group in the tools menu has one toggle per pseudo-class. It forces that state on whatever variant is shown, on the whole component. Several can be on at once. The states the variant declares carry a tinted border, like the recommended background in the **Canvas** group, and can be switched off there too. Like a background override, the toggle is transient: switching variants, states or components resets it, and capture mode ignores it.

### Under visual regression

A forced state is part of the variant, so a screenshot runner captures it without a change on its side: `data-prism-rendered` only appears once the states are in place. Focus rings are usually drawn outside the component's box, so capture mode leaves room around variants that force a state. See [Forced pseudo states](guide/visual-regression.md#forced-pseudo-states). A [component state](#states) is addressed with `state=`, see [States in a screenshot runner](#states-in-a-screenshot-runner).

## Overview: All Variants at Once

The component header carries a third view tab between `Playground` and `API`: **Overview**. It renders every variant of the active component at the same time, as a grid of cells, more of a contact sheet than a viewfinder. Use it to compare variants against each other instead of stepping through them one by one. A component with [states](#states) gets a matrix of variants against states instead, see [With states](#with-states).

The tab appears when the Overview would have at least two cells. Without `states` a cell is a variant, so that means two or more variants. It stays hidden for single-variant components (a one-cell grid says nothing the Playground does not say better) and for components using [`renderPage`](guide/component-pages.md). Those render a page that reads its values from a single shared renderer state, so every cell would show the same thing.

With `states`, every variant counts one cell for itself and one for each state, and a variant with `states: false` counts one. A single variant with one state is two cells, so it has the tab. A component without variants counts as one implicit `Default` variant.

Each cell renders its variant as declared:

- **Background**: a variant's own [`bg`](guide/showcase-decorator.md#bg) paints that cell, so an `On dark` variant sits on dark while its neighbours do not. Variants that declare nothing get the checkerboard, matching what external tooling is told the variant renders on.
- **Layout**: a variant with `canvasLayout: 'stretch'` takes a full row instead of a column, because it has no intrinsic width to compare against its neighbours. The matrix has its own columns, see below.
- **Pseudo states**: a variant's own [`pseudo`](#per-variant-pseudo-states) states are forced in its cell, and only there, so a `Hovered` cell sits next to its unhovered neighbours. The tools menu's **State** group does not reach the Overview.
- **Caption**: running number and variant name below the frame, e.g. `08 On dark`. The matrix names its rows instead.

The Overview is a stage, not a workbench: it has no controls, no density or zoom settings, and no addon panel. Control values you changed in the Playground do not leak into it. Every cell shows the variant as the decorator declares it.

Every cell opens in the Playground. Click it, or focus it and press Enter or Space, and the Playground shows exactly that combination: the variant and, in the matrix, the state. That holds for components without states as well.

### With states

The matrix has a row per variant and a column per state, Default first and then the states in the order they are declared:

- **Row header**: the variant name, with a note below it where there is something to say: the variant's own `bg` (`bg: dark`), or `states: false`.
- **Column header**: the state's name, what it forces (`hover + active → .btn`, with a group per target when the pseudo-classes name different ones: `hover → .pill; focus-visible → .pill__close`), and how many variants it fits (`fits 2 of 5`). The count is of the variants the state is combined with, so those with `states: false` are not in it. The Default column says `no state`.
- **Background and layout** belong to the row: a variant's `bg` paints every cell of its row, and a `stretch` variant fills its cells.
- **A cell that does not fit** is empty and dashed, with the reason in it, see [When a state fits](#when-a-state-fits).
- **A variant with `states: false`** has a single cell across all columns, because it is combined with none of them.

Each cell shows the variant with the state of its column forced, and only there, like a variant's own `pseudo`. Many states or a wide component make the matrix scroll horizontally. The header row and the variant column stay in view, and the columns have a minimum width instead of being squeezed.

Link straight to the Overview with `?view=overview`, see [State Preservation](guide/url-state.md).
