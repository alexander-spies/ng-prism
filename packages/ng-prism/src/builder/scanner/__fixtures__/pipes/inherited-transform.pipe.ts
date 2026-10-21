import { Pipe, type PipeTransform } from '@angular/core';
import { Showcase } from './showcase.js';

export class TruncateBase {
    /**
     * Cuts a text down to a number of characters.
     *
     * @param value The text to cut.
     * @param length How many characters to keep.
     */
    transform(value: string, length = 20): string {
        return value.slice(0, length);
    }
}

@Showcase({ title: 'Inherited transform' })
@Pipe({ name: 'ellipsis' })
export class InheritedTransformPipe extends TruncateBase implements PipeTransform {
    override transform(value: string, length = 20, ellipsis = '…'): string {
        return value.length > length ? super.transform(value, length - ellipsis.length) + ellipsis : value;
    }
}
