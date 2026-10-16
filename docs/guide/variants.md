# Variants

Variants are named tabs displayed above the component canvas. Each variant defines a different combination of inputs, content, metadata and forced pseudo states.

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

## Per-Variant Pseudo States

Hover, active and focus states cannot be set through an input. Focusing an element by script does not hold either: only one element in the document can have focus, and the first click into the styleguide takes it away. `pseudo` forces these states for as long as the variant renders:

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
- A stylesheet is rewritten once, the first time a variant forces a state. Styles that arrive later, through a lazily rendered child component or a hot reload, are rewritten as they arrive.
- The classes come off when you switch to another variant. Without them every widened selector matches exactly what it matched before, so the styleguide's own UI and every other variant render as before.

The selector is read token by token, so an escaped colon in a class name (`.md\:hover`, as Tailwind writes it) and an attribute value are left alone.

### Limits

- **A state after a pseudo-element stays real.** `::-webkit-scrollbar-thumb:hover` and `::part(label):hover` cannot be forced: `:is()` is not allowed in that position.
- **Real states are not switched off.** A forced variant still reacts to the pointer and the keyboard. Hovering the canvas adds real `:hover` on top, the same as it would on any other variant.
- **Cross-origin stylesheets cannot be read.** Their rules are not rewritten, and dev mode warns once per sheet. Serve them from the same origin, or with CORS and a `crossorigin` attribute.
- **Shadow DOM is not reached.** A component with `ViewEncapsulation.ShadowDom` keeps its styles and elements in a shadow root, which neither the rewrite nor the selectors look into.

The scanner reads `pseudo` from the source like any other variant value. An unknown state, a target that is neither `true` nor a selector, and an empty selector are reported as a warning and dropped; `strictShowcase` turns that into a build error. Whether a selector parses is up to the browser, which warns once when the variant renders.

### Forcing a state while browsing

The **State** group in the tools menu (the sliders button on the floating canvas rail) forces a state on whatever variant is shown, on the whole component. Several can be on at once. The states the variant declares carry a tinted border, like the recommended background in the **Canvas** group, and can be switched off there too. Like a background override, the toggle is transient: switching variants or components resets it, and capture mode ignores it.

### Under visual regression

A forced state is part of the variant, so a screenshot runner captures it without a change on its side: `data-prism-rendered` only appears once the states are in place. Focus rings are usually drawn outside the component's box, so capture mode leaves room around variants that force a state. See [Forced pseudo states](guide/visual-regression.md#forced-pseudo-states).

## Overview: All Variants at Once

The component header carries a third view tab between `Playground` and `API`: **Overview**. It renders every variant of the active component at the same time, as a grid of cells, more of a contact sheet than a viewfinder. Use it to compare variants against each other instead of stepping through them one by one.

The tab appears when a component declares two or more variants. It stays hidden for single-variant components (a one-cell grid says nothing the Playground does not say better) and for components using [`renderPage`](guide/component-pages.md). Those render a page that reads its values from a single shared renderer state, so every cell would show the same thing.

Each cell renders its variant as declared:

- **Background**: a variant's own [`bg`](guide/showcase-decorator.md#bg) paints that cell, so an `On dark` variant sits on dark while its neighbours do not. Variants that declare nothing get the checkerboard, matching what external tooling is told the variant renders on.
- **Layout**: a variant with `canvasLayout: 'stretch'` takes a full row instead of a column, because it has no intrinsic width to compare against its neighbours.
- **Pseudo states**: a variant's own [`pseudo`](#per-variant-pseudo-states) states are forced in its cell, and only there, so a `Hovered` cell sits next to its unhovered neighbours. The tools menu's state toggle does not reach the Overview.
- **Caption**: running number and variant name below the frame, e.g. `08 On dark`.

The Overview is a stage, not a workbench: it has no controls, no density or zoom settings, and no addon panel. Control values you changed in the Playground do not leak into it. Every cell shows the variant as the decorator declares it.

Link straight to it with `?view=overview`, see [State Preservation](guide/url-state.md).
