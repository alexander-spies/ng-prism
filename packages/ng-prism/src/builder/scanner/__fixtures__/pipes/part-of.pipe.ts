import { Pipe, type PipeTransform } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Part pipe', partOf: 'lib-select' })
@Pipe({ name: 'partOfPipe' })
export class PartOfPipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}
