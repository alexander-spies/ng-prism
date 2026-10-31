import { Pipe, type PipeTransform } from '@angular/core';
import { Showcase } from './showcase.js';

/** Where a term was found in a text. */
export interface HighlightMatch {
    start: number;
    end: number;
}

@Showcase({ title: 'Extra members' })
@Pipe({ name: 'highlight' })
export class ExtraMembersPipe implements PipeTransform {
    /** The matches of the last call. */
    lastMatches: HighlightMatch[] = [];

    /** Where a term occurs in a text. */
    matchesOf(value: string, term: string): HighlightMatch[] {
        const start = value.indexOf(term);

        return start < 0 ? [] : [{ start, end: start + term.length }];
    }

    transform(value: string, term: string): string {
        this.lastMatches = this.matchesOf(value, term);

        return this.lastMatches.length === 0 ? value : value.replace(term, `<mark>${term}</mark>`);
    }
}
