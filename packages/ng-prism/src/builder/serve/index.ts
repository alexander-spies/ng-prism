import { existsSync } from 'fs';
import { join } from 'path';
import { type Builder, type BuilderContext, type BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import { createPipelineState, type PrismPipelineOptions, runPrismPipeline } from '../shared/prism-pipeline.js';
import { resolveCacheDir } from '../shared/resolve-cache-dir.js';
import { startWatcher } from '../watcher/index.js';
import type { ServeBuilderSchema } from './schema.js';

async function createServeBuilder(options: ServeBuilderSchema, context: BuilderContext): Promise<BuilderOutput> {
    const cacheDir = resolveCacheDir(options.cacheDir, context.workspaceRoot);

    const pipelineOptions: PrismPipelineOptions = {
        entryPoint: options.entryPoint,
        libraryImportPath: options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
        prismProject: options.prismProject,
        configFile: options.configFile ?? 'ng-prism.config.ts',
        cacheDir,
        // A stale local report must not stop the dev server; it warns instead.
        a11yGate: 'warn'
    };

    const state = createPipelineState();

    await runPrismPipeline(pipelineOptions, context, state);

    const absoluteEntryPoint = join(context.workspaceRoot, options.entryPoint);
    const configFilePath = join(context.workspaceRoot, pipelineOptions.configFile);
    const absolutePrismProject = join(context.workspaceRoot, options.prismProject);
    const watcher = startWatcher({
        entryPoint: absoluteEntryPoint,
        configFile: existsSync(configFilePath) ? configFilePath : undefined,
        ignorePaths: [absolutePrismProject],
        debounceMs: 50,
        onRebuild: async () => {
            await runPrismPipeline(pipelineOptions, context, state);
        },
        logger: {
            info: (msg: string) => context.logger.info(msg),
            error: (msg: string) => context.logger.error(msg)
        }
    });

    const run = await context.scheduleTarget({ project: options.prismProject, target: 'serve', configuration: '' }, { port: options.port ?? 4400 });

    const shutdown = () => {
        watcher.close();
        run.stop();
    };

    const cleanupSignals = () => {
        process.off('SIGINT', shutdown);
        process.off('SIGTERM', shutdown);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    return new Promise<BuilderOutput>((resolve, reject) => {
        let lastOutput: BuilderOutput | undefined;

        run.output.subscribe({
            next: (output) => {
                lastOutput = output;
            },
            error: (err) => {
                cleanupSignals();
                shutdown();
                reject(err);
            },
            complete: () => {
                cleanupSignals();
                watcher.close();
                resolve(lastOutput ?? { success: false });
            }
        });
    });
}

const builder: Builder<ServeBuilderSchema & json.JsonObject> = createBuilder<ServeBuilderSchema>(createServeBuilder);

export default builder;
