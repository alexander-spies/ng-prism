import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import ts from 'typescript';
import { createScanner } from './scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

describe('createScanner', () => {
    const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
    const entryPoints = [{ entryFile, importPath: 'fixture' }];

    it('should scan the full pipeline from entry point to manifest', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();

        expect(result.components).toHaveLength(9);
    });

    it('should produce correct ButtonComponent data', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();
        const button = result.components.find((c) => c.className === 'ButtonComponent')!;

        expect(button).toBeDefined();
        expect(button.showcaseConfig.title).toBe('Button');
        expect(button.showcaseConfig.category).toBe('Inputs');
        expect(button.showcaseConfig.variants).toHaveLength(2);
        expect(button.inputs).toHaveLength(5);
        expect(button.outputs).toHaveLength(2);
        expect(button.componentMeta.selector).toBe('my-button');
        expect(button.componentMeta.standalone).toBe(true);

        const variant = button.inputs.find((i) => i.name === 'variant')!;

        expect(variant.type).toBe('union');
        expect(variant.values).toEqual(['primary', 'secondary', 'danger']);
        expect(variant.defaultValue).toBe('primary');
        expect(variant.doc).toBe('Visual appearance of the button');

        const disabled = button.inputs.find((i) => i.name === 'disabled')!;

        expect(disabled.type).toBe('boolean');
        expect(disabled.defaultValue).toBe(false);

        const clicked = button.outputs.find((o) => o.name === 'clicked')!;

        expect(clicked.doc).toBe('Click event');
    });

    it('should produce correct CardComponent data', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();
        const card = result.components.find((c) => c.className === 'CardComponent')!;

        expect(card).toBeDefined();
        expect(card.showcaseConfig.title).toBe('Card');
        expect(card.showcaseConfig.category).toBe('Layout');
        expect(card.inputs).toHaveLength(2);
        expect(card.outputs).toHaveLength(0);
    });

    it('should not include non-Showcase components', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();
        const names = result.components.map((c) => c.className);

        expect(names).not.toContain('NoShowcaseComponent');
    });

    it('should accept custom compiler options', () => {
        const scanner = createScanner({
            entryPoints,
            compilerOptions: { strict: false }
        });
        const result = scanner.scan();

        expect(result.components).toHaveLength(9);
    });

    it('should produce correct HighlightDirective data', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();
        const highlight = result.components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight).toBeDefined();
        expect(highlight.showcaseConfig.title).toBe('Highlight');
        expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
        expect(highlight.componentMeta.isDirective).toBe(true);
        expect(highlight.componentMeta.selector).toBe('[appHighlight]');
        expect(highlight.inputs).toHaveLength(1);
        expect(highlight.outputs).toHaveLength(1);
    });

    it('should tag every scanned component with its entry-point importPath', () => {
        const scanner = createScanner({ entryPoints });
        const result = scanner.scan();

        expect(result.components.length).toBeGreaterThan(0);
        for (const c of result.components) {
            expect(c.importPath).toBe('fixture');
        }
    });

    it('should not read unchanged source files again on the next scan', () => {
        const scanner = createScanner({ entryPoints });

        scanner.scan();

        const readFile = jest.spyOn(ts.sys, 'readFile');

        try {
            scanner.scan();

            const sourceReads = readFile.mock.calls.map(([file]) => file).filter((file) => file.endsWith('.ts'));

            expect(sourceReads).toEqual([]);
        } finally {
            readFile.mockRestore();
        }
    });

    it('should produce the same manifest on repeated scans when files are unchanged', () => {
        const scanner = createScanner({ entryPoints });

        const first = scanner.scan();
        const second = scanner.scan();

        expect(second.components).toHaveLength(first.components.length);
        expect(second.components.map((c) => c.className)).toEqual(first.components.map((c) => c.className));
    });

    it('should dedupe a component re-exported by multiple entry points', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            const scanner = createScanner({
                entryPoints: [
                    {
                        entryFile: path.join(FIXTURES_DIR, 'entry-a.ts'),
                        importPath: 'lib/a'
                    },
                    {
                        entryFile: path.join(FIXTURES_DIR, 'entry-b.ts'),
                        importPath: 'lib/b'
                    }
                ]
            });
            const result = scanner.scan();

            const buttons = result.components.filter((c) => c.className === 'ButtonComponent');

            expect(buttons).toHaveLength(1);
            // First occurrence wins, so importPath should be 'lib/a'
            expect(buttons[0].importPath).toBe('lib/a');
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('exported by multiple entry points'));
        } finally {
            warn.mockRestore();
        }
    });

    describe('services', () => {
        const servicesDir = path.join(FIXTURES_DIR, 'services');
        const apiEntry = path.join(servicesDir, 'services-api.ts');
        const barrelEntry = path.join(servicesDir, 'services-barrel.ts');
        let warn: jest.SpyInstance;

        beforeEach(() => {
            warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        });

        afterEach(() => {
            warn.mockRestore();
        });

        it('scans the services of an entry point next to its components', () => {
            const result = createScanner({ entryPoints: [{ entryFile: apiEntry, importPath: 'lib/toast' }] }).scan();
            const toast = result.services.find((s) => s.className === 'ToastService');

            expect(toast?.importPath).toBe('lib/toast');
            expect(toast?.api.setup.map((entry) => entry.importPath)).toEqual(['lib/toast', 'lib/toast']);
        });

        it('leaves services out of the components, and components out of the services', () => {
            const result = createScanner({ entryPoints: [{ entryFile: apiEntry, importPath: 'lib/toast' }] }).scan();

            expect(result.components.map((c) => c.className)).not.toContain('ToastService');
            expect(result.services.map((s) => s.className)).not.toContain('SetupOnComponent');
        });

        it('returns no services for a library without any', () => {
            expect(createScanner({ entryPoints }).scan().services).toEqual([]);
        });

        it('dedupes a service exported by a secondary and the primary entry point', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/toast' },
                    { entryFile: barrelEntry, importPath: 'lib', primary: true }
                ]
            }).scan();
            const toasts = result.services.filter((s) => s.className === 'ToastService');

            expect(toasts).toHaveLength(1);
            expect(toasts[0].importPath).toBe('lib/toast');
            expect(result.components.map((c) => c.className)).not.toContain('ToastService');
            expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('multiple entry points'));
        });

        it('warns about a service two secondary entry points export, and keeps the first', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/toast' },
                    { entryFile: barrelEntry, importPath: 'lib/barrel' }
                ]
            }).scan();
            const toasts = result.services.filter((s) => s.className === 'ToastService');

            expect(toasts).toHaveLength(1);
            expect(toasts[0].importPath).toBe('lib/toast');
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('ToastService is exported by multiple entry points'));
        });

        it('imports a setup entry from the entry point that exports it, not from the one that scans the service', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: barrelEntry, importPath: 'lib' },
                    { entryFile: apiEntry, importPath: 'lib/toast', primary: true }
                ]
            }).scan();
            const toast = result.services.find((s) => s.className === 'ToastService');

            expect(toast?.importPath).toBe('lib');
            expect(toast?.api.setup.map((entry) => entry.importPath)).toEqual(['lib/toast', 'lib/toast']);
        });

        it('collects what it drops from a service once, even when several entry points export it', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/a' },
                    { entryFile: apiEntry, importPath: 'lib/b' }
                ]
            }).scan();

            expect(result.diagnostics.filter((message) => message.startsWith('UnexportedService'))).toHaveLength(1);
            expect(new Set(result.diagnostics).size).toBe(result.diagnostics.length);
        });

        it('only counts the services when told not to read them, once each however many entry points export them', () => {
            const scanner = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/toast' },
                    { entryFile: barrelEntry, importPath: 'lib', primary: true }
                ]
            });
            const read = scanner.scan();
            const counted = scanner.scan({ services: false });

            expect(read.unread.services).toBe(0);
            expect(counted.services).toEqual([]);
            expect(counted.unread.services).toBe(read.services.length);
            expect(counted.diagnostics.filter((message) => message.startsWith('UnexportedService'))).toEqual([]);
            expect(counted.components.map((c) => c.className)).toEqual(read.components.map((c) => c.className));
        });
    });

    it('leaves the API of the components out when told to', () => {
        const scanner = createScanner({ entryPoints });

        expect(scanner.scan().components.every((c) => c.api !== undefined)).toBe(true);
        expect(scanner.scan({ componentApi: false }).components.every((c) => c.api === undefined)).toBe(true);
    });

    describe('compositions', () => {
        const compositionDir = path.join(FIXTURES_DIR, 'composition');
        let warnSpy: jest.SpyInstance;

        beforeEach(() => {
            warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        });

        afterEach(() => {
            warnSpy.mockRestore();
        });

        it('reads them against the classes the library exports', () => {
            const scanner = createScanner({ entryPoints: [{ entryFile: path.join(compositionDir, 'frame.showcase.ts'), importPath: 'fixture-lib' }] });
            const field = scanner.scan().components.find((c) => c.className === 'FormFieldComponent')!;

            expect(field.composition?.variantCases).toEqual([0, 1, 2, 0]);
            expect(field.composition?.imports).toEqual([
                { name: 'InputDirective', from: 'fixture-lib' },
                { name: 'IconComponent', from: 'fixture-lib' }
            ]);
        });

        it('leaves out a library class whose selector Angular cannot parse, with one notice per scan', () => {
            const result = createScanner({ entryPoints: [{ entryFile: path.join(compositionDir, 'throws.showcase.ts'), importPath: 'fixture-lib' }] }).scan();
            const printed = warnSpy.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('which Angular cannot parse'));

            expect(printed).toEqual([expect.stringContaining('OddComponent from "fixture-lib" has the selector "lib-odd:not(.a:not(.b))"')]);
            expect(result.components.find((c) => c.className === 'OddComponent')).not.toHaveProperty('composition');
            expect(result.diagnostics).toEqual([expect.stringMatching(/^OddComponent › host — @angular\/compiler failed on it/)]);
        });
    });

    describe('pipes', () => {
        const pipesDir = path.join(FIXTURES_DIR, 'pipes');
        const apiEntry = path.join(pipesDir, 'pipes-api.ts');
        const barrelEntry = path.join(pipesDir, 'pipes-barrel.ts');
        let warn: jest.SpyInstance;

        beforeEach(() => {
            warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        });

        afterEach(() => {
            warn.mockRestore();
        });

        it('scans the pipes of an entry point next to its components and services', () => {
            const result = createScanner({ entryPoints: [{ entryFile: apiEntry, importPath: 'lib/pipes' }] }).scan();
            const timeAgo = result.pipes.find((p) => p.className === 'TimeAgoPipe');

            expect(timeAgo?.pipeName).toBe('timeAgo');
            expect(timeAgo?.importPath).toBe('lib/pipes');
            expect(timeAgo?.api.setup.map((entry) => entry.importPath)).toEqual(['lib/pipes']);
        });

        it('keeps a pipe out of the components and the services, and a component and a service out of the pipes', () => {
            const pipes = createScanner({ entryPoints: [{ entryFile: apiEntry, importPath: 'lib/pipes' }] }).scan();
            const others = createScanner({ entryPoints: [{ entryFile: path.join(FIXTURES_DIR, 'services', 'services-api.ts'), importPath: 'lib/toast' }] }).scan();

            expect(pipes.components.map((c) => c.className)).not.toContain('StandalonePipe');
            expect(pipes.services.map((s) => s.className)).not.toContain('StandalonePipe');
            expect(others.pipes).toEqual([]);
        });

        it('does not list a @Pipe with @Injectable as a service', () => {
            const result = createScanner({ entryPoints: [{ entryFile: apiEntry, importPath: 'lib/pipes' }] }).scan();

            expect(result.pipes.map((p) => p.className)).toContain('InjectablePipe');
            expect(result.services.map((s) => s.className)).not.toContain('InjectablePipe');
            expect(result.components.map((c) => c.className)).not.toContain('InjectablePipe');
        });

        it('returns no pipes for a library without any', () => {
            expect(createScanner({ entryPoints }).scan().pipes).toEqual([]);
        });

        it('dedupes a pipe exported by a secondary and the primary entry point', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/pipes' },
                    { entryFile: barrelEntry, importPath: 'lib', primary: true }
                ]
            }).scan();
            const timeAgos = result.pipes.filter((p) => p.className === 'TimeAgoPipe');

            expect(timeAgos).toHaveLength(1);
            expect(timeAgos[0].importPath).toBe('lib/pipes');
            expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('multiple entry points'));
        });

        it('warns about a pipe two secondary entry points export, and keeps the first', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/pipes' },
                    { entryFile: barrelEntry, importPath: 'lib/barrel' }
                ]
            }).scan();
            const timeAgos = result.pipes.filter((p) => p.className === 'TimeAgoPipe');

            expect(timeAgos).toHaveLength(1);
            expect(timeAgos[0].importPath).toBe('lib/pipes');
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('TimeAgoPipe is exported by multiple entry points'));
        });

        it('collects what it drops from a pipe once, even when several entry points export it', () => {
            const result = createScanner({
                entryPoints: [
                    { entryFile: apiEntry, importPath: 'lib/a' },
                    { entryFile: apiEntry, importPath: 'lib/b' }
                ]
            }).scan();

            expect(result.diagnostics.filter((message) => message.startsWith('NgModulePipe'))).toHaveLength(1);
            expect(new Set(result.diagnostics).size).toBe(result.diagnostics.length);
        });
    });

    it('should collect a dropped @Showcase value once, even when several entry points export its component', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const unevaluableEntry = path.join(FIXTURES_DIR, 'unevaluable-api.ts');

        try {
            const scanner = createScanner({
                entryPoints: [
                    { entryFile: unevaluableEntry, importPath: 'lib/a' },
                    { entryFile: unevaluableEntry, importPath: 'lib/b' }
                ]
            });

            expect(scanner.scan().diagnostics).toHaveLength(10);
        } finally {
            warn.mockRestore();
        }
    });

    it('should isolate a failing entry: other entries still scanned', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            const scanner = createScanner({
                entryPoints: [
                    { entryFile: '/non-existent/file.ts', importPath: 'broken' },
                    { entryFile, importPath: 'good' }
                ]
            });
            const result = scanner.scan();

            // 8 components from the valid entry; the broken entry contributes nothing
            expect(result.components).toHaveLength(9);
            for (const c of result.components) {
                expect(c.importPath).toBe('good');
            }
        } finally {
            warn.mockRestore();
        }
    });

    it('should pick up file changes between scans', () => {
        const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));

        try {
            cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
            const mutableEntry = join(tmpDir, 'public-api.ts');
            const scanner = createScanner({
                entryPoints: [{ entryFile: mutableEntry, importPath: 'fixture' }]
            });

            const first = scanner.scan();
            const originalButton = first.components.find((c) => c.className === 'ButtonComponent')!;

            expect(originalButton.showcaseConfig.title).toBe('Button');

            const buttonFile = join(tmpDir, 'button.component.ts');
            const content = readFileSync(buttonFile, 'utf-8');

            writeFileSync(buttonFile, content.replace("title: 'Button',", "title: 'MutatedButton',"));

            const second = scanner.scan();
            const mutatedButton = second.components.find((c) => c.className === 'ButtonComponent')!;

            expect(mutatedButton.showcaseConfig.title).toBe('MutatedButton');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('should pick up variant array changes between scans', () => {
        const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));

        try {
            cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
            const mutableEntry = join(tmpDir, 'public-api.ts');
            const scanner = createScanner({
                entryPoints: [{ entryFile: mutableEntry, importPath: 'fixture' }]
            });

            const first = scanner.scan();
            const firstButton = first.components.find((c) => c.className === 'ButtonComponent')!;

            expect(firstButton.showcaseConfig.variants?.map((v) => v.name)).toEqual(['Primary', 'Danger']);

            const buttonFile = join(tmpDir, 'button.component.ts');
            const content = readFileSync(buttonFile, 'utf-8');
            const danger = content.match(/\s*\{\s*name:\s*'Danger',[^}]*\},?/);

            if (!danger) throw new Error('Danger variant block not found in fixture');
            writeFileSync(buttonFile, content.replace(danger[0], ''));

            const second = scanner.scan();
            const mutatedButton = second.components.find((c) => c.className === 'ButtonComponent')!;

            expect(mutatedButton.showcaseConfig.variants?.map((v) => v.name)).toEqual(['Primary']);
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('should find a component whose file appears after the entry point already exports it', () => {
        const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));

        try {
            cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
            const mutableEntry = join(tmpDir, 'public-api.ts');

            writeFileSync(mutableEntry, `${readFileSync(mutableEntry, 'utf-8')}export { LateComponent } from './late.component.js';\n`);
            const scanner = createScanner({
                entryPoints: [{ entryFile: mutableEntry, importPath: 'fixture' }]
            });

            expect(scanner.scan().components.map((c) => c.className)).not.toContain('LateComponent');

            writeFileSync(
                join(tmpDir, 'late.component.ts'),
                [
                    "import { Component } from '@angular/core';",
                    'function Showcase(config: { title: string }): ClassDecorator {',
                    '    return () => {};',
                    '}',
                    "@Showcase({ title: 'Late' })",
                    "@Component({ selector: 'late', template: '' })",
                    'export class LateComponent {}',
                    ''
                ].join('\n')
            );

            expect(scanner.scan().components.map((c) => c.className)).toContain('LateComponent');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('should drop a component whose file was deleted between scans', () => {
        const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));

        try {
            cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
            const scanner = createScanner({
                entryPoints: [{ entryFile: join(tmpDir, 'public-api.ts'), importPath: 'fixture' }]
            });

            expect(scanner.scan().components.map((c) => c.className)).toContain('CardComponent');

            rmSync(join(tmpDir, 'card.component.ts'));

            expect(scanner.scan().components.map((c) => c.className)).not.toContain('CardComponent');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
