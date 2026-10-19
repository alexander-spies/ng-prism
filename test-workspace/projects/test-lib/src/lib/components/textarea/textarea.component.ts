import { ChangeDetectionStrategy, Component, computed, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A multi-line text input with character count, auto-resize hint, and validation states.
 * @since 1.0.0
 */
@Showcase({
    title: 'Textarea',
    status: 'wip',
    category: 'Inputs',
    description: 'Multi-line text input with optional character counter, placeholder, and validation.',
    // Real focus on the field puts the host into :focus-within as well.
    states: [{ name: 'Focused', pseudo: { focus: '.sg-textarea__input', 'focus-within': '.sg-textarea' } }],
    variants: [
        { name: 'Default', inputs: { placeholder: 'Enter your message...' } },
        { name: 'With Value', inputs: { value: 'Hello, this is a pre-filled textarea.', placeholder: 'Type here' } },
        { name: 'With Counter', inputs: { maxLength: 200, showCounter: true, placeholder: 'Max 200 characters' } },
        { name: 'Error State', inputs: { value: '', error: 'This field is required.', placeholder: 'Required field' } },
        { name: 'Disabled', inputs: { value: 'Read only content', disabled: true } },
        { name: 'Small', inputs: { rows: 2, placeholder: 'Short input' } },
        {
            name: 'Typing',
            inputs: { value: 'Hello', maxLength: 200, showCounter: true },
            bg: 'light',
            // Own inputs plus focus: a one-off picture, so it stays a variant with its own pseudo.
            pseudo: { focus: '.sg-textarea__input', 'focus-within': '.sg-textarea' }
        }
    ],
    tags: ['form', 'textarea', 'text', 'input']
})
@Component({
    selector: 'sg-textarea',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-textarea',
        '[class.sg-textarea--disabled]': 'disabled()',
        '[class.sg-textarea--error]': '!!error()'
    },
    template: `
        <textarea
            class="sg-textarea__input"
            [value]="value()"
            [placeholder]="placeholder()"
            [rows]="rows()"
            [disabled]="disabled()"
            [attr.maxlength]="maxLength() || null"
            (input)="onInput($event)"
            (blur)="blurred.emit()"></textarea>
        @if (showCounter() || error()) {
            <div class="sg-textarea__footer">
                @if (error()) {
                    <span class="sg-textarea__error">{{ error() }}</span>
                }
                @if (showCounter()) {
                    <span class="sg-textarea__counter" [class.sg-textarea__counter--limit]="isAtLimit()">
                        {{ charCount() }}
                        @if (maxLength()) {
                            / {{ maxLength() }}
                        }
                    </span>
                }
            </div>
        }
    `,
    styles: `
        .sg-textarea {
            display: block;
            width: 100%;
        }
        .sg-textarea__input {
            display: block;
            width: 100%;
            padding: 8px 12px;
            font-size: 14px;
            font-family: inherit;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #fff;
            color: #111827;
            resize: vertical;
            outline: none;
            transition:
                border-color 0.15s,
                box-shadow 0.15s;
            box-sizing: border-box;
        }
        .sg-textarea__input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .sg-textarea--error .sg-textarea__input {
            border-color: #ef4444;
        }
        .sg-textarea--error .sg-textarea__input:focus {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .sg-textarea--disabled .sg-textarea__input {
            background: #f9fafb;
            color: #9ca3af;
            cursor: not-allowed;
        }
        .sg-textarea__footer {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 12px;
        }
        .sg-textarea__error {
            color: #ef4444;
        }
        .sg-textarea__counter {
            color: #9ca3af;
            margin-left: auto;
            font-variant-numeric: tabular-nums;
        }
        .sg-textarea:focus-within .sg-textarea__counter:not(.sg-textarea__counter--limit) {
            color: #6366f1;
        }
        .sg-textarea__counter--limit {
            color: #ef4444;
            font-weight: 600;
        }
    `
})
export class TextareaComponent {
    readonly placeholder = input<string>('');
    readonly rows = input<number>(4);
    readonly disabled = input<boolean>(false);
    readonly maxLength = input<number>(0);
    readonly showCounter = input<boolean>(false);
    readonly error = input<string>('');
    readonly value = model<string>('');
    readonly valueChanged = output<string>();
    readonly blurred = output<void>();

    protected readonly charCount = computed(() => this.value().length);
    protected readonly isAtLimit = computed(() => this.maxLength() > 0 && this.charCount() >= this.maxLength());

    /**
     * Handles native input events and syncs the value.
     * @param event The native input event
     */
    onInput(event: Event): void {
        const val = (event.target as HTMLTextAreaElement).value;

        this.value.set(val);
        this.valueChanged.emit(val);
    }

    /** Clears the textarea value and emits an empty string. */
    clear(): void {
        this.value.set('');
        this.valueChanged.emit('');
    }
}
