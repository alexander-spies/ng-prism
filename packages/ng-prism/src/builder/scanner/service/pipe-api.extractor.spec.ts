import path from 'node:path';
import ts from 'typescript';
import type { PipeApi } from '../../../plugin/pipe.types.js';
import type { ApiTypeRef } from '../../../plugin/service.types.js';
import { findDecorator, getDecoratorArgument } from '../ast-utils.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { buildExportIndex, type ExportIndex } from './export-index.js';
import { extractPipeApi } from './pipe-api.extractor.js';
import { readSetupRefs } from './setup.reader.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'pipes');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('pipe API extractor', () => {
    let checker: ts.TypeChecker;
    let exportIndex: ExportIndex;
    let classes: Map<string, ts.ClassDeclaration>;
    let timeAgo: PipeApi;

    beforeAll(() => {
        const result = resolveEntryPointExports([{ entryFile: path.join(FIXTURES_DIR, 'pipes-api.ts'), importPath: 'fixture/pipes' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exportIndex = buildExportIndex(result.entries, checker);
        classes = new Map(
            result.entries[0].exports.flatMap((sym) => {
                const decl = (sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym).declarations?.find(ts.isClassDeclaration);

                return decl ? [[sym.name, decl] as const] : [];
            })
        );
        timeAgo = extract('TimeAgoPipe');
    });

    function extract(className: string): PipeApi {
        const decl = classes.get(className);
        const decorator = decl && findDecorator(decl, 'Showcase');
        const arg = decorator && getDecoratorArgument(decorator);

        if (!decl || !arg) throw new Error(`fixture class ${className} has no @Showcase`);

        const setupRefs = readSetupRefs(arg, className, checker, exportIndex, (message) => {
            throw new Error(message);
        });

        return extractPipeApi(decl, setupRefs, checker, exportIndex);
    }

    it('reads the description and tags of the class', () => {
        expect(timeAgo.description).toBe('Says how long ago a moment was, such as "3 minutes ago".');
        expect(timeAgo.tags.since).toBe('2.0.0');
    });

    it('lists each overload signature of transform', () => {
        const [short, long] = timeAgo.transform;

        expect(timeAgo.transform).toHaveLength(2);
        expect(timeAgo.transform.map((m) => m.name)).toEqual(['transform', 'transform']);
        expect(short.params.map((p) => p.name)).toEqual(['value']);
        expect(short.description).toBe('Formats a moment in the style the application configured.');
        expect(long.params.map((p) => p.name)).toEqual(['value', 'options']);
        expect(long.description).toBe('Formats a moment in a style of its own.');
        expect(long.params[1]).toMatchObject({ optional: false, description: 'Replaces the configured options for this call.' });
        // The implementation's `= {}` is not part of what a template calls.
        expect(long.params[1]).not.toHaveProperty('defaultValue');
    });

    it.each(['ImplementationDocumentedPipe', 'FirstDocumentedPipe'])("gives an undocumented overload the docs of the same class's transform (%s)", (className) => {
        const { transform } = extract(className);

        expect(transform.map((m) => m.params[0].type.text)).toEqual(['string', 'null']);

        for (const signature of transform) {
            expect(signature.description).toBe('Cuts a text down to a number of characters.');
            expect(signature.params.map((p) => p.description)).toEqual(['The text to cut.', 'How many characters to keep.']);
        }
    });

    it('inherits transform docs from a base class with source', () => {
        const [signature] = extract('InheritedTransformPipe').transform;

        expect(extract('InheritedTransformPipe').transform).toHaveLength(1);
        expect(signature.params.map((p) => p.name)).toEqual(['value', 'length', 'ellipsis']);
        expect(signature.description).toBe('Cuts a text down to a number of characters.');
        expect(signature.params.map((p) => p.description)).toEqual(['The text to cut.', 'How many characters to keep.', undefined]);
    });

    it('reads transform from a declaration-only base', () => {
        const api = extract('LocalDatePipe');
        const refs: ApiTypeRef[] = api.transform.flatMap((m) => [m.returnType, ...m.params.map((p) => p.type)]);

        expect(api.transform.length).toBeGreaterThanOrEqual(1);
        expect(api.transform[0].params[0].name).toBe('value');
        expect(api.transform[0].params[0].description).toMatch(/^The date expression/);
        // The class's own description: the one of DatePipe is not inherited.
        expect(api.description).toMatch(/^The `date` pipe under a name of the library's own/);
        expect(api.types).toEqual([]);
        expect(refs.filter((ref) => ref.links)).toEqual([]);
    });

    it('ignores other members', () => {
        const api = extract('ExtraMembersPipe');

        expect(Object.keys(api).sort()).toEqual(['setup', 'tags', 'transform', 'types']);
        expect(api.transform.map((m) => m.params.map((p) => p.name))).toEqual([['value', 'term']]);
        expect(api.types.map((t) => t.name)).not.toContain('HighlightMatch');
    });

    it('collects types and setup', () => {
        const names = timeAgo.types.map((t) => t.name);
        const [provide] = timeAgo.setup;

        expect(names).toEqual(expect.arrayContaining(['TimeAgoOptions', 'TimeAgoStyle']));
        expect(timeAgo.transform[1].params[1].type).toEqual({ text: 'Partial<TimeAgoOptions>', links: ['TimeAgoOptions'] });
        expect(timeAgo.setup).toHaveLength(1);
        expect(provide).toMatchObject({ name: 'provideTimeAgo', kind: 'function', importPath: 'fixture/pipes' });
        expect(provide.config!.map((p) => p.name)).toEqual(['style']);
        expect(provide.config![0].tags.default).toBe("'long'");
        expect(provide.config![0].type).toEqual({ text: 'TimeAgoStyle', links: ['TimeAgoStyle'] });
    });
});
