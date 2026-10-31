import { ChangeDetectionStrategy, Component, computed, DOCUMENT, type ElementRef, inject, input, viewChild, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { LIB_RADIO_GROUP } from './radio.tokens.js';

/**
 * One option of a `lib-radio-group`: a native radio with its content as the label.
 *
 * The radio takes its name and its checked state from the group it sits in and selects its `value` there when it is
 * picked. Outside a group it is a plain radio without a name.
 *
 * @since 1.6.0
 * @see RadioGroupComponent
 * @example
 * ```html
 * <lib-radio-group name="size" [(value)]="size">
 *   <lib-radio value="s">Small</lib-radio>
 *   <lib-radio value="m">Medium</lib-radio>
 * </lib-radio-group>
 * ```
 */
@Showcase<RadioComponent>({
    title: 'Radio',
    category: 'Forms',
    description: 'One option of a `lib-radio-group`, shown among the other options of its group. It is checked while its `value` is the value of the group.',
    bg: 'light',
    // The radio between its siblings: prism-subject marks the one the variants and the controls set.
    host: {
        template:
            '<lib-radio-group name="size" value="m"><lib-radio value="s">Small</lib-radio><lib-radio prism-subject>Medium</lib-radio><lib-radio value="l">Large</lib-radio></lib-radio-group>'
    },
    variants: [
        { name: 'Checked', inputs: { value: 'm' } },
        { name: 'Unchecked', inputs: { value: 'xl' }, template: 'Extra large' }
    ],
    tags: ['form', 'radio', 'choice']
})
@Component({
    selector: 'lib-radio',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'lib-radio' },
    template: `
        <label class="lib-radio__label">
            <input
                #control
                type="radio"
                class="lib-radio__input"
                [name]="group?.name() ?? ''"
                [value]="value()"
                [checked]="checked()"
                (change)="group?.select(value())" />
            <ng-content />
        </label>
    `,
    styles: `
        .lib-radio__label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #374151;
            cursor: pointer;
        }
        .lib-radio__input {
            margin: 0;
            accent-color: #6366f1;
        }
    `
})
export class RadioComponent {
    /** Value the group takes when this radio is selected. */
    readonly value = input.required<string>();

    /** Whether the group's value is this radio's. */
    readonly checked = computed(() => this.group?.value() === this.value());

    protected readonly group = inject(LIB_RADIO_GROUP, { optional: true });

    private readonly document = inject(DOCUMENT);
    private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

    /** Moves the focus to the native radio. */
    focus(): void {
        this.control().nativeElement.focus();
    }

    /** Whether the native radio has the focus. */
    hasFocus(): boolean {
        return this.document.activeElement === this.control().nativeElement;
    }
}
