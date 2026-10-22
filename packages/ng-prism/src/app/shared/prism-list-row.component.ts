import { booleanAttribute, ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

/**
 * A row in a panel list: badge, title and description, meta on the right.
 *
 * Selection is a tinted surface, never a coloured left edge. An interactive row
 * is a button for assistive technology and activates on Enter and Space, which
 * reach the host's click listeners.
 */
@Component({
    selector: 'prism-list-row',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="prism-list-row__badge"><ng-content select="[rowBadge]" /></span>
        <span class="prism-list-row__text">
            <span class="prism-list-row__title"><ng-content select="[rowTitle]" /></span>
            <span class="prism-list-row__description"><ng-content select="[rowDescription]" /></span>
        </span>
        <span class="prism-list-row__meta"><ng-content select="[rowMeta]" /></span>
    `,
    styleUrl: './prism-list-row.component.css',
    host: {
        '[class.prism-list-row--selected]': 'selected()',
        '[class.prism-list-row--interactive]': 'interactive()',
        '[attr.role]': "interactive() ? 'button' : null",
        '[attr.tabindex]': 'interactive() ? 0 : null',
        '[attr.aria-pressed]': 'interactive() ? selected() : null',
        '(keydown)': 'onKey($event)'
    }
})
export class PrismListRowComponent {
    readonly selected = input(false, { transform: booleanAttribute });
    readonly interactive = input(false, { transform: booleanAttribute });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    protected onKey(event: KeyboardEvent): void {
        if (!this.interactive() || event.target !== this.host.nativeElement) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.host.nativeElement.click();
    }
}
