import { Pipe, type PipeTransform } from '@angular/core';
import { Showcase } from './showcase.js';

@Showcase({ title: 'First documented' })
@Pipe({ name: 'firstDocumented' })
export class FirstDocumentedPipe implements PipeTransform {
    /**
     * Cuts a text down to a number of characters.
     *
     * @param value The text to cut.
     * @param length How many characters to keep.
     */
    transform(value: string, length?: number): string;
    transform(value: null, length?: number): null;
    transform(value: string | null, length = 20): string | null {
        return value === null ? null : value.slice(0, length);
    }
}

@Showcase({ title: 'Implementation documented' })
@Pipe({ name: 'implementationDocumented' })
export class ImplementationDocumentedPipe implements PipeTransform {
    transform(value: string, length?: number): string;
    transform(value: null, length?: number): null;
    /**
     * Cuts a text down to a number of characters.
     *
     * @param value The text to cut.
     * @param length How many characters to keep.
     */
    transform(value: string | null, length = 20): string | null {
        return value === null ? null : value.slice(0, length);
    }
}
