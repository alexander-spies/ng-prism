---
name: prism-angular-component
description: Creates Angular standalone components for the ng-prism library or test fixtures. Triggers on "create component", "add component", "new component". Follows ng-prism conventions with @Showcase decorator support.
---

# Angular Component Creation — ng-prism

Create Angular standalone components for the ng-prism project.

> **Context:** ng-prism is a library, not an app. Components are either:
>
> 1. **Internal UI components** for the styleguide app (`src/app/`)
> 2. **Test fixture components** with `@Showcase` decorator (`__fixtures__/`)

## Component Template

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'prism-example',
    standalone: true,
    imports: [],
    templateUrl: './example.component.html',
    styleUrl: './example.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
    readonly title = input.required<string>();
    readonly disabled = input(false);
    readonly clicked = output<void>();
}
```

## Showcase-Annotated Component (Test Fixture / Demo)

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Example',
    category: 'Inputs',
    description: 'An example component',
    variants: [
        { name: 'Default', inputs: { label: 'Click me' } },
        { name: 'Disabled', inputs: { label: 'Disabled', disabled: true } }
    ],
    tags: ['form', 'action']
})
@Component({
    selector: 'my-example',
    standalone: true,
    template: `<button [disabled]="disabled()" (click)="clicked.emit()">{{ label() }}</button>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
    /** Button label text */
    readonly label = input('Button');

    /** Whether the button is disabled */
    readonly disabled = input(false);

    /** Click event */
    readonly clicked = output<void>();
}
```

> **Note:** Signals, not decorators — also for showcased components. The scanner
> reads `@Input()` metadata as well, but `component.scanner.ts` prints a warning
> for it: "uses @Input() decorators which are not fully supported. Migrate to
> input() signals for full ng-prism support." The fixtures under `__fixtures__/`
> that still carry decorators (e.g. `button.component.ts`, `card.component.ts`)
> exist to cover exactly that path; `signal-button.component.ts` covers the
> signal path. Do not take them as a template for new components.

## Conventions

- **Selector prefix:** `prism-` for internal UI components
- **Standalone:** Always `standalone: true` (explicit)
- **Change detection:** Always `ChangeDetectionStrategy.OnPush`
- **DI:** Use `inject()` function, not constructor injection
- **Signals:** Use `input()` / `output()` everywhere — internal components and
  showcased ones alike. `@Input()` / `@Output()` only in the fixtures that
  deliberately cover the legacy path, never in new code.
- **File location:**
    - Internal UI: feature folder under `packages/ng-prism/src/app/<feature>/`
      (e.g. `canvas/`, `panels/`, `sidebar/`, `shared/`) — there is no
      `src/app/components/` directory
    - Test fixtures: `packages/ng-prism/src/builder/scanner/__fixtures__/`
- **Imports:** `.js` extension on _relative_ import paths (ESM). Bare
  specifiers like `@angular/core` stay unchanged.

## Checklist

- [ ] `standalone: true` explicit
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Correct selector prefix (`prism-` internal, custom for fixtures)
- [ ] `.js` extensions on relative imports (ESM; bare specifiers stay as they are)
- [ ] JSDoc on each `input()` / `output()` member (the scanner extracts it)
