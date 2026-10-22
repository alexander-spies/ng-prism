import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChildren } from '@angular/core';
import { nextRovingIndex, rovingTabStop } from './roving-focus.js';

export interface PrismSegmentOption<T extends string = string> {
    value: T;
    label: string;
    title?: string;
}

/**
 * A choice between a few values: the view switch (Playground / Overview / API),
 * zoom levels, fit modes. A radio group with a roving tabindex; the active
 * segment sits raised on the track with a line in the brand ink under it.
 */
@Component({
    selector: 'prism-segmented',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-segmented.component.html',
    styleUrl: './prism-segmented.component.css',
    host: { '[class.prism-segmented--sm]': "size() === 'sm'" }
})
export class PrismSegmentedComponent<T extends string = string> {
    readonly options = input.required<readonly PrismSegmentOption<T>[]>();
    readonly value = model<T | null>(null);
    readonly ariaLabel = input<string | null>(null);
    readonly size = input<'md' | 'sm'>('md');

    private readonly segments = viewChildren<ElementRef<HTMLButtonElement>>('segment');

    protected choose(option: PrismSegmentOption<T>): void {
        this.value.set(option.value);
    }

    protected onKey(event: KeyboardEvent): void {
        const options = this.options();
        const current = Math.max(
            0,
            this.segments().findIndex((s) => s.nativeElement === event.target)
        );
        const next = nextRovingIndex(current, event.key, options.length);

        if (next === null) return;
        event.preventDefault();
        this.value.set(options[next].value);
        this.segments()[next]?.nativeElement.focus();
    }

    /** The segment in the tab order: the chosen one, or the first when the value matches none. */
    protected isFocusable(index: number): boolean {
        return (
            index ===
            rovingTabStop(
                this.options().map((option) => option.value),
                this.value()
            )
        );
    }
}
