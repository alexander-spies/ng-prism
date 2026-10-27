import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import ts from 'typescript';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { PART_IGNORED_FIELDS, resolveParts, selectorList } from './resolve-parts.js';
import { createScanner, type ScanResult } from './scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');
const PREFIX = '⚠ ng-prism: ';

describe('selectorList', () => {
    it('splits on commas, trims and drops empty entries', () => {
        expect(selectorList('lib-select, [libSelect] ,, ')).toEqual(['lib-select', '[libSelect]']);
        expect(selectorList('')).toEqual([]);
    });
});

describe('resolveParts through the scan', () => {
    let result: ScanResult;
    let warnings: string[];
    let warn: jest.SpyInstance;

    beforeAll(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        result = createScanner({ entryPoints: [{ entryFile: path.join(FIXTURES_DIR, 'parts-api.ts'), importPath: 'fixture' }] }).scan();
        warnings = warn.mock.calls.map(([message]) => String(message)).flatMap((message) => (message.startsWith(PREFIX) ? [message.slice(PREFIX.length)] : []));
        warn.mockRestore();
    });

    const byName = (className: string): ScannedComponent => result.components.find((c) => c.className === className)!;

    it('resolves a part to its parent', () => {
        expect(byName('OptionComponent').parentClassName).toBe('SelectComponent');
        expect(byName('SelectComponent').parentClassName).toBeUndefined();
    });

    it('matches one selector of a selector list, ignoring surrounding spaces', () => {
        expect(byName('OptgroupComponent').parentClassName).toBe('SelectComponent');
    });

    it('keeps partOf on a valid part', () => {
        expect(byName('OptionComponent').showcaseConfig.partOf).toBe('lib-select');
    });

    it('drops what a part cannot use, as notices that are no diagnostics', () => {
        expect(byName('OptionComponent').showcaseConfig).not.toHaveProperty('variants');
        expect(byName('OptionComponent').showcaseConfig).not.toHaveProperty('category');
        expect(warnings).toContainEqual(
            expect.stringMatching(
                /^OptionComponent › variants — has no effect on a part, which has no page of its own: the parent's showcase shows it\. It was dropped\. \(.*parts-select\.component\.ts:\d+:\d+\)$/
            )
        );
        expect(warnings).toContainEqual(expect.stringMatching(/^OptionComponent › category — has no effect on a part/));
        expect(result.diagnostics.filter((d) => d.includes('has no effect on a part'))).toEqual([]);
    });

    it('keeps what a part uses', () => {
        expect(byName('OptionComponent').showcaseConfig.title).toBe('Option');
        expect(byName('OptionComponent').inputs.map((i) => i.name)).toEqual(['value', 'disabled']);
        expect(byName('OptionComponent').outputs.map((o) => o.name)).toEqual(['remove']);
    });

    it('does not say anything about a part that sets none of the fields', () => {
        expect(warnings.filter((n) => n.startsWith('OptgroupComponent'))).toEqual([]);
    });

    it('keeps an unresolved part a page of its own, variants included', () => {
        const orphan = byName('OrphanComponent');

        expect(orphan.parentClassName).toBeUndefined();
        expect(orphan.showcaseConfig.partOf).toBeUndefined();
        expect(orphan.showcaseConfig.variants?.map((v) => v.name)).toEqual(['A', 'B']);
        expect(result.diagnostics).toContainEqual(
            expect.stringMatching(/^OrphanComponent › partOf — no component or directive with @Showcase has the selector "lib-missing"; it keeps a page of its own/)
        );
    });

    it.each([
        ['TwinPartComponent', /"lib-twin" is the selector of TwinAComponent and TwinBComponent; name a selector only one of them has\. It keeps a page of its own/],
        ['ChainComponent', /OptionComponent is a part itself, and a part cannot have parts; it keeps a page of its own/],
        ['SelfComponent', /a component cannot be a part of itself; it keeps a page of its own/]
    ])('reports %s as a diagnostic', (className, text) => {
        expect(byName(className).parentClassName).toBeUndefined();
        expect(byName(className).showcaseConfig.partOf).toBeUndefined();
        expect(result.diagnostics).toContainEqual(expect.stringMatching(text));
    });

    it('points a diagnostic at the partOf property', () => {
        expect(result.diagnostics).toContainEqual(expect.stringMatching(/^SelfComponent › partOf — .* \(.*parts-select\.component\.ts:43:\d+\)$/));
    });

    it('leaves a component without partOf untouched', () => {
        const select = byName('SelectComponent');

        expect(select.showcaseConfig.variants?.map((v) => v.name)).toEqual(['Default']);
        expect(select).not.toHaveProperty('parentClassName');
    });
});

describe('resolveParts with exports picked per entry point', () => {
    let tmp: string;
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        tmp = mkdtempSync(join(tmpdir(), 'ng-prism-parts-'));
    });

    afterEach(() => {
        warn.mockRestore();
        rmSync(tmp, { recursive: true, force: true });
    });

    function entry(name: string, ...exported: string[]): { entryFile: string; importPath: string } {
        const entryFile = join(tmp, `${name}.ts`);

        writeFileSync(entryFile, `export { ${exported.join(', ')} } from '${join(FIXTURES_DIR, 'parts-select.component')}';\n`, 'utf-8');

        return { entryFile, importPath: `fixture/${name}` };
    }

    it('resolves a part whose parent is exported by another entry point, whichever is scanned first', () => {
        for (const entryPoints of [
            [entry('part', 'OptionComponent'), entry('parent', 'SelectComponent')],
            [entry('parent', 'SelectComponent'), entry('part', 'OptionComponent')]
        ]) {
            const { components, diagnostics } = createScanner({ entryPoints }).scan();

            expect(components.find((c) => c.className === 'OptionComponent')?.parentClassName).toBe('SelectComponent');
            expect(diagnostics).toEqual([]);
        }
    });

    it('leaves providers and setup of a part to the diagnostics every component gets, with no notice of its own', () => {
        const { components, diagnostics } = createScanner({ entryPoints: [entry('part', 'SelectComponent', 'ProvidersPartComponent')] }).scan();
        const messages = warn.mock.calls.map(([message]) => String(message));

        expect(components.find((c) => c.className === 'ProvidersPartComponent')?.parentClassName).toBe('SelectComponent');
        expect(diagnostics).toContainEqual(
            expect.stringMatching(/^ProvidersPartComponent declares @Showcase providers \(.*parts-select\.component\.ts:\d+:\d+\), which are deprecated/)
        );
        expect(diagnostics).toContainEqual(expect.stringMatching(/^ProvidersPartComponent › setup \(.*\) only applies to services and pipes/));
        expect(messages.filter((message) => message.includes('has no effect on a part'))).toEqual([]);
    });

    it('keeps the host element of a directive part and drops a host template, with a notice', () => {
        const { components, diagnostics } = createScanner({ entryPoints: [entry('part', 'SelectComponent', 'SelectTriggerDirective', 'SelectHintComponent')] }).scan();
        const notices = warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('has no effect on a part'));
        const byName = (className: string): ScannedComponent => components.find((c) => c.className === className)!;

        expect(byName('SelectTriggerDirective').parentClassName).toBe('SelectComponent');
        expect(byName('SelectTriggerDirective').showcaseConfig.host).toBe('<button type="button">');
        expect(byName('SelectHintComponent').parentClassName).toBe('SelectComponent');
        expect(byName('SelectHintComponent').showcaseConfig).not.toHaveProperty('host');
        expect(notices).toEqual([expect.stringMatching(/^⚠ ng-prism: SelectHintComponent › host — has no effect on a part/)]);
        expect(diagnostics).toEqual([]);
    });

    it('does not take a class that two entry points export for its own twin', () => {
        const { components, diagnostics } = createScanner({
            entryPoints: [entry('a', 'SelectComponent', 'OptionComponent'), entry('b', 'SelectComponent', 'OptionComponent')]
        }).scan();

        expect(components.map((c) => c.className)).toEqual(['SelectComponent', 'OptionComponent']);
        expect(components.find((c) => c.className === 'OptionComponent')?.parentClassName).toBe('SelectComponent');
        expect(diagnostics).toEqual([]);
    });
});

describe('resolveParts', () => {
    const source = ts.createSourceFile('part.ts', "export const config = { title: 'Part', partOf: 'lib-parent' };", ts.ScriptTarget.ES2022, true);
    const origin = (source.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;

    function component(className: string, selector: string, showcaseConfig: Partial<ScannedComponent['showcaseConfig']> = {}): ScannedComponent {
        return {
            className,
            filePath: `${className}.ts`,
            showcaseConfig: { title: className, ...showcaseConfig },
            inputs: [],
            outputs: [],
            componentMeta: { selector, standalone: true, isDirective: false }
        };
    }

    function run(components: ScannedComponent[], parts: ScannedComponent[]) {
        const messages = { diagnostics: [] as string[], notices: [] as string[] };

        resolveParts(components, {
            report: (message) => messages.diagnostics.push(message),
            notify: (message) => messages.notices.push(message),
            origins: new Map(parts.map((part) => [part, origin]))
        });

        return messages;
    }

    it('lists only fields that can reach the showcaseConfig of a component, so providers and setup keep their own diagnostics', () => {
        expect(PART_IGNORED_FIELDS).not.toContain('providers');
        expect(PART_IGNORED_FIELDS).not.toContain('setup');
        expect(PART_IGNORED_FIELDS).toContain('variants');
    });

    it('drops the composition of a valid part together with its variants', () => {
        const parent = component('ParentComponent', 'lib-parent');
        const part = component('PartComponent', 'lib-part', { partOf: 'lib-parent', variants: [{ name: 'A', template: '<lib-part />' }] });

        part.composition = { cases: [], variants: {} } as unknown as ScannedComponent['composition'];
        const { diagnostics } = run([parent, part], [part]);

        expect(diagnostics).toEqual([]);
        expect(part.parentClassName).toBe('ParentComponent');
        expect(part).not.toHaveProperty('composition');
        expect(part.showcaseConfig).not.toHaveProperty('variants');
    });

    it('keeps the composition of a part that stays a component of its own', () => {
        const part = component('PartComponent', 'lib-part', { partOf: 'lib-missing' });

        part.composition = { cases: [], variants: {} } as unknown as ScannedComponent['composition'];
        const { diagnostics } = run([part], [part]);

        expect(diagnostics).toHaveLength(1);
        expect(part).toHaveProperty('composition');
    });

    it('reports every ignored field it drops, in the order of PART_IGNORED_FIELDS', () => {
        const parent = component('ParentComponent', 'lib-parent');
        const part = component('PartComponent', 'lib-part', {
            partOf: 'lib-parent',
            sectionOrder: 2,
            category: 'Forms',
            host: { template: '<lib-parent><lib-part /></lib-parent>' },
            variants: [{ name: 'A' }]
        });
        const { notices } = run([parent, part], [part]);

        expect(notices.map((n) => n.split(' — ')[0])).toEqual([
            'PartComponent › variants',
            'PartComponent › category',
            'PartComponent › sectionOrder',
            'PartComponent › host'
        ]);
    });

    /** The jsdoc usage line of a directive is written on its host element: `<button libTrigger>`, not `<div libTrigger>`. */
    it.each([
        ['a string', '<button type="button">'],
        ['an object', { selector: 'lib-frame', import: { name: 'FrameComponent', from: 'lib' } }]
    ])('keeps %s host on a directive part, without a notice', (_kind, host) => {
        const parent = component('ParentComponent', 'lib-parent');
        const part = component('TriggerDirective', '[libTrigger]', { partOf: 'lib-parent', host: host as ScannedComponent['showcaseConfig']['host'] });

        part.componentMeta.isDirective = true;
        const { notices } = run([parent, part], [part]);

        expect(part.showcaseConfig.host).toEqual(host);
        expect(notices).toEqual([]);
    });

    it('drops a host template from a directive part, with a notice', () => {
        const parent = component('ParentComponent', 'lib-parent');
        const part = component('TriggerDirective', '[libTrigger]', { partOf: 'lib-parent', host: { template: '<lib-parent><button libTrigger></button></lib-parent>' } });

        part.componentMeta.isDirective = true;
        const { notices } = run([parent, part], [part]);

        expect(part.showcaseConfig).not.toHaveProperty('host');
        expect(notices).toEqual([expect.stringMatching(/^TriggerDirective › host — has no effect on a part/)]);
    });

    it('matches a directive as a parent too', () => {
        const directive = component('ParentDirective', '[libParent]');
        const part = component('PartComponent', 'lib-part', { partOf: '[libParent]' });

        directive.componentMeta.isDirective = true;
        run([directive, part], [part]);

        expect(part.parentClassName).toBe('ParentDirective');
    });

    it('checks self before the candidates, so a selector another class shares does not make a part ambiguous', () => {
        const part = component('PartComponent', 'lib-part', { partOf: 'lib-part' });
        const other = component('OtherComponent', 'lib-part');
        const { diagnostics } = run([part, other], [part]);

        expect(diagnostics).toEqual([expect.stringContaining('a component cannot be a part of itself')]);
    });

    it('judges a chain on the declaration: a part that was not resolved still cannot be a parent', () => {
        const orphan = component('OrphanComponent', 'lib-orphan', { partOf: 'lib-missing' });
        const child = component('ChildComponent', 'lib-child', { partOf: 'lib-orphan' });
        const { diagnostics } = run([orphan, child], [orphan, child]);

        expect(diagnostics).toEqual([
            expect.stringContaining('no component or directive with @Showcase has the selector "lib-missing"'),
            expect.stringContaining('OrphanComponent is a part itself, and a part cannot have parts; it keeps a page of its own')
        ]);
        expect(child.parentClassName).toBeUndefined();
    });

    it('lists the candidates in scan order when a selector is ambiguous', () => {
        const a = component('AComponent', 'lib-twin');
        const b = component('BComponent', 'lib-twin, [libTwin]');
        const c = component('CComponent', '[libTwin]');
        const part = component('PartComponent', 'lib-part', { partOf: 'lib-twin' });
        const { diagnostics } = run([a, part, b, c], [part]);

        expect(diagnostics).toEqual([expect.stringContaining('"lib-twin" is the selector of AComponent and BComponent;')]);
    });
});
