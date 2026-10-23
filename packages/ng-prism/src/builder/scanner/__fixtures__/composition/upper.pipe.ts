import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'upper' })
export class UpperPipe implements PipeTransform {
    transform(value: string): string {
        return value.toUpperCase();
    }
}
