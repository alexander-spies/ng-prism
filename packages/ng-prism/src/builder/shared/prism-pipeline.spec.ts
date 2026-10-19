import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { BuilderContext } from '@angular-devkit/architect';
import { createPipelineState, runPrismPipeline } from './prism-pipeline.js';

const FIXTURES_DIR = join(__dirname, '..', 'scanner', '__fixtures__');
const MULTI_ENTRY_FIXTURES_DIR = join(__dirname, '__fixtures__', 'multi-entry-lib');
const CONFIG_FIXTURE = join(__dirname, '__fixtures__', 'ng-prism.config.ts');

function createTempWorkspace(): string {
    const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-pipeline-'));

    cpSync(FIXTURES_DIR, join(tmp, 'lib'), { recursive: true });
    cpSync(CONFIG_FIXTURE, join(tmp, 'ng-prism.config.ts'));
    return tmp;
}

function createMultiEntryWorkspace(): string {
    const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-pipeline-multi-'));

    cpSync(MULTI_ENTRY_FIXTURES_DIR, join(tmp, 'lib'), { recursive: true });
    cpSync(CONFIG_FIXTURE, join(tmp, 'ng-prism.config.ts'));
    return tmp;
}

function createMockContext(workspaceRoot: string) {
    return {
        workspaceRoot,
        reportStatus: jest.fn(),
        logger: { info: jest.fn() }
    } as unknown as BuilderContext;
}

function writeA11yReport(root: string, score: number): void {
    writeFileSync(
        join(root, 'a11y-report.json'),
        JSON.stringify({
            // total meets every threshold, otherwise checkA11yThresholds throws
            // before the merge runs.
            total: {
                score: 95,
                violations: 0,
                critical: 0,
                serious: 0,
                moderate: 0,
                minor: 0,
                passes: 40,
                incomplete: 0,
                auditedComponents: 1,
                auditedVariants: 5
            },
            components: {
                ButtonComponent: {
                    score,
                    violations: 1,
                    critical: 0,
                    serious: 0,
                    moderate: 1,
                    minor: 0,
                    passes: 20,
                    incomplete: 0
                }
            }
        }),
        'utf-8'
    );
}

function readManifest(root: string): string {
    return readFileSync(join(root, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');
}

describe('runPrismPipeline integration', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp && existsSync(tmp)) {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    const defaultOptions = {
        entryPoint: 'lib/public-api.ts',
        libraryImportPath: 'my-lib',
        prismProject: 'my-lib-prism',
        configFile: 'ng-prism.config.ts'
    };

    it('should return correct componentCount', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        expect(result.componentCount).toBe(9);
    });

    it('should write prism-manifest.ts to expected path', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        expect(existsSync(result.manifestPath)).toBe(true);
        expect(result.manifestPath).toBe(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'));
    });

    it('should generate manifest with component imports', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain(
            "import { ButtonComponent, CardComponent, SignalButtonComponent, ModelInputComponent, HighlightDirective, InvalidBgComponent, InvalidStatusComponent, DeprecatedBgComponent, SectionedComponent } from 'my-lib'"
        );
    });

    it('should include component type references (not strings)', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain('type: ButtonComponent,');
        expect(content).toContain('type: CardComponent,');
        expect(content).toContain('type: SignalButtonComponent,');
    });

    it('should write to default cache path when cacheDir option is undefined', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        expect(result.manifestPath).toBe(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'));
        expect(existsSync(result.manifestPath)).toBe(true);
    });

    it('should write to cacheDir override when provided', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const customCacheDir = join(tmp, '.custom-cache');

        const result = await runPrismPipeline({ ...defaultOptions, cacheDir: customCacheDir }, ctx, createPipelineState());

        expect(result.manifestPath).toBe(join(customCacheDir, 'my-lib-prism', 'prism-manifest.ts'));
        expect(existsSync(result.manifestPath)).toBe(true);
    });

    it('should call reportStatus and logger.info', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(defaultOptions, ctx, createPipelineState());

        expect(ctx.reportStatus).toHaveBeenCalledWith('Loading ng-prism config...');
        expect(ctx.reportStatus).toHaveBeenCalledWith('Scanning components...');
        expect(ctx.reportStatus).toHaveBeenCalledWith('Running plugin hooks...');
        expect(ctx.reportStatus).toHaveBeenCalledWith('Generating runtime manifest...');
        expect(ctx.reportStatus).toHaveBeenCalledWith('');
        expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('Generated manifest with 9 component(s)'));
    });

    it('merges the per-component a11y entry into showcaseConfig.meta', async () => {
        tmp = createTempWorkspace();
        writeA11yReport(tmp, 55);

        await runPrismPipeline(defaultOptions, createMockContext(tmp), createPipelineState());

        const content = readManifest(tmp);

        expect(content).toContain('a11y:');
        expect(content).toContain('variant: "warn"');
    });

    it('fails on a dropped @Showcase value when strictShowcase is on, before writing a manifest', async () => {
        tmp = createTempWorkspace();
        writeFileSync(join(tmp, 'ng-prism.config.ts'), 'export default { strictShowcase: true };', 'utf-8');
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            await expect(runPrismPipeline({ ...defaultOptions, entryPoint: 'lib/unevaluable-api.ts' }, createMockContext(tmp), createPipelineState())).rejects.toThrow(
                /strictShowcase is enabled and 10 @Showcase value\(s\) were dropped/
            );
            expect(existsSync(join(tmp, 'ng-prism-cache'))).toBe(false);
        } finally {
            warn.mockRestore();
        }
    });

    it('only warns about a dropped @Showcase value while strictShowcase is off', async () => {
        tmp = createTempWorkspace();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            const result = await runPrismPipeline({ ...defaultOptions, entryPoint: 'lib/unevaluable-api.ts' }, createMockContext(tmp), createPipelineState());

            expect(result.componentCount).toBe(6);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('UnevaluableShowcaseComponent › variants[1] "Auto hint" › inputs.maxFileSize'));
        } finally {
            warn.mockRestore();
        }
    });

    it('leaves components untouched when no report exists', async () => {
        tmp = createTempWorkspace();

        await runPrismPipeline(defaultOptions, createMockContext(tmp), createPipelineState());

        expect(readManifest(tmp)).not.toContain('a11y:');
    });

    it('does not overwrite plugin meta written by runPluginHooks when merging the a11y entry', async () => {
        // The a11y merge runs after runPluginHooks specifically so a plugin's
        // `showcaseConfig.meta` survives it. Swapping the order of the two
        // blocks in `runPrismPipeline` (or having the a11y merge replace
        // `meta` outright instead of spreading it) would silently drop
        // whatever a plugin wrote, and every other test in this file uses a
        // config with no a11y report or a plugin that leaves no trace in
        // `showcaseConfig.meta`, so none of them would catch it.
        tmp = createTempWorkspace();
        writeA11yReport(tmp, 55);
        // `Object.assign` rather than object-spread: this file is transpiled and
        // then dynamically `import()`-ed from a temp path outside the workspace
        // (see config-loader.ts), which Jest's own transform also reaches for,
        // and its helper injection for object spread can't resolve `@swc/helpers`
        // from that temp path. The pre-existing `test-meta-plugin` fixture beside
        // this one works around the same thing the same way.
        writeFileSync(
            join(tmp, 'ng-prism.config.ts'),
            `export default {
        plugins: [
          {
            name: 'test-showcase-meta-plugin',
            onComponentScanned(component) {
              var meta = Object.assign({}, component.showcaseConfig.meta, { fromPlugin: 'still-here' });
              var showcaseConfig = Object.assign({}, component.showcaseConfig, { meta: meta });
              return Object.assign({}, component, { showcaseConfig: showcaseConfig });
            },
          },
        ],
      };`,
            'utf-8'
        );

        await runPrismPipeline(defaultOptions, createMockContext(tmp), createPipelineState());

        const content = readManifest(tmp);

        expect(content).toContain('fromPlugin: "still-here"');
        expect(content).toContain('a11y:');
    });
});

describe('runPrismPipeline multi-entry-point integration', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp && existsSync(tmp)) {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    const multiOptions = {
        entryPoint: 'lib',
        libraryImportPath: 'multi-entry-lib',
        prismProject: 'my-lib-prism',
        configFile: 'ng-prism.config.ts'
    };

    it('should discover and scan secondary entry points', async () => {
        tmp = createMultiEntryWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(multiOptions, ctx, createPipelineState());

        expect(result.componentCount).toBe(2);
    });

    it('should generate grouped imports per entry point', async () => {
        tmp = createMultiEntryWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(multiOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain("from 'multi-entry-lib/atoms/icon'");
        expect(content).toContain("from 'multi-entry-lib/atoms/pill'");
        expect(content).not.toContain("from 'multi-entry-lib';");
    });

    it('should include component type references', async () => {
        tmp = createMultiEntryWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(multiOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain('type: PillComponent,');
        expect(content).toContain('type: IconComponent,');
    });

    it('should auto-detect library root from a file entryPoint and discover secondaries', async () => {
        tmp = createMultiEntryWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline({ ...multiOptions, entryPoint: 'lib/public-api.ts' }, ctx, createPipelineState());

        expect(result.componentCount).toBe(2);

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'my-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain("from 'multi-entry-lib/atoms/icon'");
        expect(content).toContain("from 'multi-entry-lib/atoms/pill'");
        expect(content).not.toContain("from 'multi-entry-lib';");
    });
});

describe('runPrismPipeline entry point resolution', () => {
    let tmp: string;
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
        if (tmp && existsSync(tmp)) {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    const options = {
        libraryImportPath: 'my-lib',
        prismProject: 'my-lib-prism',
        configFile: 'ng-prism.config.ts'
    };

    function writeBadgeComponent(dir: string): void {
        writeFileSync(
            join(dir, 'badge.component.ts'),
            [
                "import { Component, input } from '@angular/core';",
                'function Showcase(config: Record<string, unknown>): ClassDecorator {',
                '    return () => {};',
                '}',
                "@Showcase({ title: 'Badge', variants: [{ name: 'Default' }] })",
                "@Component({ selector: 'ui-badge', standalone: true, template: '<span></span>' })",
                'export class BadgeComponent {',
                "    label = input<string>('');",
                '}'
            ].join('\n'),
            'utf-8'
        );
    }

    it('scans the primary entry file of a library directory without secondary entry points', async () => {
        tmp = createTempWorkspace();
        writeFileSync(join(tmp, 'lib', 'ng-package.json'), JSON.stringify({ dest: '../dist/my-lib', lib: { entryFile: './public-api.ts' } }), 'utf-8');

        const fromFile = await runPrismPipeline({ ...options, entryPoint: 'lib/public-api.ts' }, createMockContext(tmp), createPipelineState());
        const fromDirectory = await runPrismPipeline({ ...options, entryPoint: 'lib' }, createMockContext(tmp), createPipelineState());

        expect(fromDirectory.componentCount).toBeGreaterThan(0);
        expect(fromDirectory.componentCount).toBe(fromFile.componentCount);
    });

    it('scans the primary entry point next to the secondary ones', async () => {
        tmp = createMultiEntryWorkspace();
        writeBadgeComponent(join(tmp, 'lib'));
        writeFileSync(join(tmp, 'lib', 'public-api.ts'), "export { BadgeComponent } from './badge.component.js';\n", 'utf-8');

        const result = await runPrismPipeline({ ...options, libraryImportPath: 'multi-entry-lib', entryPoint: 'lib' }, createMockContext(tmp), createPipelineState());

        expect(result.componentCount).toBe(3);
        expect(readManifest(tmp)).toContain("from 'multi-entry-lib';");
        expect(readManifest(tmp)).toContain('type: BadgeComponent,');
    });

    it('keeps a component the primary entry point re-exports under its secondary entry point, without a warning', async () => {
        tmp = createMultiEntryWorkspace();
        writeFileSync(join(tmp, 'lib', 'public-api.ts'), "export * from './atoms/pill/public-api.js';\n", 'utf-8');

        const result = await runPrismPipeline({ ...options, libraryImportPath: 'multi-entry-lib', entryPoint: 'lib' }, createMockContext(tmp), createPipelineState());

        expect(result.componentCount).toBe(2);
        expect(readManifest(tmp)).toContain("from 'multi-entry-lib/atoms/pill'");
        expect(readManifest(tmp)).not.toContain("from 'multi-entry-lib';");
        expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('multiple entry points'));
    });

    it('warns when the entryPoint resolves to no entry file at all', async () => {
        tmp = createTempWorkspace();

        const result = await runPrismPipeline({ ...options, entryPoint: 'lib' }, createMockContext(tmp), createPipelineState());

        expect(result.componentCount).toBe(0);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('⚠ ng-prism: entryPoint "lib" resolves to no entry file'));
    });
});

describe('runPrismPipeline deprecated options', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp && existsSync(tmp)) {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('warns about deprecated config options it finds', async () => {
        tmp = createTempWorkspace();
        writeFileSync(join(tmp, 'ng-prism.config.ts'), "export default { themeStylesheet: 'theme.css' };\n", 'utf-8');
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            await runPrismPipeline(
                { entryPoint: 'lib/public-api.ts', libraryImportPath: 'my-lib', prismProject: 'my-lib-prism', configFile: 'ng-prism.config.ts' },
                createMockContext(tmp),
                createPipelineState()
            );

            expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^⚠ ng-prism: ng-prism\.config\.ts sets "themeStylesheet", which is deprecated/));
        } finally {
            warn.mockRestore();
        }
    });
});

describe('createPipelineState', () => {
    it('should return independent state objects', () => {
        const a = createPipelineState();
        const b = createPipelineState();

        expect(a).not.toBe(b);
        expect(a.scanner).toBeUndefined();
        expect(b.scanner).toBeUndefined();
        expect(a.lastEntrySetKey).toBeUndefined();
        expect(b.lastEntrySetKey).toBeUndefined();
    });

    it('should populate scanner state after pipeline run', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();

        try {
            await runPrismPipeline(
                {
                    entryPoint: 'lib/public-api.ts',
                    libraryImportPath: 'my-lib',
                    prismProject: 'my-lib-prism',
                    configFile: 'ng-prism.config.ts'
                },
                ctx,
                state
            );

            expect(state.scanner).toBeDefined();
            expect(state.lastEntrySetKey).toBeDefined();
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('should reuse the same scanner across pipeline invocations', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();

        try {
            const options = {
                entryPoint: 'lib/public-api.ts',
                libraryImportPath: 'my-lib',
                prismProject: 'my-lib-prism',
                configFile: 'ng-prism.config.ts'
            };

            await runPrismPipeline(options, ctx, state);
            const firstScanner = state.scanner;

            await runPrismPipeline(options, ctx, state);
            const secondScanner = state.scanner;

            expect(firstScanner).toBeDefined();
            expect(secondScanner).toBe(firstScanner);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

describe('runPrismPipeline skip-write behavior', () => {
    it('should return written: true on first invocation', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        try {
            const result = await runPrismPipeline(
                {
                    entryPoint: 'lib/public-api.ts',
                    libraryImportPath: 'my-lib',
                    prismProject: 'my-lib-prism',
                    configFile: 'ng-prism.config.ts'
                },
                ctx,
                createPipelineState()
            );

            expect(result.written).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('should return written: false when content is unchanged', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();
        const options = {
            entryPoint: 'lib/public-api.ts',
            libraryImportPath: 'my-lib',
            prismProject: 'my-lib-prism',
            configFile: 'ng-prism.config.ts'
        };

        try {
            await runPrismPipeline(options, ctx, state);
            const second = await runPrismPipeline(options, ctx, state);

            expect(second.written).toBe(false);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('should leave file mtime unchanged when skip-write triggers', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();
        const options = {
            entryPoint: 'lib/public-api.ts',
            libraryImportPath: 'my-lib',
            prismProject: 'my-lib-prism',
            configFile: 'ng-prism.config.ts'
        };

        try {
            const first = await runPrismPipeline(options, ctx, state);
            const mtimeAfterFirst = statSync(first.manifestPath).mtimeMs;

            await new Promise((resolve) => setTimeout(resolve, 20));

            await runPrismPipeline(options, ctx, state);
            const mtimeAfterSecond = statSync(first.manifestPath).mtimeMs;

            expect(mtimeAfterSecond).toBe(mtimeAfterFirst);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('should preserve the manifest file inode across rewrites (file watchers depend on this)', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();
        const options = {
            entryPoint: 'lib/public-api.ts',
            libraryImportPath: 'my-lib',
            prismProject: 'my-lib-prism',
            configFile: 'ng-prism.config.ts'
        };

        try {
            const first = await runPrismPipeline(options, ctx, state);
            const firstInode = statSync(first.manifestPath).ino;

            const buttonFile = join(tmp, 'lib', 'button.component.ts');
            const content = readFileSync(buttonFile, 'utf-8');
            const { writeFileSync } = await import('fs');

            writeFileSync(buttonFile, content.replace("title: 'Button',", "title: 'MutatedButton',"));

            const second = await runPrismPipeline(options, ctx, state);

            expect(second.written).toBe(true);
            expect(statSync(second.manifestPath).ino).toBe(firstInode);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('should log "Generated" when written, "Verified (unchanged)" when skipped', async () => {
        const tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);
        const state = createPipelineState();
        const options = {
            entryPoint: 'lib/public-api.ts',
            libraryImportPath: 'my-lib',
            prismProject: 'my-lib-prism',
            configFile: 'ng-prism.config.ts'
        };

        try {
            await runPrismPipeline(options, ctx, state);
            expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('Generated manifest'));

            (ctx.logger.info as jest.Mock).mockClear();

            await runPrismPipeline(options, ctx, state);
            expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('Verified (unchanged) manifest'));
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
