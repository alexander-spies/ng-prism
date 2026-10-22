import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The matrix template, read as text: the component declares `input()`, which
 * this workspace's JIT test compilation cannot render (see the cell specs).
 */
const TEMPLATE = readFileSync(join(__dirname, 'prism-overview-matrix.component.html'), 'utf8');

function rowHeader(): string {
    const match = /<div[^>]*role="rowheader"[^>]*>/.exec(TEMPLATE);

    if (!match) throw new Error('row header not found');
    return match[0];
}

describe('overview matrix template', () => {
    // O2: the variant's background hint and `states: false` are the row header's
    // tooltip now, not a second line under the name.
    it('should put the row note in the row header title instead of showing it', () => {
        expect(rowHeader()).toContain('[attr.title]="row.note"');
        expect(TEMPLATE).not.toContain('matrix__note');
    });

    it('should label the corner with both axes', () => {
        expect(TEMPLATE).toMatch(/role="columnheader">\s*Variant \\ State\s*</);
    });

    it('should explain the fit count in a tooltip next to the title', () => {
        expect(TEMPLATE).toContain('[attr.title]="fit.title"');
        expect(TEMPLATE).toContain('{{ fit.text }}');
    });
});
