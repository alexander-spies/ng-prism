import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join(__dirname, 'prism-list-row.component.css'), 'utf8');

function rule(selector: string): string {
    const start = CSS.indexOf(`${selector} {`);

    if (start < 0) throw new Error(`${selector} not found`);
    return CSS.slice(start, CSS.indexOf('}', start));
}

/**
 * Every slot of the row is optional, and an empty one is hidden. On a
 * three-column grid a row without a badge moved its title into the badge
 * column and stretched the meta; a flex row closes the gap instead, and the
 * text takes the room that is left.
 */
describe('prism-list-row layout', () => {
    it('should lay out its slots so that a missing one leaves no hole', () => {
        expect(rule(':host')).toMatch(/display:\s*flex/);
        expect(rule('.prism-list-row__text')).toMatch(/flex:\s*1 1 0/);
    });
});
