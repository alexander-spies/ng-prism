# Directive Hosting

Angular directives cannot render on their own; they must be applied to a host element or component. Without any configuration, ng-prism renders a directive on the element its selector names. Use the `host` field on `@Showcase` to choose another element or a component, or to show the directive inside other markup.

## Without a Host

A directive without `host` renders on the element its selector names, with the attributes and classes the selector asks for (since `22.7.0`):

| Selector                 | Renders as                        |
| ------------------------ | --------------------------------- |
| `input[libInput]`        | `<input libInput>`                |
| `button[libBtn].primary` | `<button libBtn class="primary">` |
| `[libTooltip]`           | `<div libTooltip>`                |

A selector without an element renders on a `div`. Of a selector list, such as `input[libInput], textarea[libInput]`, the first part counts when no `host` names the element.

> Up to 22.6.0 every directive without a `host` rendered on a `div`, and a selector that names an element, like `input[libInput]`, never matched: the generated wrapper wrote the whole selector as an attribute name.

## Why `host` Is Needed

A directive often needs more than its own element: a button to hover, a component to sit on, or a frame around it. `host` says what to render the directive on.

```typescript
@Showcase({
  title: 'Tooltip',
  host: '<button class="btn">Hover me</button>',
})
@Directive({ selector: '[appTooltip]' })
export class TooltipDirective { ... }
```

## String Host

The simplest form: provide an HTML element string. ng-prism wraps it as follows:

```html
<!-- generated host wrapper -->
<button class="btn" appTooltip [appTooltip]="variantValue">
    Hover me
    <!-- or variant content -->
</button>
```

The directive's selector is applied to the element automatically: for a selector list, the attributes of the first part whose element is the host's tag or none. Inputs from the Controls panel and variant `inputs` are bound as attributes.

The string has to be one element: `<tag>`, `<tag attrs>`, `<tag />` or `<tag>text</tag>`. Anything else falls back to a `<div>` with a warning. The text of `<tag>text</tag>` is the content of the host until a variant sets its own.

### Void Elements

The host may be a void element: `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track` or `wbr`. ng-prism renders it without content and without an end tag (since `22.7.0`):

```typescript
@Showcase({
    title: 'Mask',
    host: '<input type="text">',
    variants: [{ name: 'Phone', inputs: { libMask: '(000) 000-0000' } }]
})
@Directive({ selector: '[libMask]' })
export class MaskDirective { ... }
```

A void element takes no content, so `content` on such a variant cannot render. The build says so once per directive:

```
⚠ ng-prism: MaskDirective: <input> is a void element and takes no content, so the content of the host and of the variants is not rendered.
```

> Up to 22.6.0 the wrapper wrote `<input …>{{ … }}</input>`, which Angular rejects with `Void elements do not have end tags "input"`, and the styleguide build failed.

## Object Host: Angular Component

When the directive is designed to be applied to a specific Angular component, use the object form:

```typescript
@Showcase({
  title: 'Ripple',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Click me', variant: 'primary' },
  },
  variants: [
    { name: 'Default', inputs: {} },
    { name: 'Custom Color', inputs: { libRippleColor: '#6366f1' } },
  ],
})
@Directive({ selector: '[libRipple]' })
export class RippleDirective { ... }
```

| Field         | Description                                               |
| ------------- | --------------------------------------------------------- |
| `selector`    | The host component's element selector                     |
| `import.name` | The exported class name                                   |
| `import.from` | The npm package or path to import from                    |
| `inputs`      | Static inputs passed to the host component (not reactive) |

ng-prism generates a wrapper that looks like:

```html
<lib-button label="Click me" variant="primary" libRipple [libRippleColor]="variantValue" />
```

An object host needs `import`. Without it the build warns and renders the directive on a `<div>`: `<Class>: the host names no class to import (host.import), so it renders as <div>.`

## Host Template

`host: { template }` (since `22.7.0`) is an Angular template the subject renders in. ng-prism compiles it together with your classes, so a frame and the directive in it find each other through Angular, which neither a string nor an object host can do. It works for directives and for components, on the showcase and on a single variant. `Variant.host` replaces `ShowcaseConfig.host` for that variant:

```typescript
@Showcase<InputDirective>({
    title: 'Input',
    host: { template: '<lib-form-field label="Name"><input libInput type="text" /></lib-form-field>' },
    variants: [
        { name: 'Default' },
        { name: 'Required', inputs: { required: true } },
        {
            name: 'With hint',
            host: { template: '<lib-form-field label="Name" hint="As on your ID"><input libInput /></lib-form-field>' }
        }
    ]
})
@Directive({ selector: 'input[libInput], textarea[libInput]' })
export class InputDirective { ... }
```

The classes the template uses are imported the way they are for [compiled content](guide/content-projection.md#imports): library classes by what you wrote, everything else through [`imports`](api/showcase-config.md#imports). Expressions have no context beyond literals and template reference variables, and errors are reported with the file, the line and the variant, see [Errors](guide/content-projection.md#errors).

### Where the Subject Is

In a host template, the subject is the element that the selector of the subject matches. ng-prism matches the way Angular does, selector lists included, so you write `<input libInput>` as a user of your library would.

When several elements match, such as three `lib-radio` in a group, mark the one you mean with `prism-subject`. The others stay as static instances:

```typescript
@Showcase<RadioComponent>({
    title: 'Radio',
    host: {
        template: `
            <lib-radio-group name="size">
                <lib-radio value="s">Small</lib-radio>
                <lib-radio prism-subject value="m">Medium</lib-radio>
                <lib-radio value="l">Large</lib-radio>
            </lib-radio-group>`
    }
})
@Component({ selector: 'lib-radio' /* ... */ })
export class RadioComponent { ... }
```

The template writes `value` on the subject itself, which makes it the template's input, see [below](#what-the-template-sets-on-the-subject). `prism-subject` is removed from the compiled template and from the **Code** popover. No match, or several without a mark, is an error that leaves the variant to render as it did without a host template:

```
⚠ ng-prism: InputDirective › variants[2] "With hint" › host — the selector "input[libInput], textarea[libInput]" matches no element of the host template (src/lib/input.directive.ts:14:20)
⚠ ng-prism: RadioComponent › host — the selector "lib-radio" matches 3 elements of the host template; mark one with prism-subject (src/lib/radio.component.ts:9:9)
```

A mark on an element the selector does not match is an error for a component. For a directive, ng-prism adds the attributes the selector asks for to that element.

In the canvas, the Controls, the Events panel and the **Code** popover belong to the subject. The rest of the template is part of what renders: `states` and `pseudo` targets resolve against all of it, and `true` is every element of it. The `renderedElement` of `PrismRendererService` is the root of the whole template, and `subjectElement` is the subject, see [Runtime Services](api/services.md#prismrendererservice).

### What the Template Sets on the Subject

What the template writes on the subject element itself, a static attribute (`<input libInput required>`) or a binding (`[libDatepicker]="picker"`), belongs to the template. ng-prism does not bind that input in this variant, for two reasons: a template reference such as `picker` cannot come from `inputs`, and Angular would see two competing bindings. The control of that input shows `Not editable`, with the reason "Set by the template of this variant", and a value for it in `inputs` is dropped with a warning:

```typescript
@Showcase<DatepickerInputDirective>({
    title: 'Datepicker Input',
    host: {
        template: `
            <lib-form-field label="Date">
                <input [libDatepicker]="picker" />
                <lib-datepicker-toggle [for]="picker" />
                <lib-datepicker #picker />
            </lib-form-field>`
    }
})
```

```
⚠ ng-prism: DatepickerInputDirective › variants[0] "Open" › inputs.libDatepicker — set by the template on the subject; the variant value was dropped (src/lib/datepicker-input.directive.ts:18:60)
```

An attribute without a value that the selector of the subject names does not count. For a `TooltipDirective` with the selector `[libTooltip]`, `<lib-button libTooltip>` only puts the directive on the element, so the control for `libTooltip` stays editable.

### Content in a Host Template

- A variant `template` replaces what the subject holds in the host template.
- HTML `content` cannot go into an element inside a compiled view. On a component variant that renders in a host template it is dropped with a warning that points to `template`. A directive keeps its text `content` as before: it becomes the text of the subject element.

### A String or Object Host with a Template

A directive with a string or an object host can have a variant `template`. The template then renders inside the host element: a string host contributes its tag and attributes, an object host its selector with the static `inputs`, and its `import` joins the imports of the generated wrapper. Variants without a `template` render as before:

```typescript
@Showcase({
    title: 'Tooltip',
    host: '<button class="btn">',
    variants: [
        { name: 'Text', inputs: { libTooltip: 'Saves a draft' }, content: 'Save' },
        { name: 'With icon', inputs: { libTooltip: 'Saves a draft' }, template: '<lib-icon name="save" /> Save' }
    ]
})
@Directive({ selector: '[libTooltip]' })
export class TooltipDirective { ... }
```

`Text` renders `<button class="btn" libTooltip …>Save</button>`, as it always has. `With icon` renders the same button with the compiled `<lib-icon name="save" /> Save` inside.

### A String or Object Host on a Component

A string or object `host` has no effect on a component. It never had, and a component keeps rendering as it did. Since `22.7.0` the build warns about it, without failing a [`strictShowcase`](api/ng-prism-config.md#strictshowcase) build, and points to the host template, which does what a wrapper was probably meant to do:

```
⚠ ng-prism: DataFieldComponent › host — a string or object host has no effect on a component; use host: { template } to render it inside other markup. It was dropped. (src/lib/data-field.component.ts:6:11)
```

```typescript
// before: ignored
@Showcase({ title: 'Data Field', host: '<div style="width: 180px;">' })

// from 22.7.0: the wrapper is rendered
@Showcase({ title: 'Data Field', host: { template: '<div style="width: 180px;"><lib-data-field /></div>' } })
```

Switching to a host template changes what renders, so check the visual regression baselines of that component.

## Content in Directive Variants

For string hosts, the variant `content` becomes the inner HTML of the host element:

```typescript
@Showcase({
  title: 'Tooltip',
  host: '<span>',
  variants: [
    { name: 'Short', content: 'Hover' },
    { name: 'Long',  content: 'Hover over this longer text' },
  ],
})
```

For content that is made of components or directives, use a variant [`template`](guide/content-projection.md#compiled-content-template).

## Non-Bindable Inputs Are Auto-Skipped

Inputs whose type cannot be bound via attribute (for example `TemplateRef`, `ElementRef`, or any non-serializable type) are automatically skipped in the generated wrapper and the Controls panel.

## Aliased Inputs

The generated wrapper declares every bindable input and every output under its class member name and binds the directive's public name, so an input declared with `input('', { alias: 'libTooltip' })` is bound as `[libTooltip]` on the host element. Variants still use the member name.

> Up to 22.5.0 the wrapper bound the member name, and the styleguide build failed with `NG8002: Can't bind to '<member>' since it isn't a known property of '<tag>'`, reported in `ng-prism-cache/<lib>-prism/prism-manifest.ts`. On those versions, drop the alias or the `@Showcase` on that directive.

## Examples

### Simple attribute directive

```typescript
@Showcase({
    title: 'Highlight',
    host: '<p>Some text to highlight</p>',
    variants: [
        { name: 'Yellow', inputs: { appHighlight: '#fef08a' } },
        { name: 'Blue', inputs: { appHighlight: '#bfdbfe' } }
    ]
})
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
    appHighlight = input('#fef08a');
}
```

### Structural directive

```typescript
@Showcase({
    title: 'Permission Guard',
    host: '<div>Protected content</div>',
    variants: [
        { name: 'Allowed', inputs: { appPermission: 'admin' } },
        { name: 'Denied', inputs: { appPermission: 'guest' } }
    ]
})
@Directive({ selector: '[appPermission]' })
export class PermissionDirective {
    appPermission = input.required<string>();
}
```
