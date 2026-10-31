import { ChangeDetectionStrategy, Component, computed, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * Range slider for picking a number between `min` and `max`.
 *
 * It is built on a native `<input type="range">`, so the arrow keys, Home and End work out of the box.
 * `value` is a model: bind it with `[(value)]`, or listen to `valueChanged`.
 *
 * ## Showing the value
 *
 * - `label` adds a header line above the track; with `showValue` the current value sits at its right
 * - `showValue` without a `label` puts the value below the track
 *
 * @since 1.0.0
 * @example
 * ```html
 * <sg-slider label="Volume" [(value)]="volume" [showValue]="true" />
 * ```
 * @example
 * ```html
 * <sg-slider [min]="1" [max]="5" [step]="1" [value]="rating()" (valueChanged)="rate($event)" />
 * ```
 */
@Showcase({
    title: 'Slider',
    status: 'wip',
    category: 'Inputs',
    description: 'Range slider with min/max bounds, step control, and optional value label.',
    variants: [
        { name: 'Default', inputs: { value: 50, min: 0, max: 100 } },
        { name: 'With Step', inputs: { value: 20, min: 0, max: 100, step: 10, showValue: true } },
        { name: 'Small Range', inputs: { value: 3, min: 1, max: 5, step: 1, showValue: true } },
        { name: 'Disabled', inputs: { value: 60, min: 0, max: 100, disabled: true, showValue: true } },
        { name: 'Custom Label', inputs: { value: 75, min: 0, max: 100, showValue: true, label: 'Volume' } }
    ],
    tags: ['form', 'slider', 'range', 'input']
})
@Component({
    selector: 'sg-slider',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-slider',
        '[class.sg-slider--disabled]': 'disabled()'
    },
    template: `
        @if (label()) {
            <div class="sg-slider__header">
                <label class="sg-slider__label">{{ label() }}</label>
                @if (showValue()) {
                    <span class="sg-slider__display">{{ value() }}</span>
                }
            </div>
        }
        <input class="sg-slider__input" type="range" [min]="min()" [max]="max()" [step]="step()" [value]="value()" [disabled]="disabled()" (input)="onInput($event)" />
        @if (showValue() && !label()) {
            <div class="sg-slider__value">{{ value() }}</div>
        }
    `,
    styles: `
        .sg-slider {
            display: block;
            width: 100%;
        }
        .sg-slider--disabled {
            opacity: 0.5;
        }
        .sg-slider__header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
        }
        .sg-slider__label {
            color: #374151;
            font-weight: 500;
        }
        .sg-slider__display {
            font-weight: 600;
            color: #6366f1;
            font-variant-numeric: tabular-nums;
        }
        .sg-slider__input {
            width: 100%;
            height: 6px;
            appearance: none;
            background: #e5e7eb;
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        }
        .sg-slider__input::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #6366f1;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }
        .sg-slider__input:disabled {
            cursor: not-allowed;
        }
        .sg-slider__value {
            text-align: center;
            margin-top: 4px;
            font-size: 12px;
            color: #6b7280;
            font-variant-numeric: tabular-nums;
        }
    `
})
export class SliderComponent {
    /** Disables the slider and dims it. */
    readonly disabled = input<boolean>(false);

    /** Shows the current value: in the header next to `label`, or below the track without one. */
    readonly showValue = input<boolean>(false);

    /** Text in a header line above the track. */
    readonly label = input<string>('');

    /** Highest value the slider allows. */
    readonly max = input<number>(100);

    /** Lowest value the slider allows. */
    readonly min = input<number>(0);

    /** Distance between two values the slider can stop at. */
    readonly step = input<number>(1);

    /** Current value. Two-way bindable with `[(value)]`. */
    readonly value = model<number>(50);

    /** Emits the new value on user input and on `reset()`. Not emitted when `value` is set from outside. */
    readonly valueChanged = output<number>();

    protected readonly percentage = computed(() => ((this.value() - this.min()) / (this.max() - this.min())) * 100);

    /**
     * Handles the native `input` event of the range element: sets `value` and emits `valueChanged`.
     * @param event The native input event
     */
    onInput(event: Event): void {
        const val = Number((event.target as HTMLInputElement).value);

        this.value.set(val);
        this.valueChanged.emit(val);
    }

    /** Moves the slider to the midpoint between `min` and `max`, rounded, and emits `valueChanged`. */
    reset(): void {
        const mid = Math.round((this.min() + this.max()) / 2);

        this.value.set(mid);
        this.valueChanged.emit(mid);
    }
}
