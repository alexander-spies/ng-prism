import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative, resolve } from 'path';
import type { BuilderContext } from '@angular-devkit/architect';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createPipelineState, runPrismPipeline } from '../builder/shared/prism-pipeline.js';

const TEST_WORKSPACE_DIR = join(__dirname, '..', '..', '..', '..', 'test-workspace');

// Installed or generated locally, so copying them would tie the spec to the
// state of the developer's workspace (and cost ~385 MB per copy). The pipeline
// does not need `node_modules` here: CI never installs it for test-workspace.
const EXCLUDED_ENTRIES = new Set(['node_modules', 'dist', '.angular', 'ng-prism-cache']);

function createTempWorkspace(): string {
    const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-integration-'));

    cpSync(TEST_WORKSPACE_DIR, tmp, {
        recursive: true,
        filter: (src) => !EXCLUDED_ENTRIES.has(relative(TEST_WORKSPACE_DIR, src))
    });

    mkdirSync(join(tmp, 'projects', 'test-lib-prism', 'src'), {
        recursive: true
    });
    writeFileSync(join(tmp, 'projects', 'test-lib-prism', 'src', 'main.ts'), 'export {};\n', 'utf-8');

    const angularJson = JSON.parse(readFileSync(join(tmp, 'angular.json'), 'utf-8'));

    angularJson.projects['test-lib-prism'] = {
        projectType: 'application',
        root: 'projects/test-lib-prism',
        sourceRoot: 'projects/test-lib-prism/src',
        architect: {
            'prism-serve': {
                builder: '@ng-prism/core:serve',
                options: { libraryProject: 'test-lib' }
            },
            'prism-build': {
                builder: '@ng-prism/core:build',
                options: { libraryProject: 'test-lib' }
            }
        }
    };
    writeFileSync(join(tmp, 'angular.json'), JSON.stringify(angularJson, null, 2), 'utf-8');

    writeFileSync(
        join(tmp, 'ng-prism.config.ts'),
        [
            'export default {',
            '  plugins: [',
            '    {',
            "      name: 'test-integration-plugin',",
            '      onComponentScanned(component: Record<string, unknown>) {',
            "        const meta = component['meta'] as Record<string, unknown> ?? {};",
            "        meta['tested'] = true;",
            '        return Object.assign({}, component, { meta });',
            '      },',
            '    },',
            '  ],',
            '};'
        ].join('\n'),
        'utf-8'
    );

    return tmp;
}

function createMockContext(workspaceRoot: string) {
    return {
        workspaceRoot,
        reportStatus: jest.fn(),
        logger: { info: jest.fn() },
        getProjectMetadata: jest.fn().mockResolvedValue({
            sourceRoot: 'projects/test-lib-prism/src'
        })
    } as unknown as BuilderContext;
}

describe('test-workspace integration', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp && existsSync(tmp)) {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    const pipelineOptions = {
        entryPoint: 'projects/test-lib/src/public-api.ts',
        libraryImportPath: 'test-lib',
        prismProject: 'test-lib-prism',
        configFile: 'ng-prism.config.ts'
    };

    it('should discover only @Showcase components from the library', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        expect(result.componentCount).toBe(15);
    });

    it('should write prism-manifest.ts into prism project', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        expect(existsSync(join(tmp, 'ng-prism-cache', 'test-lib-prism', 'prism-manifest.ts'))).toBe(true);
    });

    it('should generate correct import statement', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'test-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain("from 'test-lib'");
        expect(content).toContain('ButtonComponent');
    });

    it('should include component type references', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'test-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain('type: ButtonComponent,');
    });

    it('should exclude non-showcased components', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'test-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).not.toContain('InternalComponent');
    });

    it('should preserve showcase metadata in manifest', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        const content = readFileSync(join(tmp, 'ng-prism-cache', 'test-lib-prism', 'prism-manifest.ts'), 'utf-8');

        expect(content).toContain('title: "Button"');
        expect(content).toContain('category: "Inputs"');
        expect(content).toContain('variants:');
        expect(content).toContain('selector: "lib-button"');
        expect(content).toContain('standalone: true');
    });

    it('should apply plugin hooks from config', async () => {
        tmp = createTempWorkspace();
        const ctx = createMockContext(tmp);

        const result = await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

        expect(result.componentCount).toBe(15);
        expect(ctx.reportStatus).toHaveBeenCalledWith('Loading ng-prism config...');
        expect(ctx.reportStatus).toHaveBeenCalledWith('Running plugin hooks...');
        expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('Generated manifest with 15 component(s)'));
    });

    it('end-to-end: core ng-add then plugin ng-add wires config + deps', async () => {
        const corePkgRoot = resolve(__dirname, '../..');
        const jsdocPkgRoot = resolve(corePkgRoot, '../plugin-jsdoc');

        const coreRunner = new SchematicTestRunner('@ng-prism/core', resolve(corePkgRoot, 'schematics/collection.json'));
        const jsdocRunner = new SchematicTestRunner('@ng-prism/plugin-jsdoc', resolve(jsdocPkgRoot, 'schematics/collection.json'));

        let tree = Tree.empty();

        tree.create(
            'angular.json',
            JSON.stringify({
                $schema: './node_modules/@angular/cli/lib/config/workspace-schema.json',
                version: 1,
                projects: {
                    'my-lib': {
                        projectType: 'library',
                        root: 'projects/my-lib',
                        sourceRoot: 'projects/my-lib/src',
                        architect: {
                            build: {
                                builder: '@angular-devkit/build-angular:ng-packagr',
                                options: { project: 'projects/my-lib/ng-package.json' }
                            }
                        }
                    }
                }
            }) + '\n'
        );
        tree.create('tsconfig.json', '{}');
        tree.create('package.json', JSON.stringify({ name: 'host' }) + '\n');

        tree = await coreRunner.runSchematic('ng-add', { project: 'my-lib' }, tree);
        tree = await jsdocRunner.runSchematic('ng-add', {}, tree);

        const config = tree.read('ng-prism.config.ts')!.toString('utf-8');

        expect(config).toContain(`import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';`);
        expect(config).toContain('plugins: [jsDocPlugin()]');

        const pkg = JSON.parse(tree.read('package.json')!.toString('utf-8')) as {
            devDependencies?: Record<string, string>;
        };

        expect(pkg.devDependencies?.['highlight.js']).toBeDefined();
        expect(pkg.devDependencies?.['ngx-highlightjs']).toBeDefined();
    });
});
