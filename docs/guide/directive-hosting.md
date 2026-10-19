# Directive Hosting

Angular directives cannot render on their own; they must be applied to a host element or component. Use the `host` field on `@Showcase` to tell ng-prism what to render the directive on.

## Why `host` Is Needed

Unlike components, directives have no template. ng-prism needs an explicit host to create a meaningful canvas.

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

The directive's selector is applied to the element automatically. Inputs from the Controls panel and variant `inputs` are bound as attributes.

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

## Non-Bindable Inputs Are Auto-Skipped

Inputs whose type cannot be bound via attribute (for example `TemplateRef`, `ElementRef`, or any non-serializable type) are automatically skipped in the generated wrapper and the Controls panel.

## Aliased Inputs Break the Build

The generated wrapper binds every bindable input by its class member name. An input declared with an `alias` only accepts the alias, so the styleguide build fails with `NG8002: Can't bind to '<member>' since it isn't a known property of '<tag>'`, reported in `ng-prism-cache/<lib>-prism/prism-manifest.ts`. This is a known issue; until it is fixed, drop the alias or the `@Showcase` on that directive.

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
