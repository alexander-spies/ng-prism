import { Directive, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Why a `libCopyToClipboard` could not write its text, emitted by `copyFailed`. */
export interface CopyFailure {
    /** The text that was not copied. */
    text: string;
    /** The message of the error the Clipboard API rejected with. */
    reason: string;
}

/**
 * Copies a text to the clipboard when its host is clicked, through the asynchronous Clipboard API.
 *
 * The page must be served over HTTPS or from `localhost`, and the click counts as the user gesture the
 * browser asks for.
 *
 * @since 1.8.0
 * @example
 * ```html
 * <button type="button" libCopyToClipboard="npm i @ng-prism/core" (copied)="toast($event)">Copy</button>
 * ```
 */
@Showcase({
    title: 'Copy to Clipboard',
    category: 'Inputs',
    description: 'Attribute directive that copies a text when its host is clicked and reports the result through its outputs.',
    host: '<button type="button">Copy</button>',
    variants: [
        { name: 'Install command', inputs: { libCopyToClipboard: 'npm i @ng-prism/core' } },
        { name: 'Link', inputs: { libCopyToClipboard: 'https://ng-prism.github.io/ng-prism/' }, content: 'Copy link' }
    ],
    tags: ['clipboard', 'copy', 'directive', 'attribute']
})
@Directive({
    selector: '[libCopyToClipboard]',
    standalone: true,
    host: {
        '(click)': 'copy()'
    }
})
export class CopyToClipboardDirective {
    /** The text to copy, set through the directive's own attribute. */
    readonly libCopyToClipboard = input.required<string>();

    /** Emits the copied text once the clipboard holds it. */
    readonly copied = output<string>();

    /** Emits the text and the reason when the browser refuses to write to the clipboard, see {@link CopyFailure}. */
    readonly copyFailed = output<CopyFailure>();

    /** Writes the text to the clipboard. Called on `click` of the host. */
    async copy(): Promise<void> {
        const text = this.libCopyToClipboard();

        try {
            await navigator.clipboard.writeText(text);
            this.copied.emit(text);
        } catch (error) {
            this.copyFailed.emit({ text, reason: error instanceof Error ? error.message : String(error) });
        }
    }
}
