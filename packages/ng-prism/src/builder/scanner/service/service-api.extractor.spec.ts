import path from 'node:path';
import ts from 'typescript';
import type { ApiTypeDoc, ServiceApi } from '../../../plugin/service.types.js';
import { findDecorator, getDecoratorArgument } from '../ast-utils.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { buildExportIndex, type ExportIndex } from './export-index.js';
import { extractServiceApi } from './service-api.extractor.js';
import { readSetupRefs, type SetupRef } from './setup.reader.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'services');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('service API extractor', () => {
    let checker: ts.TypeChecker;
    let exportIndex: ExportIndex;
    let classes: Map<string, ts.ClassDeclaration>;
    let toast: ServiceApi;

    beforeAll(() => {
        const result = resolveEntryPointExports(
            [
                { entryFile: path.join(FIXTURES_DIR, 'services-api.ts'), importPath: 'fixture/toast' },
                { entryFile: path.join(FIXTURES_DIR, 'colors-api.ts'), importPath: 'fixture/colors' }
            ],
            compilerOptions
        );

        checker = result.program.getTypeChecker();
        exportIndex = buildExportIndex(result.entries, checker);
        classes = new Map(
            result.entries.flatMap(({ exports }) =>
                exports.flatMap((sym) => {
                    const decl = (sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym).declarations?.find(ts.isClassDeclaration);

                    return decl ? [[sym.name, decl] as const] : [];
                })
            )
        );
        toast = extract('ToastService');
    });

    function extract(className: string): ServiceApi {
        const decl = classes.get(className);
        const decorator = decl && findDecorator(decl, 'Showcase');
        const arg = decorator && getDecoratorArgument(decorator);

        if (!decl || !arg) throw new Error(`fixture class ${className} has no @Showcase`);

        const setupRefs = readSetupRefs(arg, className, checker, exportIndex, (message) => {
            throw new Error(message);
        });

        return extractServiceApi(decl, setupRefs, checker, exportIndex);
    }

    function typeOf(api: ServiceApi, name: string): ApiTypeDoc {
        const type = api.types.find((t) => t.name === name);

        if (!type) throw new Error(`${name} is not among the types`);
        return type;
    }

    it('reads the description and tags of the class', () => {
        expect(toast.description).toMatch(/^Shows short messages next to the page\./);
        expect(toast.tags.since).toBe('1.2.0');
    });

    it('collects the types reachable from the public API', () => {
        const names = toast.types.map((t) => t.name);

        expect(names).toEqual(
            expect.arrayContaining(['ToastOptions', 'ToastRef', 'ToastAction', 'FeedbackColor', 'ToastConfig', 'ToastPosition', 'ToastLevel', 'ToastLabels'])
        );

        for (const foreign of ['ToastEntry', 'Signal', 'WritableSignal', 'Provider']) {
            expect(names).not.toContain(foreign);
        }
    });

    it('links type names in signatures', () => {
        const show = toast.methods.find((m) => m.name === 'show')!;

        expect(show.params[0].type).toEqual({ text: 'ToastOptions', links: ['ToastOptions'] });
        expect(show.returnType.links).toEqual(['ToastRef']);
    });

    it('links types inside type arguments', () => {
        const history = toast.methods.find((m) => m.name === 'history')!;
        const configure = toast.methods.find((m) => m.name === 'configure')!;
        const level = toast.properties.find((p) => p.name === 'level')!;

        expect(history.returnType).toEqual({ text: 'readonly ToastRef[]', links: ['ToastRef'] });
        expect(configure.params[0].type).toEqual({ text: 'Partial<ToastConfig>', links: ['ToastConfig'] });
        expect(level.type).toEqual({ text: 'WritableSignal<ToastLevel>', links: ['ToastLevel'] });
    });

    it('leaves the links out of a type without documented types', () => {
        const count = toast.properties.find((p) => p.name === 'count')!;

        expect(count.type).toEqual({ text: 'WritableSignal<number>' });
    });

    it('gives a type from another entry point its own import path', () => {
        expect(typeOf(toast, 'FeedbackColor')).toMatchObject({ importPath: 'fixture/colors', union: ["'info'", "'success'"] });
        expect(typeOf(toast, 'ToastOptions').importPath).toBe('fixture/toast');
    });

    it('stops at recursive types', () => {
        const tree = extract('TreeService');
        const node = typeOf(tree, 'TreeNode');

        expect(tree.types.filter((t) => t.name === 'TreeNode')).toHaveLength(1);
        expect(node.properties!.find((p) => p.name === 'children')!.type.links).toEqual(['TreeNode']);
    });

    it('describes each kind', () => {
        const action = typeOf(toast, 'ToastAction');
        const ref = typeOf(toast, 'ToastRef');

        expect(action).toMatchObject({ id: 'ToastAction', kind: 'interface', description: 'A button inside the toast.' });
        expect(action.properties!.map((p) => p.name)).toEqual(['label', 'handler']);
        expect(ref.kind).toBe('class');
        expect(ref.methods!.map((m) => m.name)).toEqual(['dismiss']);
        expect(typeOf(toast, 'ToastPosition')).toMatchObject({ kind: 'type', union: ["'top-right'", "'bottom-right'"] });
        expect(typeOf(toast, 'ToastLevel')).toMatchObject({
            kind: 'enum',
            members: [
                { name: 'Low', value: "'low'" },
                { name: 'High', value: "'high'" }
            ]
        });
    });

    it('reads @default into the property tags', () => {
        const properties = typeOf(toast, 'ToastOptions').properties!;
        const message = properties.find((p) => p.name === 'message')!;
        const color = properties.find((p) => p.name === 'color')!;

        expect(color.tags.default).toBe("'success'");
        expect(message.optional).toBeUndefined();
        expect(color.optional).toBe(true);
    });

    it('resolves setup config tables', () => {
        const [provide, labels] = toast.setup;

        expect(provide).toMatchObject({ name: 'provideToast', kind: 'function', importPath: 'fixture/toast' });
        expect(provide.description).toBe('Configures how toasts look and behave in the application.');
        expect(provide.tags.example).toHaveLength(1);
        expect(provide.params![0].defaultValue).toBe('{}');
        expect(provide.returnType).toEqual({ text: 'Provider' });
        expect(provide.config!.map((p) => p.name)).toEqual(['position', 'duration']);
        expect(provide.config![0].tags.default).toBe("'bottom-right'");
        expect(provide.config![0].type).toEqual({ text: 'ToastPosition', links: ['ToastPosition'] });

        expect(labels).toMatchObject({ name: 'TOAST_LABELS', kind: 'token', importPath: 'fixture/toast', tokenType: { text: 'InjectionToken<ToastLabels>' } });
        expect(labels.tokenType!.links).toEqual(['ToastLabels']);
        expect(labels.config!.map((p) => p.name)).toEqual(['close']);
        expect(labels.config![0].description).toBe('The accessible name of the close button.');
    });

    it('records where a type was reached', () => {
        expect(typeOf(toast, 'ToastOptions').reachedFrom).toBe('parameter of show()');
        expect(typeOf(toast, 'ToastAction').reachedFrom).toBe('via options.action');
        expect(typeOf(toast, 'ToastRef').reachedFrom).toBe('returned by show()');
    });

    it('lists the types in the order they were first reached', () => {
        const names = toast.types.map((t) => t.name);

        // Directly from the members and the setup first, then what their members reach.
        expect(names.indexOf('ToastOptions')).toBeLessThan(names.indexOf('ToastAction'));
        expect(names.indexOf('ToastLabels')).toBeLessThan(names.indexOf('ToastAction'));
    });

    describe('in a program of its own', () => {
        /** The API of class `Subject` in `subject.ts`, with every other file an entry point of its own named `lib/<file>`. */
        function extractInline(files: Record<string, string>, setup: (decls: Map<string, ts.Declaration>) => SetupRef[] = () => []): ServiceApi {
            const dir = path.join(FIXTURES_DIR, '__inline__');
            const fileNames = new Map(Object.keys(files).map((name) => [path.join(dir, name), name]));
            const host = ts.createCompilerHost(compilerOptions);
            const original = host.getSourceFile.bind(host);
            const exists = host.fileExists.bind(host);
            const directoryExists = host.directoryExists?.bind(host);

            host.getSourceFile = (name, languageVersion, ...rest) => {
                const short = fileNames.get(name);

                return short ? ts.createSourceFile(name, files[short], languageVersion, true) : original(name, languageVersion, ...rest);
            };
            host.fileExists = (name) => fileNames.has(name) || exists(name);
            host.directoryExists = (name) => name === dir || !!directoryExists?.(name);

            const result = resolveEntryPointExports(
                [...fileNames].map(([entryFile, name]) => ({ entryFile, importPath: `lib/${name.replace(/\.ts$/, '')}` })),
                compilerOptions,
                undefined,
                host
            );
            const inlineChecker = result.program.getTypeChecker();
            const index = buildExportIndex(result.entries, inlineChecker);
            const decls = new Map<string, ts.Declaration>();

            for (const sourceFile of result.program.getSourceFiles().filter((f) => fileNames.has(f.fileName))) {
                for (const statement of sourceFile.statements) {
                    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) decls.set(statement.name.text, statement);
                    if (ts.isVariableStatement(statement)) {
                        for (const decl of statement.declarationList.declarations) if (ts.isIdentifier(decl.name)) decls.set(decl.name.text, decl);
                    }
                }
            }

            return extractServiceApi(decls.get('Subject') as ts.ClassDeclaration, setup(decls), inlineChecker, index);
        }

        it('gives the second type of the same name an id with its import path', () => {
            const api = extractInline({
                'a.ts': 'export interface Item { a: string }',
                'b.ts': 'export interface Item { b: string }',
                'subject.ts': [
                    "import type { Item } from './a';",
                    "import type { Item as OtherItem } from './b';",
                    'export class Subject { first(): Item { return { a: "" }; } second(): OtherItem { return { b: "" }; } }'
                ].join('\n')
            });

            expect(api.types.map((t) => [t.id, t.name, t.importPath])).toEqual([
                ['Item', 'Item', 'lib/a'],
                ['Item@lib/b', 'Item', 'lib/b']
            ]);
            expect(api.methods[1].returnType).toEqual({ text: 'OtherItem', links: ['Item@lib/b'] });
        });

        it('leaves out a type marked @internal and one that is not exported', () => {
            const api = extractInline({
                'subject.ts': [
                    '/** @internal */',
                    'export interface Hidden { a: string }',
                    'interface Local { b: string }',
                    'export class Subject { hidden(): Hidden { return { a: "" }; } local(): Local { return { b: "" }; } }'
                ].join('\n')
            });

            expect(api.types).toEqual([]);
            expect(api.methods.map((m) => m.returnType)).toEqual([{ text: 'Hidden' }, { text: 'Local' }]);
        });

        it('follows the inferred type of a member without annotation', () => {
            const api = extractInline({
                'subject.ts': ['export interface Point { x: number }', 'export class Subject { origin() { return [{ x: 0 } as Point]; } }'].join('\n')
            });

            expect(api.methods[0].returnType).toEqual({ text: 'Point[]', links: ['Point'] });
        });

        it('describes object literal type aliases and other type aliases', () => {
            const api = extractInline({
                'subject.ts': [
                    'export interface Detail { code: number }',
                    '/** A box. */',
                    'export type Box = { width: number; detail: Detail };',
                    'export type Handler = (detail: Detail) => void;',
                    'export class Subject { box(): Box { return { width: 1, detail: { code: 0 } }; } on(handler: Handler): void {} }'
                ].join('\n')
            });
            const box = api.types.find((t) => t.name === 'Box')!;
            const handler = api.types.find((t) => t.name === 'Handler')!;

            expect(box).toMatchObject({ kind: 'type', description: 'A box.' });
            expect(box.properties!.map((p) => [p.name, p.type])).toEqual([
                ['width', { text: 'number' }],
                ['detail', { text: 'Detail', links: ['Detail'] }]
            ]);
            expect(handler).toMatchObject({ kind: 'type', text: '(detail: Detail) => void' });
            expect(api.types.find((t) => t.name === 'Detail')!.reachedFrom).toBe('via box().detail');
        });

        it('reads the values of an enum without initializers', () => {
            const api = extractInline({
                'subject.ts': [
                    'export enum Size {',
                    '  /** The small one. */',
                    '  Small,',
                    '  Large',
                    '}',
                    'export class Subject { size(): Size { return Size.Small; } }'
                ].join('\n')
            });

            expect(api.types[0].members).toEqual([
                { name: 'Small', value: '0', description: 'The small one.' },
                { name: 'Large', value: '1' }
            ]);
        });

        it('lists the inherited members of an interface', () => {
            const api = extractInline({
                'subject.ts': [
                    'export interface Base { id: string; load(force?: boolean): void }',
                    'export interface Item extends Base { label: string }',
                    'export class Subject { item(): Item { return null!; } }'
                ].join('\n')
            });
            const item = api.types.find((t) => t.name === 'Item')!;

            expect(item.properties!.map((p) => p.name)).toEqual(['label', 'id']);
            expect(item.methods!.map((m) => [m.name, m.params.map((p) => p.name)])).toEqual([['load', ['force']]]);
        });

        it('unwraps Partial in the config of a setup function and marks its options optional', () => {
            const api = extractInline(
                {
                    'subject.ts': [
                        'export interface Options {',
                        '  /** How long. */',
                        '  duration: number;',
                        '}',
                        '/** Sets it up. */',
                        'export const provideSubject = (options: Partial<Options>) => [];',
                        'export class Subject {}'
                    ].join('\n')
                },
                (decls) => [{ name: 'provideSubject', kind: 'function', declaration: decls.get('provideSubject') as ts.VariableDeclaration, importPath: 'lib/subject' }]
            );

            expect(api.setup[0]).toMatchObject({ name: 'provideSubject', kind: 'function', description: 'Sets it up.' });
            expect(api.setup[0].config).toEqual([{ name: 'duration', type: { text: 'number' }, readonly: false, optional: true, description: 'How long.', tags: {} }]);
        });

        it('reads the config of an optional parameter, and none of a primitive one', () => {
            const api = extractInline(
                {
                    'subject.ts': [
                        'export interface Options { duration: number }',
                        'export function provideSubject(options?: Options): unknown[] { return []; }',
                        'export function provideOther(name: string): unknown[] { return []; }',
                        'export class Subject {}'
                    ].join('\n')
                },
                (decls) =>
                    ['provideSubject', 'provideOther'].map((name) => ({
                        name,
                        kind: 'function',
                        declaration: decls.get(name) as ts.FunctionDeclaration,
                        importPath: 'lib/subject'
                    }))
            );

            expect(api.setup[0].config?.map((p) => p.name)).toEqual(['duration']);
            expect(api.setup[1].config).toBeUndefined();
        });
    });
});
