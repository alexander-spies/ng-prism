import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { nestParts } from './nest-parts.js';

function component(className: string, title: string, selector: string, overrides: Partial<ScannedComponent> = {}): ScannedComponent {
    return {
        className,
        filePath: `${className}.ts`,
        showcaseConfig: { title },
        inputs: [],
        outputs: [],
        componentMeta: { selector, standalone: true, isDirective: false },
        ...overrides
    };
}

function part(className: string, title: string, selector: string, parent: string, partOf: string): ScannedComponent {
    return component(className, title, selector, { showcaseConfig: { title, partOf }, parentClassName: parent });
}

const SELECT = component('SelectComponent', 'Select', 'lib-select, [libSelect]');
const OPTION = part('OptionComponent', 'Option', 'lib-option', 'SelectComponent', 'lib-select');
const OPTGROUP = part('OptgroupComponent', 'Option Group', 'lib-optgroup', 'SelectComponent', '[libSelect]');

describe('nestParts', () => {
    it('moves parts onto their parent, sorted by title', () => {
        const out = nestParts([SELECT, OPTGROUP, OPTION]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent']);
        expect(out[0].parts!.map((p) => p.className)).toEqual(['OptionComponent', 'OptgroupComponent']);
    });

    it('keeps the part as it was scanned, partOf and parentClassName included', () => {
        const [select] = nestParts([SELECT, OPTION]);

        expect(select.parts![0]).toBe(OPTION);
        expect(select.parts![0].parentClassName).toBe('SelectComponent');
        expect(select.parts![0].showcaseConfig.partOf).toBe('lib-select');
    });

    it('leaves the other components in their order and gives one without parts no parts key', () => {
        const button = component('ButtonComponent', 'Button', 'lib-button');
        const card = component('CardComponent', 'Card', 'lib-card');
        const out = nestParts([button, SELECT, OPTION, card]);

        expect(out.map((c) => c.className)).toEqual(['ButtonComponent', 'SelectComponent', 'CardComponent']);
        expect(out[0]).toBe(button);
        expect(out[2]).toBe(card);
        expect(out[0]).not.toHaveProperty('parts');
    });

    it('finds the parent wherever it stands in the list', () => {
        const out = nestParts([OPTION, SELECT]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent']);
        expect(out[0].parts!.map((p) => p.className)).toEqual(['OptionComponent']);
    });

    it('returns a new parent and leaves the objects it was given as they were', () => {
        const input = [SELECT, OPTION];
        const out = nestParts(input);

        expect(out[0]).not.toBe(SELECT);
        expect(SELECT).not.toHaveProperty('parts');
        expect(input).toEqual([SELECT, OPTION]);
        expect(input).toHaveLength(2);
    });

    it('returns the components unchanged when there are no parts', () => {
        const button = component('ButtonComponent', 'Button', 'lib-button');

        expect(nestParts([button, SELECT])).toEqual([button, SELECT]);
    });

    it('keeps a part whose parent is not among the components as a component of its own, without partOf and parentClassName', () => {
        const orphan = part('OrphanComponent', 'Orphan', 'lib-orphan', 'Gone', 'lib-gone');
        const out = nestParts([SELECT, orphan]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent', 'OrphanComponent']);
        expect(out[1]).not.toHaveProperty('parentClassName');
        expect(out[1].showcaseConfig).toEqual({ title: 'Orphan' });
        expect(out[1].showcaseConfig).not.toHaveProperty('partOf');
        // What it was given stays as it was.
        expect(orphan.parentClassName).toBe('Gone');
        expect(orphan.showcaseConfig.partOf).toBe('lib-gone');
    });

    it('looks the parent up in the scanned list and nests what the hooks returned', () => {
        const renamed = { ...SELECT, className: 'RenamedSelect', componentMeta: { ...SELECT.componentMeta, selector: 'lib-renamed' } };
        const option = { ...OPTION, meta: { seen: true } };
        const out = nestParts([renamed, option], [SELECT, OPTION]);

        expect(out.map((c) => c.className)).toEqual(['RenamedSelect']);
        expect(out[0].parts).toEqual([option]);
        expect(out[0].parts![0]).toBe(option);
    });

    it('takes a part from the scanned list as a part, whatever the hooks did to its fields', () => {
        const unmarked = { ...OPTION, showcaseConfig: { title: 'Option' } };

        delete (unmarked as Partial<ScannedComponent>).parentClassName;

        const out = nestParts([SELECT, unmarked], [SELECT, OPTION]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent']);
        expect(out[0].parts).toEqual([unmarked]);
    });

    it("does not take another class of the same name for the parent: the parent also has the part's selector", () => {
        const otherSelect = component('SelectComponent', 'Other select', 'lib-other-select', { filePath: 'other/select.component.ts' });
        const out = nestParts([otherSelect, SELECT, OPTION]);

        expect(out.map((c) => c.filePath)).toEqual(['other/select.component.ts', 'SelectComponent.ts']);
        expect(out[0]).toBe(otherSelect);
        expect(out[1].parts!.map((p) => p.className)).toEqual(['OptionComponent']);
    });

    it('keeps a part as a component of its own when the class of that name does not have the selector', () => {
        const otherSelect = component('SelectComponent', 'Other select', 'lib-other-select');
        const out = nestParts([otherSelect, OPTION]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent', 'OptionComponent']);
        expect(out[0]).not.toHaveProperty('parts');
        expect(out[1].showcaseConfig).not.toHaveProperty('partOf');
        expect(out[1]).not.toHaveProperty('parentClassName');
    });

    it('does not nest a part into another part', () => {
        const chain = part('ChainComponent', 'Chain', 'lib-chain', 'OptionComponent', 'lib-option');
        const out = nestParts([SELECT, OPTION, chain]);

        expect(out.map((c) => c.className)).toEqual(['SelectComponent', 'ChainComponent']);
        expect(out[0].parts!.map((p) => p.className)).toEqual(['OptionComponent']);
        expect(out[1]).not.toHaveProperty('parentClassName');
        expect(out[1].showcaseConfig).not.toHaveProperty('partOf');
    });

    it('matches the selector against every entry of a parent that has a list', () => {
        const byAttribute = nestParts([SELECT, OPTGROUP]);

        expect(byAttribute[0].parts!.map((p) => p.className)).toEqual(['OptgroupComponent']);
    });
});
