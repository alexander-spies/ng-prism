import path from 'node:path';
import ts from 'typescript';
import { findDecorator, getDecoratorArgument } from '../ast-utils.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { buildExportIndex, type ExportIndex } from './export-index.js';
import { readSetupRefs } from './setup.reader.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'services');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

function fixtureFile(name: string): string {
    return path.relative(process.cwd(), path.join(FIXTURES_DIR, name));
}

describe('setup reader', () => {
    let checker: ts.TypeChecker;
    let entries: ReturnType<typeof resolveEntryPointExports>['entries'];
    let exportIndex: ExportIndex;
    let classes: Map<string, ts.ClassDeclaration>;

    beforeAll(() => {
        const result = resolveEntryPointExports(
            [
                { entryFile: path.join(FIXTURES_DIR, 'services-api.ts'), importPath: 'fixture/toast' },
                { entryFile: path.join(FIXTURES_DIR, 'colors-api.ts'), importPath: 'fixture/colors' },
                { entryFile: path.join(FIXTURES_DIR, 'mixed-setup.service.ts'), importPath: 'fixture/mixed' }
            ],
            compilerOptions
        );

        checker = result.program.getTypeChecker();
        entries = result.entries;
        exportIndex = buildExportIndex(entries, checker);
        classes = new Map(
            entries.flatMap(({ exports }) =>
                exports.flatMap((sym) => {
                    const decl = (sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym).declarations?.find(ts.isClassDeclaration);

                    return decl ? [[sym.name, decl] as const] : [];
                })
            )
        );
    });

    function read(className: string, index: ExportIndex = exportIndex) {
        const decl = classes.get(className);
        const decorator = decl && findDecorator(decl, 'Showcase');
        const arg = decorator && getDecoratorArgument(decorator);

        if (!arg) throw new Error(`fixture class ${className} has no @Showcase`);

        const messages: string[] = [];
        const refs = readSetupRefs(arg, className, checker, index, (message) => messages.push(message));

        return { refs, messages };
    }

    describe('buildExportIndex', () => {
        it('maps the symbols of every entry point to its import path', () => {
            const symbolOf = (entry: number, name: string) => {
                const sym = entries[entry].exports.find((s) => s.name === name)!;

                return sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
            };

            expect(exportIndex.get(symbolOf(0, 'provideToast'))).toBe('fixture/toast');
            expect(exportIndex.get(symbolOf(1, 'FeedbackColor'))).toBe('fixture/colors');
        });

        it('prefers the first entry point', () => {
            const { exports } = entries[0];
            const index = buildExportIndex(
                [
                    { exports, importPath: 'fixture/secondary' },
                    { exports, importPath: 'fixture/toast' }
                ],
                checker
            );
            const provideToast = exports.find((s) => s.name === 'provideToast')!;

            expect(index.get(checker.getAliasedSymbol(provideToast))).toBe('fixture/secondary');
        });
    });

    describe('readSetupRefs', () => {
        it('reads functions and tokens in order', () => {
            const { refs, messages } = read('ToastService');

            expect(refs).toMatchObject([
                { name: 'provideToast', kind: 'function', importPath: 'fixture/toast' },
                { name: 'TOAST_LABELS', kind: 'token', importPath: 'fixture/toast' }
            ]);
            expect(refs[0].declaration.kind).toBe(ts.SyntaxKind.FunctionDeclaration);
            expect(refs[1].declaration.kind).toBe(ts.SyntaxKind.VariableDeclaration);
            expect(messages).toEqual([]);
        });

        it('accepts a block body with a single return', () => {
            const { refs, messages } = read('BlockBodyService');

            expect(refs).toMatchObject([{ name: 'provideToast', kind: 'function' }]);
            expect(messages).toEqual([]);
        });

        it('returns nothing for a service without setup', () => {
            expect(read('RootService')).toEqual({ refs: [], messages: [] });
        });

        it('reports a setup that is not an arrow function', () => {
            const { refs, messages } = read('NotArrowService');

            expect(refs).toEqual([]);
            expect(messages).toHaveLength(1);
            expect(messages[0].startsWith('NotArrowService › setup — "[provideToast]"')).toBe(true);
            expect(messages[0].endsWith('setup was dropped.')).toBe(true);
            expect(messages[0]).toBe(
                `NotArrowService › setup — "[provideToast]" (${fixtureFile('broken-setup.services.ts')}:11:43) ` +
                    'must be an arrow function returning an array literal, e.g. setup: () => [provideX]; setup was dropped.'
            );
        });

        it('reports an entry that is not exported', () => {
            const { refs, messages } = read('UnexportedService');

            expect(refs).toEqual([]);
            expect(messages).toEqual([
                `UnexportedService › setup[0] — "localProvide" (${fixtureFile('broken-setup.services.ts')}:15:48) ` +
                    'is not exported from any library entry point, so the styleguide cannot show where to import it from; it was dropped.'
            ]);
        });

        it('reports an entry that is neither a function nor a token', () => {
            const { refs, messages } = read('NotAFunctionService');

            expect(refs).toEqual([]);
            expect(messages).toEqual([
                `NotAFunctionService › setup[0] — "SOME_STRING" (${fixtureFile('broken-setup.services.ts')}:19:52) ` +
                    'is neither a function nor an InjectionToken; it was dropped.'
            ]);
        });

        it('keeps the valid entries next to the dropped ones', () => {
            const { refs, messages } = read('MixedSetupService');

            expect(refs).toMatchObject([
                { name: 'provideToast', kind: 'function', importPath: 'fixture/toast' },
                { name: 'TOAST_LABELS', kind: 'token', importPath: 'fixture/toast' }
            ]);
            expect(messages.map((m) => m.slice(0, m.indexOf(' ('))).sort()).toEqual([
                'MixedSetupService › setup[1] — "localProvide"',
                'MixedSetupService › setup[2] — "SOME_STRING"'
            ]);
        });

        it('drops an entry that the index does not know, and keeps its neighbours', () => {
            const symbol = entries[0].exports.find((s) => s.name === 'TOAST_LABELS')!;
            const index = new Map(exportIndex);

            index.delete(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);

            const { refs, messages } = read('ToastService', index);

            expect(refs).toMatchObject([{ name: 'provideToast' }]);
            expect(messages).toHaveLength(1);
            expect(messages[0]).toContain('ToastService › setup[1] — "TOAST_LABELS"');
            expect(messages[0]).toContain('is not exported from any library entry point');
        });
    });
});
