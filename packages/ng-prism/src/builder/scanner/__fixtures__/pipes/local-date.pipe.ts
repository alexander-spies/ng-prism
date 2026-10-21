import { DatePipe } from '@angular/common';
import { Pipe, type PipeTransform } from '@angular/core';
import { Showcase } from './showcase.js';

/** The `date` pipe under a name of the library's own: `transform` only exists in the .d.ts of `@angular/common`. */
@Showcase({ title: 'Local date' })
@Pipe({ name: 'localDate' })
export class LocalDatePipe extends DatePipe implements PipeTransform {}
