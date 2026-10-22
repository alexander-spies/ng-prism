import ts from 'typescript';
import type { ScannedPipe } from '../../plugin/pipe.types.js';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import type { ScannedService } from '../../plugin/service.types.js';
import { buildExportIndex } from './api/export-index.js';
import { scanComponents } from './component.scanner.js';
import { type EntryPointInput, resolveEntryPointExports } from './entry-point.scanner.js';
import { scanPipes } from './pipe.scanner.js';
import { scanServices } from './service.scanner.js';
import { createSourceFileCache } from './source-file-cache.js';

export interface CreateScannerOptions {
    entryPoints: ReadonlyArray<EntryPointInput>;
    compilerOptions?: ts.CompilerOptions;
}

export interface ScanResult {
    components: ScannedComponent[];
    services: ScannedService[];
    pipes: ScannedPipe[];
    /** One message per @Showcase value the scan had to drop, already printed as a warning. */
    diagnostics: string[];
}

export interface Scanner {
    /** Scan all entry points. Reuses TypeScript program state from previous scans. */
    scan(): ScanResult;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true,
    // Perf: skip auto-loading every @types/* package; library source rarely needs ambient globals.
    // Users with explicit needs can pass `types: ['node']` via tsconfig.json paths.
    types: [],
    // Perf: we never call program.emit(); skip emit-related setup work.
    noEmit: true,
    // Perf: complements skipLibCheck by also skipping type-checking of lib.*.d.ts files.
    skipDefaultLibCheck: true
};

/**
 * Create a stateful multi-entry scanner that retains the previous ts.Program between scans.
 * A single shared program is created with every entry-point file as a root name, so the
 * transitive type graph (Angular framework typings, etc.) is parsed once and shared via
 * the program's `TypeChecker`, instead of N programs that each load Material/CDK/RxJS.
 *
 * On rebuild, the source-file cache hands TypeScript the already parsed SourceFile of
 * every unchanged file, so only the changed files are parsed again.
 */
export function createScanner(options: CreateScannerOptions): Scanner {
    const compilerOptions = {
        ...DEFAULT_COMPILER_OPTIONS,
        ...options.compilerOptions
    };
    const sourceFiles = createSourceFileCache(compilerOptions);
    let previousProgram: ts.Program | undefined;

    return {
        scan(): ScanResult {
            const { program, entries } = resolveEntryPointExports(options.entryPoints, compilerOptions, previousProgram, sourceFiles.host);

            previousProgram = program;
            sourceFiles.prune(program);

            const checker = program.getTypeChecker();
            const allComponents: ScannedComponent[] = [];
            const allServices: ScannedService[] = [];
            const allPipes: ScannedPipe[] = [];
            const diagnostics: string[] = [];
            const notices = new Set<string>();
            // A setup function or a type is often exported by another entry point than the component, service or pipe that names it.
            const exportIndex = buildExportIndex(entries, checker);

            const fromPrimary = new Set<object>();

            for (const { exports, importPath, primary } of entries) {
                const components = scanComponents(exports, checker, diagnostics, notices, exportIndex);
                const services = scanServices(exports, checker, { exportIndex, diagnostics, notices });
                const pipes = scanPipes(exports, checker, { exportIndex, diagnostics, notices });

                for (const c of components) c.importPath = importPath;
                if (primary) {
                    for (const item of [...components, ...services, ...pipes]) fromPrimary.add(item);
                }
                allComponents.push(...components);
                allServices.push(...services);
                allPipes.push(...pipes);
            }

            return {
                components: dedupe(allComponents, fromPrimary),
                services: dedupe(allServices, fromPrimary),
                pipes: dedupe(allPipes, fromPrimary),
                diagnostics
            };
        }
    };
}

/**
 * Dedupe by (filePath, className): if a class is re-exported from multiple
 * entry points (e.g. atoms/button + barrel index.ts), we keep the first
 * occurrence. The duplicate would otherwise produce duplicate imports in the
 * generated manifest and a runtime collision in the Prism shell. The primary
 * entry point comes last and re-exporting its secondaries is normal there.
 */
function dedupe<T extends { className: string; filePath: string; importPath?: string }>(items: T[], fromPrimary: ReadonlySet<object>): T[] {
    const first = new Map<string, T>();

    for (const item of items) {
        const key = `${item.filePath}::${item.className}`;
        const kept = first.get(key);

        if (!kept) {
            first.set(key, item);
        } else if (!fromPrimary.has(item)) {
            console.warn(`⚠ ng-prism: ${item.className} is exported by multiple entry points; ` + `keeping the first occurrence (importPath: ${kept.importPath}).`);
        }
    }

    return [...first.values()];
}
