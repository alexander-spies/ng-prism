import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Semantic colour of a progress bar's fill. */
export type ProgressBarVariantType = 'default' | 'success' | 'warning' | 'error';

/**
 * Horizontal bar that shows how far a task has come.
 *
 * ## Two modes
 *
 * - **Determinate**: `value` from 0 to 100 sets the fill, values outside that range are clamped
 * - **Indeterminate**: for work of unknown length, a segment runs along the track
 *
 * With a `label`, a header line above the bar shows the label and, while determinate, the percentage.
 * The track carries `role="progressbar"`; `aria-valuenow` is left out while indeterminate.
 *
 * @since 1.0.0
 * @see SpinnerComponent
 * @example
 * ```html
 * <sg-progress-bar [value]="uploaded()" label="Uploading" />
 * ```
 * @example
 * ```html
 * <sg-progress-bar [indeterminate]="true" label="Preparing export" />
 * ```
 */
@Showcase({
    title: 'Progress Bar',
    status: 'beta',
    category: 'Feedback',
    description: 'Horizontal progress indicator with semantic color variants and optional label.',
    variants: [
        { name: '25%', inputs: { value: 25, label: 'Uploading...' } },
        { name: '50%', inputs: { value: 50, label: 'Processing' } },
        { name: '100% Success', inputs: { value: 100, variant: 'success', label: 'Complete' } },
        { name: 'Warning', inputs: { value: 75, variant: 'warning', label: 'Disk usage' } },
        { name: 'Error', inputs: { value: 90, variant: 'error', label: 'Critical' } },
        { name: 'Indeterminate', inputs: { indeterminate: true, label: 'Loading...' } }
    ],
    tags: ['feedback', 'progress', 'loading', 'indicator']
})
@Component({
    selector: 'sg-progress-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'sg-progress-bar' },
    template: `
        @if (label()) {
            <div class="sg-progress-bar__header">
                <span class="sg-progress-bar__label">{{ label() }}</span>
                @if (!indeterminate()) {
                    <span class="sg-progress-bar__value">{{ clampedValue() }}%</span>
                }
            </div>
        }
        <div
            class="sg-progress-bar__track"
            role="progressbar"
            [attr.aria-valuenow]="indeterminate() ? undefined : clampedValue()"
            [attr.aria-valuemin]="0"
            [attr.aria-valuemax]="100">
            <div
                class="sg-progress-bar__fill"
                [attr.data-variant]="variant()"
                [class.sg-progress-bar__fill--indeterminate]="indeterminate()"
                [style.width]="indeterminate() ? '40%' : clampedValue() + '%'"></div>
        </div>
    `,
    styles: `
        .sg-progress-bar {
            display: block;
            width: 100%;
        }
        .sg-progress-bar__header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 13px;
            color: #374151;
        }
        .sg-progress-bar__value {
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }
        .sg-progress-bar__track {
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: #e5e7eb;
            overflow: hidden;
        }
        .sg-progress-bar__fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .sg-progress-bar__fill[data-variant='default'] {
            background: #6366f1;
        }
        .sg-progress-bar__fill[data-variant='success'] {
            background: #10b981;
        }
        .sg-progress-bar__fill[data-variant='warning'] {
            background: #f59e0b;
        }
        .sg-progress-bar__fill[data-variant='error'] {
            background: #ef4444;
        }
        .sg-progress-bar__fill--indeterminate {
            animation: sg-progress-indeterminate 1.5s ease-in-out infinite;
        }
        @keyframes sg-progress-indeterminate {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(350%);
            }
        }
    `
})
export class ProgressBarComponent {
    /** Progress in percent, clamped to 0 to 100. Ignored while `indeterminate`. */
    readonly value = input<number>(0);

    /** Colour of the fill: `success` once the task is done, `warning` and `error` for thresholds such as disk usage. */
    readonly variant = input<ProgressBarVariantType>('default');

    /** Text above the bar. Without it the header line, percentage included, is left out. */
    readonly label = input<string>('');

    /**
     * Shows a running segment instead of a fill, for work of unknown length.
     * @since 1.2.0
     */
    readonly indeterminate = input<boolean>(false);

    protected readonly clampedValue = computed(() => Math.max(0, Math.min(100, this.value())));

    /**
     * Returns `value` clamped to 0 to 100.
     * @deprecated Since 1.3.0, removed in 2.0.0. The bar clamps on its own; clamp `value` yourself where you need the number.
     */
    getClampedValue(): number {
        return this.clampedValue();
    }
}
