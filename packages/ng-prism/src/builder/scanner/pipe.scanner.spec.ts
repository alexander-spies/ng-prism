import path, { relative } from 'node:path';
import ts from 'typescript';
import { getDecoratorArgument } from './ast-utils.js';
import { scanComponents } from './component.scanner.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { scanPipes } from './pipe.scanner.js';
import { findAngularCoreDecorator } from './service/angular-decorators.js';
import { buildExportIndex } from './service/export-index.js';
import { scanServices } from './service.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__', 'pipes');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('scanPipes', () => {
    let checker: ts.TypeChecker;
    let entries: ReturnType<typeof resolveEntryPointExports>['entries'];
    let exportIndex: ReturnType<typeof buildExportIndex>;
    let warn: jest.SpyInstance;

    beforeAll(() => {
        const result = resolveEntryPointExports([{ entryFile: path.join(FIXTURES_DIR, 'pipes-api.ts'), importPath: 'fixture/pipes' }], compilerOptions);

        checker = result.program.getTypeChecker();
        entries = result.entries;
        exportIndex = buildExportIndex(entries, checker);
    });

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
    });

    function scan(diagnostics: string[] = [], notices = new Set<string>()) {
        return scanPipes(entries[0].exports, checker, { exportIndex, diagnostics, notices });
    }

    function pipeDecorator(className: string): ts.Decorator {
        const symbol = entries[0].exports.find((sym) => sym.name === className);
        const decl = symbol && (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol).declarations?.find(ts.isClassDeclaration);
        const decorator = decl && findAngularCoreDecorator(decl, 'Pipe', checker);

        if (!decorator) throw new Error(`fixture class ${className} has no @Pipe`);

        return decorator;
    }

    /** Where a node is, as a diagnostic names it. */
    function locationOf(node: ts.Node): string {
        const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

        return `${relative(process.cwd(), node.getSourceFile().fileName)}:${line + 1}:${character + 1}`;
    }

    /** Where the `@Pipe` of a fixture class is. */
    function pipeLocation(className: string): string {
        return locationOf(pipeDecorator(className));
    }

    /** Where the `name` property in the `@Pipe({ … })` of a fixture class is. */
    function pipeNameLocation(className: string): string {
        const arg = getDecoratorArgument(pipeDecorator(className));
        const name = arg && ts.isObjectLiteralExpression(arg) ? arg.properties.find((prop) => prop.name?.getText() === 'name') : undefined;

        if (!name) throw new Error(`fixture class ${className} has no name in its @Pipe literal`);

        return locationOf(name);
    }

    it('scans TimeAgoPipe into a ScannedPipe', () => {
        const timeAgo = scan().find((p) => p.className === 'TimeAgoPipe');

        expect(timeAgo).toMatchObject({
            className: 'TimeAgoPipe',
            pipeName: 'timeAgo',
            pure: true,
            importPath: 'fixture/pipes',
            showcaseConfig: { title: 'Time ago', category: 'Formatting' }
        });
        expect(timeAgo?.filePath).toMatch(/time-ago\.pipe\.ts$/);
        expect(timeAgo?.api.transform).toHaveLength(2);
        expect(timeAgo?.api.setup.map((entry) => entry.name)).toEqual(['provideTimeAgo']);
    });

    it('keeps only the service fields of showcaseConfig', () => {
        const timeAgo = scan().find((p) => p.className === 'TimeAgoPipe');

        // `setup` is read into the api and `renderPage` and `variants` do not apply to a pipe.
        expect(Object.keys(timeAgo!.showcaseConfig).sort()).toEqual(['category', 'title']);
    });

    it('reads a pipe that says pure: false as impure', () => {
        const pipes = new Map(scan().map((p) => [p.className, p]));

        expect(pipes.get('ImpurePipe')?.pure).toBe(false);
        expect(pipes.get('StandalonePipe')?.pure).toBe(true);
    });

    it('omits pure when it cannot be read', () => {
        const dynamicPure = scan().find((p) => p.className === 'DynamicPurePipe');

        expect(dynamicPure).toMatchObject({ className: 'DynamicPurePipe', pipeName: 'dynamicPure' });
        expect(dynamicPure).not.toHaveProperty('pure');
    });

    it('keeps a pipe that is also an @Injectable, and a pipe whose component-only fields made it a component out', () => {
        const classes = scan().map((p) => p.className);

        expect(classes).toContain('InjectablePipe');
        expect(classes).not.toContain('LegacyPagePipe');
    });

    it('reports and drops a pipe declared with standalone: false', () => {
        const diagnostics: string[] = [];
        const classes = scan(diagnostics).map((p) => p.className);

        expect(classes).not.toContain('NgModulePipe');
        expect(diagnostics).toContain(
            `NgModulePipe › @Pipe (${pipeLocation('NgModulePipe')}) is declared with standalone: false; ng-prism shows standalone pipes only, so it was dropped.`
        );
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('NgModulePipe › @Pipe'));
    });

    it('reports and drops a pipe whose name cannot be read, pointing at the name', () => {
        const diagnostics: string[] = [];
        const classes = scan(diagnostics).map((p) => p.className);

        expect(classes).not.toContain('DynamicNamePipe');
        expect(diagnostics).toContain(`DynamicNamePipe › @Pipe name (${pipeNameLocation('DynamicNamePipe')}) cannot be evaluated statically, so the pipe was dropped.`);
    });

    it('points at the @Pipe when its argument is no literal with a name', () => {
        const diagnostics: string[] = [];
        const classes = scan(diagnostics).map((p) => p.className);

        expect(classes).not.toContain('DynamicOptionsPipe');
        expect(diagnostics).toContain(`DynamicOptionsPipe › @Pipe name (${pipeLocation('DynamicOptionsPipe')}) cannot be evaluated statically, so the pipe was dropped.`);
    });

    it('reports what it drops once, however many times the entry point is scanned', () => {
        const diagnostics: string[] = [];

        scan(diagnostics);
        scan(diagnostics);

        expect(diagnostics.filter((message) => message.startsWith('NgModulePipe'))).toHaveLength(1);
        expect(diagnostics.filter((message) => message.startsWith('DynamicNamePipe'))).toHaveLength(1);
        expect(warn.mock.calls.filter(([message]) => String(message).includes('NgModulePipe ›'))).toHaveLength(1);
    });

    it('does not report the component-only fields of a pipe that stays a component', () => {
        const diagnostics: string[] = [];

        scan(diagnostics);

        expect(diagnostics.filter((message) => message.startsWith('LegacyPagePipe') || message.startsWith('NgModulePagePipe'))).toEqual([]);
    });

    it('is a counterpart of scanComponents and scanServices: a class is in exactly one of the three', () => {
        const pipes = scan().map((p) => p.className);
        const components = scanComponents(entries[0].exports, checker, [], new Set()).map((c) => c.className);
        const services = scanServices(entries[0].exports, checker, { exportIndex, diagnostics: [], notices: new Set() }).map((s) => s.className);

        expect(pipes.filter((name) => components.includes(name) || services.includes(name))).toEqual([]);
    });
});
