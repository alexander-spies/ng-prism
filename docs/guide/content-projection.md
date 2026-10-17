# Content Projection

Use the `content` field on a variant to project HTML into a component's `<ng-content>` slots. Each variant sets its own; there is no component-level default.

## Single Slot

Pass a plain string to project into the default (unnamed) slot:

```typescript
@Showcase({
    title: 'Button',
    variants: [
        { name: 'With Icon', content: '<svg viewBox="0 0 16 16">...</svg> Save' },
        { name: 'Text Only', content: 'Save' }
    ]
})
@Component({
    selector: 'lib-button',
    template: `<button><ng-content /></button>`
})
export class ButtonComponent {}
```

## Multi-Slot Content

Pass a `Record<string, string>` where each key is a CSS selector matching an `<ng-content select="...">` and the special key `'default'` targets the unnamed slot.

```typescript
@Showcase({
    title: 'Card',
    variants: [
        {
            name: 'Full',
            content: {
                '[card-header]': '<h3>Card Title</h3>',
                '[card-footer]': '<button>Action</button>',
                default: '<p>This is the card body content.</p>'
            }
        },
        {
            name: 'Header Only',
            content: {
                '[card-header]': '<h3>Card Title</h3>'
            }
        }
    ]
})
@Component({
    selector: 'lib-card',
    template: `
        <div class="card">
            <div class="card__header"><ng-content select="[card-header]" /></div>
            <div class="card__body"><ng-content /></div>
            <div class="card__footer"><ng-content select="[card-footer]" /></div>
        </div>
    `
})
export class CardComponent {}
```

## HTML Content

Content strings are treated as raw HTML and injected via the renderer. You can include any valid HTML markup:

```typescript
content: `
  <strong>Bold text</strong> and
  <em>italic text</em> in the same slot.
`;
```

## Limitations

Content strings are static HTML. Angular template syntax (`*ngIf`, `[(ngModel)]`, event bindings) does not work inside `content` strings for regular components, because they are not compiled as Angular templates.

For content that requires Angular components, bindings, or directives, use a [Component Page](guide/component-pages.md) instead and set `renderPage` on the `@Showcase` decorator.

## Directive Host Content

For directives, content is placed inside the host element rather than projected via `<ng-content>`. See [Directive Hosting](guide/directive-hosting.md) for details.
