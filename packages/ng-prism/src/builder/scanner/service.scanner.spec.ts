import path from 'node:path';
import ts from 'typescript';
import { buildExportIndex } from './api/export-index.js';
import { scanComponents } from './component.scanner.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { scanServices } from './service.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__', 'services');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('scanServices', () => {
    let checker: ts.TypeChecker;
    let entries: ReturnType<typeof resolveEntryPointExports>['entries'];
    let exportIndex: ReturnType<typeof buildExportIndex>;
    let warn: jest.SpyInstance;

    beforeAll(() => {
        const result = resolveEntryPointExports(
            [
                { entryFile: path.join(FIXTURES_DIR, 'services-api.ts'), importPath: 'fixture/toast' },
                { entryFile: path.join(FIXTURES_DIR, 'colors-api.ts'), importPath: 'fixture/colors' }
            ],
            compilerOptions
        );

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
        return scanServices(entries[0].exports, checker, { exportIndex, diagnostics, notices });
    }

    it('scans ToastService into a ScannedService', () => {
        const toast = scan().find((s) => s.className === 'ToastService');

        expect(toast).toMatchObject({
            className: 'ToastService',
            importPath: 'fixture/toast',
            provision: 'auto',
            showcaseConfig: { title: 'Toast Service', category: 'Feedback' }
        });
        expect(toast?.filePath).toMatch(/toast\.service\.ts$/);
        expect(toast?.api.setup).toHaveLength(2);
        expect(toast?.api.methods.map((m) => m.name)).toContain('show');
    });

    it('keeps only the @Showcase fields that apply to a service', () => {
        const toast = scan().find((s) => s.className === 'ToastService');

        expect(Object.keys(toast!.showcaseConfig).sort()).toEqual(['category', 'title']);
    });

    it('reads manual provision from a service that nobody provides', () => {
        const names = new Map(scan().map((s) => [s.className, s.provision]));

        expect(names.get('ManualService')).toBe('manual');
        expect(names.get('AutoService')).toBe('auto');
    });

    it('does not return components', () => {
        const classes = scan().map((s) => s.className);

        expect(classes).not.toContain('SetupOnComponent');
        expect(classes).not.toContain('LegacyPageService');
    });

    it('is the counterpart of scanComponents: a class is in exactly one of the two', () => {
        const components = scanComponents(entries[0].exports, checker, [], new Set()).map((c) => c.className);
        const services = scan().map((s) => s.className);

        expect(services.filter((name) => components.includes(name))).toEqual([]);
    });

    it('resolves a setup function declared and exported in the service file itself', () => {
        const own = scan().find((s) => s.className === 'OwnFileService');

        expect(own?.api.setup[0]).toMatchObject({ name: 'provideOwnFile', kind: 'function', importPath: 'fixture/toast' });
    });

    it('reports what it drops from a setup, and only once however many times the entry point is scanned', () => {
        const diagnostics: string[] = [];

        scan(diagnostics);

        expect(diagnostics).toHaveLength(3);
        expect(diagnostics).toEqual(
            expect.arrayContaining([
                expect.stringContaining('NotArrowService › setup'),
                expect.stringContaining('UnexportedService › setup[0]'),
                expect.stringContaining('NotAFunctionService › setup[0]')
            ])
        );

        scan(diagnostics);

        expect(diagnostics).toHaveLength(3);
        expect(warn).toHaveBeenCalledTimes(3);
    });

    it('keeps a service whose setup was dropped, without the setup', () => {
        const notArrow = scan().find((s) => s.className === 'NotArrowService');

        expect(notArrow?.showcaseConfig.title).toBe('Not an arrow');
        expect(notArrow?.api.setup).toEqual([]);
    });
});
