import ts from 'typescript';

export interface EntryPointInput {
    entryFile: string;
    importPath: string;
}

export interface ResolvedEntryPoint extends EntryPointInput {
    exports: ts.Symbol[];
}

export interface MultiEntryResult {
    program: ts.Program;
    entries: ResolvedEntryPoint[];
}

/**
 * Resolve all exported symbols for one or more entry-point files (e.g. public-api.ts).
 * A single shared `ts.Program` is created with every entry file as a root name, so the
 * transitive type graph (Angular framework typings, etc.) is parsed once and reused
 * across all entries via the shared `TypeChecker`.
 *
 * Re-exports (`export * from '...'`) are resolved automatically by TypeScript.
 */
export function resolveEntryPointExports(
    entryPoints: ReadonlyArray<EntryPointInput>,
    compilerOptions: ts.CompilerOptions,
    previousProgram?: ts.Program,
    host?: ts.CompilerHost
): MultiEntryResult {
    const program = ts.createProgram(
        entryPoints.map((e) => e.entryFile),
        compilerOptions,
        host,
        previousProgram
    );
    const checker = program.getTypeChecker();

    const entries: ResolvedEntryPoint[] = entryPoints.map(({ entryFile, importPath }) => {
        try {
            const sourceFile = program.getSourceFile(entryFile);

            if (!sourceFile) {
                console.warn(`⚠ ng-prism: source file not found for entry point ${entryFile}, skipping.`);
                return { entryFile, importPath, exports: [] };
            }
            const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
            const exports = moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];

            return { entryFile, importPath, exports };
        } catch (err) {
            console.error(`⚠ ng-prism: failed to resolve exports for ${entryFile}: ${err instanceof Error ? err.message : String(err)}`);
            return { entryFile, importPath, exports: [] };
        }
    });

    return { program, entries };
}
