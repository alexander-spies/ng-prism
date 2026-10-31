import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { extractDocumentedMethods, extractMembers, extractObjectTypeMembers, textOnlyResolver } from './member.extractor.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'services');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('member extractor', () => {
    let checker: ts.TypeChecker;
    let toast: ts.ClassDeclaration;

    beforeAll(() => {
        const result = resolveEntryPointExports([{ entryFile: path.join(FIXTURES_DIR, 'services-api.ts'), importPath: 'fixture/toast' }], compilerOptions);

        checker = result.program.getTypeChecker();

        const symbol = result.entries[0].exports.find((sym) => sym.name === 'ToastService')!;

        toast = (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol).declarations!.find(ts.isClassDeclaration)!;
    });

    function members() {
        return extractMembers(toast, checker, textOnlyResolver(checker));
    }

    it('lists public properties with their types', () => {
        const { properties } = members();
        const count = properties.find((p) => p.name === 'count');
        const isEmpty = properties.find((p) => p.name === 'isEmpty');

        expect(count).toMatchObject({ type: { text: 'WritableSignal<number>' }, readonly: true, description: 'How many toasts are on screen.' });
        expect(isEmpty).toMatchObject({ type: { text: 'boolean' }, readonly: true });
        expect(isEmpty?.description).toBeUndefined();
    });

    it('lists public methods with and without JSDoc', () => {
        const { methods } = members();
        const show = methods.find((m) => m.name === 'show')!;
        const dismissAll = methods.find((m) => m.name === 'dismissAll')!;

        expect(methods.map((m) => m.name)).toEqual(['show', 'dismissAll', 'open', 'history', 'configure', 'reset']);
        expect(show.params[0]).toEqual({ name: 'options', type: { text: 'ToastOptions' }, optional: false, description: 'What to show.' });
        expect(show.returnType.text).toBe('ToastRef');
        expect(show.description).toBe('Puts a toast on screen.');
        expect(dismissAll.params).toEqual([]);
        expect(dismissAll.returnType.text).toBe('void');
        expect(dismissAll.description).toBeUndefined();
        expect(dismissAll.tags).toEqual({});
    });

    it('skips private, underscored, internal, static and lifecycle members', () => {
        const { properties, methods } = members();
        const names = [...properties, ...methods].map((m) => m.name);

        for (const hidden of ['_queue', 'base', '#secret', 'secret', '_internal', 'debug', 'ngOnDestroy', 'create', 'constructor']) {
            expect(names).not.toContain(hidden);
        }
    });

    it('reads tags', () => {
        const open = members().methods.find((m) => m.name === 'open')!;

        expect(open.tags.deprecated).toBe('Use show().');
        expect(open.params[0]).toEqual({ name: 'message', type: { text: 'string' }, optional: false });
    });

    it('takes a member of the base class that the class does not declare', () => {
        const reset = members().methods.find((m) => m.name === 'reset');

        expect(reset).toMatchObject({ description: 'Empties the queue and closes what is on screen.', returnType: { text: 'void' } });
    });

    it('lets the class win over a base class that declares the same name', () => {
        const shows = members().methods.filter((m) => m.name === 'show');

        expect(shows).toHaveLength(1);
        expect(shows[0].description).toBe('Puts a toast on screen.');
    });

    it('asks the resolver where a type was reached from', () => {
        const reached: string[] = [];
        const resolver = textOnlyResolver(checker);

        extractMembers(toast, checker, {
            ref(typeNode, type, reachedFrom) {
                reached.push(reachedFrom);

                return resolver.ref(typeNode, type, reachedFrom);
            }
        });

        expect(reached).toEqual(
            expect.arrayContaining([
                'type of count',
                'type of isEmpty',
                'parameter of show()',
                'returned by show()',
                'returned by dismissAll()',
                'parameter of open()',
                'returned by reset()'
            ])
        );
    });

    describe('declaration shapes', () => {
        /** Class `Subject` in a source text, checked in a program of its own. */
        function compile(source: string): { decl: ts.ClassDeclaration; checker: ts.TypeChecker } {
            const fileName = path.join(FIXTURES_DIR, '__inline__.ts');
            const host = ts.createCompilerHost(compilerOptions);
            const original = host.getSourceFile.bind(host);

            host.getSourceFile = (name, languageVersion, ...rest) =>
                name === fileName ? ts.createSourceFile(name, source, languageVersion, true) : original(name, languageVersion, ...rest);
            host.fileExists = (
                (exists) => (name: string) =>
                    name === fileName || exists(name)
            )(host.fileExists.bind(host));

            const program = ts.createProgram([fileName], compilerOptions, host);
            const decl = program
                .getSourceFile(fileName)!
                .statements.filter(ts.isClassDeclaration)
                .find((c) => c.name?.text === 'Subject')!;

            return { decl, checker: program.getTypeChecker() };
        }

        /** Members of `Subject` in a source text. */
        function extract(source: string) {
            const { decl, checker: inlineChecker } = compile(source);

            return extractMembers(decl, inlineChecker, textOnlyResolver(inlineChecker));
        }

        it('reads optional, rest and defaulted parameters', () => {
            const { methods } = extract(`class Subject { run(a?: string, b = 5, c: { x: number } = { x: 1 }, ...rest: string[]): void {} }`);

            expect(methods[0].params).toEqual([
                { name: 'a', type: { text: 'string' }, optional: true },
                { name: 'b', type: { text: 'number' }, optional: true, defaultValue: '5' },
                { name: 'c', type: { text: '{ x: number }' }, optional: true, defaultValue: '{ x: 1 }' },
                { name: 'rest', type: { text: 'string[]' }, optional: false, rest: true }
            ]);
        });

        it('normalizes the whitespace of an annotation', () => {
            const { properties } = extract(`class Subject { value: {\n    a: string;\n    b: number;\n} = { a: '', b: 0 }; }`);

            expect(properties[0].type.text).toBe('{ a: string; b: number; }');
        });

        it('reads a getter and setter pair as one writable property', () => {
            const { properties } = extract(
                `class Subject {\n  /** The size. */\n  get size(): number { return 1; }\n  set size(value: number) {}\n  get label(): string { return ''; }\n}`
            );

            expect(properties.map((p) => [p.name, p.readonly, p.description])).toEqual([
                ['size', false, 'The size.'],
                ['label', true, undefined]
            ]);
        });

        it('reads a setter-only property from the parameter', () => {
            const { properties } = extract(`class Subject { set mode(value: 'a' | 'b') {} }`);

            expect(properties[0]).toMatchObject({ name: 'mode', readonly: false, type: { text: "'a' | 'b'" } });
        });

        it('marks an optional property', () => {
            const { properties } = extract(`class Subject { hint?: string; }`);

            expect(properties[0]).toMatchObject({ name: 'hint', optional: true, type: { text: 'string' } });
        });

        it('lists each overload signature of a method, not the implementation', () => {
            const { methods } = extract(
                [
                    'class Subject {',
                    '  /** Finds one. */',
                    '  find(id: string): string;',
                    '  find(id: number): string;',
                    '  find(id: string | number): string { return String(id); }',
                    '}'
                ].join('\n')
            );

            expect(methods.map((m) => m.params.map((p) => p.type.text))).toEqual([['string'], ['number']]);
            expect(methods.every((m) => m.name === 'find' && m.description === 'Finds one.')).toBe(true);
        });

        it('gives every overload the docs of a documented implementation', () => {
            const { methods } = extract(
                [
                    'class Subject {',
                    '  show(message: string): void;',
                    '  show(config: { text: string }): void;',
                    '  /**',
                    '   * Shows a toast.',
                    '   * @since 2.0',
                    '   */',
                    '  show(arg: string | { text: string }): void {}',
                    '}'
                ].join('\n')
            );

            expect(methods.map((m) => m.params[0].name)).toEqual(['message', 'config']);
            expect(methods.map((m) => [m.description, m.tags.since])).toEqual([
                ['Shows a toast.', '2.0'],
                ['Shows a toast.', '2.0']
            ]);
        });

        it("keeps an overload's tags to its own doc block", () => {
            const { methods } = extract(
                [
                    'class Subject {',
                    '  /**',
                    '   * Finds by name.',
                    '   * @deprecated Use the id.',
                    '   */',
                    '  find(name: string): string;',
                    '  find(id: number): string;',
                    '  find(arg: string | number): string { return String(arg); }',
                    '}'
                ].join('\n')
            );

            expect(methods.map((m) => [m.description, m.tags.deprecated])).toEqual([
                ['Finds by name.', 'Use the id.'],
                ['Finds by name.', undefined]
            ]);
        });

        it('lists each overload of an interface method', () => {
            const { decl, checker: inlineChecker } = compile(
                ['interface Finder {', '  /** Finds one. */', '  find(id: string): string;', '  find(id: number): string;', '}', 'class Subject {}'].join('\n')
            );
            const finder = decl.getSourceFile().statements.find(ts.isInterfaceDeclaration)!;
            const { methods } = extractObjectTypeMembers(inlineChecker.getTypeAtLocation(finder), inlineChecker, textOnlyResolver(inlineChecker));

            expect(methods.map((m) => [m.params[0].type.text, m.description])).toEqual([
                ['string', 'Finds one.'],
                ['number', 'Finds one.']
            ]);
        });

        it('lists every overload of a documented component method', () => {
            const { decl, checker: inlineChecker } = compile(
                [
                    'class Subject {',
                    '  /** Opens a panel. */',
                    '  open(id: string): void;',
                    '  open(index: number): void;',
                    '  open(arg: string | number): void {}',
                    '  close(): void {}',
                    '}'
                ].join('\n')
            );

            const methods = extractDocumentedMethods(decl, inlineChecker, textOnlyResolver(inlineChecker));

            expect(methods.map((m) => `${m.name}(${m.params[0]?.name})`)).toEqual(['open(id)', 'open(index)']);
        });

        it('lets an excluded member of the class hide the base class member', () => {
            const { methods } = extract(
                ['class Base { hidden(): void {} shown(): void {} }', 'class Subject extends Base {', '  /** @internal */', '  hidden(): void {}', '}'].join('\n')
            );

            expect(methods.map((m) => m.name)).toEqual(['shown']);
        });

        it('lets a member without docs keep the docs of the base member it redeclares', () => {
            const { properties, methods } = extract(
                [
                    'class Base {',
                    '  /** The size. */',
                    '  size = 1;',
                    '  /**',
                    '   * Loads it.',
                    '   *',
                    '   * @param id - The id.',
                    '   * @since 1.0.0',
                    '   */',
                    '  load(id: string): void {}',
                    '}',
                    'class Subject extends Base {',
                    '  override size = 2;',
                    '  override load(id: string, force = false): void {}',
                    '}'
                ].join('\n')
            );

            expect(properties).toEqual([{ name: 'size', type: { text: 'number' }, readonly: false, description: 'The size.', tags: {} }]);
            expect(methods).toEqual([
                {
                    name: 'load',
                    params: [
                        { name: 'id', type: { text: 'string' }, optional: false, description: 'The id.' },
                        { name: 'force', type: { text: 'boolean' }, optional: true, defaultValue: 'false' }
                    ],
                    returnType: { text: 'void' },
                    description: 'Loads it.',
                    tags: { since: '1.0.0' }
                }
            ]);
        });

        it('extractDocumentedMethods leaves out undocumented methods and keeps inherited docs', () => {
            const { decl, checker: inlineChecker } = compile(
                [
                    'class Base {',
                    '  /** Loads it. */',
                    '  load(id: string): void {}',
                    '  /** Saves it. */',
                    '  save(): void {}',
                    '  plain(): void {}',
                    '}',
                    'class Subject extends Base {',
                    '  override load(id: string): void {}',
                    '  own(): void {}',
                    '  /** @internal */',
                    '  hidden(): void {}',
                    '}'
                ].join('\n')
            );
            const methods = extractDocumentedMethods(decl, inlineChecker, textOnlyResolver(inlineChecker));

            expect(methods.map((m) => [m.name, m.description])).toEqual([
                ['load', 'Loads it.'],
                ['save', 'Saves it.']
            ]);
        });

        it('takes the docs from the nearest base class that has them', () => {
            const { methods } = extract(
                [
                    'class A {',
                    '  /** From A. */',
                    '  load(): void {}',
                    '}',
                    'class B extends A {',
                    '  override load(): void {}',
                    '}',
                    'class Subject extends B {',
                    '  override load(): void {}',
                    '}'
                ].join('\n')
            );

            expect(methods[0].description).toBe('From A.');
        });

        it('lets a member with docs of its own hide the docs of the base member', () => {
            const { methods } = extract(
                [
                    'class Base {',
                    '  /** Base. @since 1.0.0 */',
                    '  load(): void {}',
                    '}',
                    'class Subject extends Base {',
                    '  /** Own. */',
                    '  override load(): void {}',
                    '}'
                ].join('\n')
            );

            expect(methods[0]).toMatchObject({ description: 'Own.', tags: {} });
        });

        it('lets a static member hide nothing', () => {
            const { methods } = extract(`class Base { build(): void {} }\nclass Subject extends Base { static build(): void {} }`);

            expect(methods.map((m) => m.name)).toEqual(['build']);
        });

        it('follows the whole chain of base classes', () => {
            const { methods } = extract(`class A { fromA(): void {} }\nclass B extends A { fromB(): void {} }\nclass Subject extends B { own(): void {} }`);

            expect(methods.map((m) => m.name)).toEqual(['own', 'fromB', 'fromA']);
        });

        it('lists constructor parameter properties where the constructor sits', () => {
            const { properties, methods } = extract(
                [
                    "class Base { label = ''; }",
                    'class Subject extends Base {',
                    '  first = 1;',
                    '  /**',
                    '   * Makes one.',
                    '   *',
                    '   * @param id - The id.',
                    '   * @param count How many.',
                    '   */',
                    "  constructor(public readonly id: string, protected secret: string, private hidden: number, override label = 'x', readonly count?: number, plain = 2) {",
                    '    super();',
                    '  }',
                    '  last(): void {}',
                    '}'
                ].join('\n')
            );

            expect(properties).toEqual([
                { name: 'first', type: { text: 'number' }, readonly: false, tags: {} },
                { name: 'id', type: { text: 'string' }, readonly: true, description: 'The id.', tags: {} },
                { name: 'label', type: { text: 'string' }, readonly: false, tags: {} },
                { name: 'count', type: { text: 'number' }, readonly: true, optional: true, description: 'How many.', tags: {} }
            ]);
            expect(methods.map((m) => m.name)).toEqual(['last']);
        });

        it('takes constructor parameter properties from a base class', () => {
            const { properties } = extract(['class Base {', '  constructor(readonly id: string) {}', '}', 'class Subject extends Base {', '  own = 1;', '}'].join('\n'));

            expect(properties.map((p) => [p.name, p.readonly])).toEqual([
                ['own', false],
                ['id', true]
            ]);
        });

        it('prefers the @param text of a parameter property over the docs of the base member it redeclares', () => {
            const { properties } = extract(
                [
                    'class Base {',
                    '  /** From the base. */',
                    "  label = '';",
                    '}',
                    'class Subject extends Base {',
                    '  /** @param label Own text. */',
                    '  constructor(override readonly label: string) { super(); }',
                    '}'
                ].join('\n')
            );

            expect(properties).toEqual([{ name: 'label', type: { text: 'string' }, readonly: true, description: 'Own text.', tags: {} }]);
        });

        it('skips the this parameter', () => {
            const { methods } = extract(`class Subject { run(this: Subject, value: string): void {} }`);

            expect(methods[0].params.map((p) => p.name)).toEqual(['value']);
        });

        it('keeps abstract members of an abstract class', () => {
            const { methods } = extract(`abstract class Subject { abstract load(): Promise<void>; }`);

            expect(methods[0]).toMatchObject({ name: 'load', returnType: { text: 'Promise<void>' } });
        });
    });
});
