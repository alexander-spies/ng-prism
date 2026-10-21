import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { BuilderContext } from '@angular-devkit/architect';
import ts from 'typescript';
import type { StyleguidePage } from '../../plugin/page.types.js';
import { checkA11yThresholds, DEFAULT_A11Y_REPORT_PATH, readA11yForComponents, readA11yMeta } from '../a11y/a11y-report-reader.js';
import { loadConfig } from '../config-loader/config-loader.js';
import { describeDeprecatedOptions } from '../config-loader/deprecated-options.js';
import { generateRuntimeManifest } from '../manifest/runtime-manifest.generator.js';
import { runPluginHooks } from '../plugin-runner/plugin-runner.js';
import { discoverSecondaryEntryPoints, findPrimaryEntryFile } from '../scanner/entry-point-discovery.js';
import type { EntryPointInput } from '../scanner/entry-point.scanner.js';
import { createScanner, type Scanner, type ScanResult } from '../scanner/scanner.js';

export interface PrismPipelineOptions {
    entryPoint: string;
    libraryImportPath: string;
    prismProject: string;
    configFile: string;
    /** Absolute path. If omitted, defaults to `<workspaceRoot>/ng-prism-cache/<prismProject>`. */
    cacheDir?: string;
}

export interface PrismPipelineResult {
    manifestPath: string;
    componentCount: number;
    /** Services in the manifest: 0 when no plugin shows services, however many the scan found. */
    serviceCount: number;
    pageCount: number;
    /** True if the manifest file was actually written; false if the existing content was identical. */
    written: boolean;
}

export interface PrismPipelineState {
    scanner: Scanner | undefined;
    /** Sorted, joined entry-file paths. Used to detect when the entry set changed between rebuilds. */
    lastEntrySetKey: string | undefined;
}

export function createPipelineState(): PrismPipelineState {
    return { scanner: undefined, lastEntrySetKey: undefined };
}

export async function runPrismPipeline(options: PrismPipelineOptions, context: BuilderContext, state: PrismPipelineState): Promise<PrismPipelineResult> {
    const { workspaceRoot } = context;

    context.reportStatus('Loading ng-prism config...');
    const config = await loadConfig({
        workspaceRoot,
        configFileName: options.configFile
    });

    for (const notice of describeDeprecatedOptions(config, options.configFile)) {
        console.warn(`⚠ ng-prism: ${notice}`);
    }

    context.reportStatus('Scanning components...');
    const { components, services: scannedServices, diagnostics } = scanEntryPoints(workspaceRoot, options, state);

    if (config.strictShowcase && diagnostics.length > 0) {
        throw new Error(`ng-prism: strictShowcase is enabled and ${diagnostics.length} @Showcase value(s) were dropped; see the warnings above.`);
    }

    // A service page is made by a plugin's view panel that applies to services: a service page has no
    // addon area. Without one the services would go into the manifest and be shown nowhere. A hint
    // rather than a diagnostic: the library is fine. It names the version because a plugin-jsdoc from
    // before 22.7.0 is no such panel, so a config that has jsDocPlugin() can still get the hint.
    const showsServices = (config.plugins ?? []).some((plugin) => plugin.panels?.some((panel) => panel.placement === 'view' && panel.appliesTo?.includes('service')));

    if (!showsServices && scannedServices.length > 0) {
        context.logger.info(
            `ng-prism: ${scannedServices.length} service(s) with @Showcase found, but no plugin shows services; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.`
        );
    }

    const pages: StyleguidePage[] = config.pages ? [...config.pages] : [];

    context.reportStatus('Running plugin hooks...');
    let manifest = await runPluginHooks(showsServices ? { components, services: scannedServices, pages } : { components, pages }, config.plugins ?? []);

    const a11yReportPath = config.a11y?.reportPath ?? DEFAULT_A11Y_REPORT_PATH;
    const a11yReportPathAbs = join(workspaceRoot, a11yReportPath);
    const a11yMeta = readA11yMeta(a11yReportPathAbs, config.a11y?.thresholds);

    if (a11yMeta) {
        const violations = checkA11yThresholds(a11yMeta);

        if (violations.length > 0) {
            const summary = violations.map((v) => `${v.metric}: ${v.actual} (threshold ${v.threshold})`).join(', ');

            throw new Error(`ng-prism: a11y thresholds violated: ${summary}. ` + `Update components or relax thresholds via config.a11y.thresholds.`);
        }
        // Read once, not once per component: the reader re-stats the file on every
        // call even when its cache hits, so a per-component lookup scales the
        // syscalls with the library and repeats them on every watch rebuild.
        const a11yByComponent = readA11yForComponents(a11yReportPathAbs, a11yMeta.thresholds);

        manifest = {
            ...manifest,
            components: manifest.components.map((component) => {
                const a11y = a11yByComponent.get(component.className);

                if (!a11y) return component;
                return {
                    ...component,
                    showcaseConfig: {
                        ...component.showcaseConfig,
                        meta: { ...component.showcaseConfig.meta, a11y }
                    }
                };
            }),
            meta: { ...manifest.meta, a11y: a11yMeta }
        };
    }

    context.reportStatus('Generating runtime manifest...');
    const source = generateRuntimeManifest({
        components: manifest.components,
        services: manifest.services,
        libraryImportPath: options.libraryImportPath,
        pages: manifest.pages,
        meta: manifest.meta
    });

    const cacheRoot = options.cacheDir ?? join(workspaceRoot, 'ng-prism-cache');
    const cacheDir = join(cacheRoot, options.prismProject);
    const manifestPath = join(cacheDir, 'prism-manifest.ts');

    mkdirSync(cacheDir, { recursive: true });
    const written = writeManifestIfChanged(manifestPath, source);

    const serviceCount = (manifest.services ?? []).length;
    const pageCount = (manifest.pages ?? []).length;

    context.reportStatus('');
    context.logger.info(
        `ng-prism: ${written ? 'Generated' : 'Verified (unchanged)'} manifest ` +
            `with ${manifest.components.length} component(s)` +
            (serviceCount > 0 ? `, ${serviceCount} service(s)` : '') +
            (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
            ` at ${manifestPath}`
    );

    return {
        manifestPath,
        componentCount: manifest.components.length,
        serviceCount,
        pageCount,
        written
    };
}

function writeManifestIfChanged(manifestPath: string, newContent: string): boolean {
    if (existsSync(manifestPath)) {
        const currentContent = readFileSync(manifestPath, 'utf-8');

        if (currentContent === newContent) {
            return false;
        }
    }

    // Write in place (truncate + write, same inode). A temp file + atomic
    // rename creates a new inode each time, and Vite's watcher loses the file
    // when the manifest lives in a cache dir outside the project's source
    // root, so @Showcase changes would stop triggering HMR. The manifest is
    // only kilobytes, so a bundler seeing a partial write is unlikely.
    writeFileSync(manifestPath, newContent, 'utf-8');
    return true;
}

function isDirectory(path: string): boolean {
    try {
        return statSync(path).isDirectory();
    } catch {
        return false;
    }
}

function findLibraryRoot(filePath: string): string | undefined {
    let dir = dirname(filePath);
    let parent = dirname(dir);

    while (dir !== parent) {
        if (existsSync(join(dir, 'ng-package.json'))) {
            return dir;
        }
        dir = parent;
        parent = dirname(dir);
    }
    return undefined;
}

/**
 * Reads config files, `extends` included, but lists no directories. Only
 * `paths` and `baseUrl` are taken from the config, so enumerating the files it
 * includes would only cost time: with no `include`, that is every source file
 * below the config, on every rebuild.
 */
const CONFIG_HOST: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: () => []
};

function resolveTsconfigPaths(entryPointDir: string): ts.CompilerOptions {
    const configPath = ts.findConfigFile(entryPointDir, ts.sys.fileExists, 'tsconfig.json');

    if (!configPath) return {};

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configFile.error) return {};

    const parsed = ts.parseJsonConfigFileContent(configFile.config, CONFIG_HOST, dirname(configPath));
    const result: ts.CompilerOptions = {};

    if (parsed.options.paths) result.paths = parsed.options.paths;
    if (parsed.options.baseUrl) result.baseUrl = parsed.options.baseUrl;
    return result;
}

function resolveEntryPoints(workspaceRoot: string, options: PrismPipelineOptions): { entryPoints: EntryPointInput[]; compilerOptions: ts.CompilerOptions } {
    const absoluteEntryPoint = join(workspaceRoot, options.entryPoint);
    const compilerOptions = resolveTsconfigPaths(dirname(absoluteEntryPoint));

    const entryIsDirectory = isDirectory(absoluteEntryPoint);
    const libraryRoot = entryIsDirectory ? absoluteEntryPoint : findLibraryRoot(absoluteEntryPoint);

    const discovered = libraryRoot ? discoverSecondaryEntryPoints(libraryRoot, options.libraryImportPath) : [];

    // The primary entry point is scanned after the secondary ones: a file entryPoint is
    // the primary itself, a directory names it in its ng-package.json. A root
    // ng-package.json without `dest` is already among the discovered ones.
    const primaryEntryFile = entryIsDirectory ? findPrimaryEntryFile(absoluteEntryPoint) : absoluteEntryPoint;
    const entryPoints: EntryPointInput[] =
        primaryEntryFile && !discovered.some((e) => e.entryFile === primaryEntryFile)
            ? [...discovered, { entryFile: primaryEntryFile, importPath: options.libraryImportPath, primary: true }]
            : discovered;

    if (entryPoints.length === 0) {
        console.warn(
            `⚠ ng-prism: entryPoint "${options.entryPoint}" resolves to no entry file: no ng-package.json with a lib.entryFile ` +
                `that exists, and no secondary entry points below it. Point entryPoint at the library's barrel file.`
        );
    }

    return { entryPoints, compilerOptions };
}

function scanEntryPoints(workspaceRoot: string, options: PrismPipelineOptions, state: PrismPipelineState): ScanResult {
    const { entryPoints, compilerOptions } = resolveEntryPoints(workspaceRoot, options);

    const newKey = entryPoints
        .map((e) => e.entryFile)
        .slice()
        .sort()
        .join('|');

    if (newKey !== state.lastEntrySetKey) {
        state.scanner = undefined;
        state.lastEntrySetKey = newKey;
    }

    state.scanner ??= createScanner({ entryPoints, compilerOptions });

    return state.scanner.scan();
}
