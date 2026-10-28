import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The sections of an API page, read from the template: the component declares
 * `input()`, which this workspace's JIT test setup cannot render.
 */
const SECTIONS = readFileSync(join(__dirname, 'jsdoc-api-sections.component.html'), 'utf8');
const INPUTS_ANCHOR = `[attr.data-toc-id]="anchor('inputs')"`;
const inputsTable = SECTIONS.slice(SECTIONS.indexOf(INPUTS_ANCHOR), SECTIONS.indexOf('</table>', SECTIONS.indexOf(INPUTS_ANCHOR)));

describe('api page inputs table', () => {
    it('is found', () => {
        expect(inputsTable).toContain('<table');
    });

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

describe('api page sections', () => {
    /** A part's block shares the scroll host with its parent's page, so no anchor may be the same in two blocks. */
    it('scopes every section anchor', () => {
        expect(SECTIONS).not.toMatch(/ data-toc-id="/);
        expect(SECTIONS).toContain(`[attr.data-toc-id]="anchor('inputs')"`);
    });

    it('scopes the anchor of a type card', () => {
        expect(SECTIONS).toContain('@let card = typeAnchor(type.id, scope());');
        expect(SECTIONS).toContain('[attr.data-toc-id]="card"');
    });

    /** Under the heading of a part's block, the section headings are one level deeper. */
    it('puts every section heading a level down in a nested block', () => {
        const headings = SECTIONS.match(/<h3[^>]*>/g) ?? [];

        expect(headings).toHaveLength(9);
        for (const heading of headings) expect(heading).toContain('[attr.aria-level]="nested() ? 4 : null"');
    });
});
