import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The inputs table, read from the template: the component declares `input()`,
 * which this workspace's JIT test setup cannot render.
 */
const TEMPLATE = readFileSync(join(__dirname, 'jsdoc-api-page.component.html'), 'utf8');
const inputsTable = TEMPLATE.slice(TEMPLATE.indexOf('data-toc-id="inputs"'), TEMPLATE.indexOf('</table>', TEMPLATE.indexOf('data-toc-id="inputs"')));

describe('api page inputs table', () => {
    /** A column that is empty for most inputs; required now marks the name instead (F25). */
    it('has no Required column', () => {
        expect(inputsTable).not.toContain('<th>Required</th>');
        expect(inputsTable).not.toContain('prism-jsdoc-panel__cell--required');
    });

    it('marks a required input at its name', () => {
        const nameCell = inputsTable.slice(inputsTable.indexOf('prism-jsdoc-panel__cell--name'), inputsTable.indexOf('prism-jsdoc-panel__cell--type'));

        expect(nameCell).toContain('input.required');
        expect(nameCell).toContain('prism-jsdoc-panel__badge--required');
    });
});
