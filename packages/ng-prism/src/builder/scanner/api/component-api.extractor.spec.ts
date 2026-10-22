import path from 'node:path';
import ts from 'typescript';
import type { ComponentApi } from '../../../plugin/plugin.types.js';
import type { ApiTypeDoc } from '../../../plugin/service.types.js';
import { getClassHierarchy } from '../class-hierarchy.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { extractInputs, extractOutputs } from '../input.extractor.js';
import { extractComponentApi } from './component-api.extractor.js';
import { buildExportIndex } from './export-index.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'component-api');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('component API extractor', () => {
    let tabs: ComponentApi;
    let field: ComponentApi;

    beforeAll(() => {
        const result = resolveEntryPointExports(
            [
                { entryFile: path.join(FIXTURES_DIR, 'component-api.ts'), importPath: 'fixture/components' },
                { entryFile: path.join(FIXTURES_DIR, 'component-api-types.ts'), importPath: 'fixture/types' }
            ],
            compilerOptions
        );
        const checker = result.program.getTypeChecker();
        const exportIndex = buildExportIndex(result.entries, checker);
        const extract = (className: string): ComponentApi => {
            const symbol = result.entries[0].exports.find((sym) => sym.name === className);
            const classDecl = symbol && (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol).declarations?.find(ts.isClassDeclaration);

            if (!classDecl) throw new Error(`fixture class ${className} is not exported`);

            const hierarchy = getClassHierarchy(classDecl, checker);

            return extractComponentApi(
                classDecl,
                extractInputs(classDecl, checker, hierarchy),
                extractOutputs(classDecl, checker, hierarchy),
                hierarchy,
                checker,
                exportIndex
            );
        };

        tabs = extract('FixtureTabsComponent');
        field = extract('FixtureNumberFieldDirective');
    });

    function typeOf(api: ComponentApi, name: string): ApiTypeDoc {
        const type = api.types.find((t) => t.name === name);

        if (!type) throw new Error(`${name} is not among the types`);
        return type;
    }

    it('types each input by member name, as written, with links', () => {
        expect(tabs.inputTypes).toEqual({
            variant: { text: 'FixtureVariant', links: ['FixtureVariant'] },
            items: { text: 'FixtureTab[]', links: ['FixtureTab'] },
            size: { text: 'FixtureSize', links: ['FixtureSize'] },
            active: { text: 'string' },
            hidden: { text: 'FixtureInternal | null' }
        });
    });

    it('reads the payload of each output', () => {
        expect(tabs.outputTypes).toEqual({ selected: { text: 'FixtureTab', links: ['FixtureTab'] }, closed: { text: 'void' } });
    });

    it('adds the change output of a model', () => {
        expect(tabs.modelChanges).toEqual([{ input: 'active', event: 'activeChange', type: { text: 'string' } }]);
    });

    it('lists documented methods only', () => {
        expect(tabs.methods.map((m) => m.name)).toEqual(['focusTab']);
        expect(tabs.methods[0].params[0]).toMatchObject({ name: 'tab', description: 'The tab to focus', type: { links: ['FixtureTab'] } });
    });

    it('documents the exported types the API reaches, in the order of first reach', () => {
        expect(tabs.types.map((t) => t.name)).toEqual(['FixtureVariant', 'FixtureTab', 'FixtureSize', 'FixtureBadge']);
        expect(typeOf(tabs, 'FixtureTab')).toMatchObject({ importPath: 'fixture/types', reachedFrom: 'type of tabs' });
        expect(typeOf(tabs, 'FixtureBadge').reachedFrom).toBe('via tabs.badge');
    });

    it('reads description and tags of the class, links kept', () => {
        expect(tabs.description).toBe('Tabs for the fixture, see {@link FixtureTab}.');
        expect(tabs.tags).toEqual({ since: '2.0.0', version: '2.1.0', see: ['FixtureTab'] });
    });

    it('instantiates an input of a generic base class', () => {
        expect(field.inputTypes).toEqual({ value: { text: 'number | undefined' } });
        expect(field.modelChanges).toEqual([{ input: 'value', event: 'valueChange', type: { text: 'number | undefined' } }]);
        expect(field.methods.map((m) => m.name)).toEqual(['clear']);
    });
});
