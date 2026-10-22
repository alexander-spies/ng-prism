import ts from 'typescript';

/** Where a symbol can be imported from: the resolved symbol of an export, and the `importPath` of the entry point that exports it. */
export type ExportIndex = ReadonlyMap<ts.Symbol, string>;

/**
 * Index everything the library's entry points export by its resolved symbol,
 * so that a reference found anywhere in the source can be traced to the entry
 * point a consumer imports it from. A re-export (`export { x } from`) is an
 * alias and is followed to the declaration, which is what a reference resolves
 * to as well.
 *
 * A symbol exported more than once keeps the first entry: callers put the
 * secondary entry points before the primary one, as the component dedupe does.
 */
export function buildExportIndex(entries: ReadonlyArray<{ exports: ts.Symbol[]; importPath: string }>, checker: ts.TypeChecker): ExportIndex {
    const index = new Map<ts.Symbol, string>();

    for (const { exports, importPath } of entries) {
        for (const sym of exports) {
            const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

            if (!index.has(resolved)) index.set(resolved, importPath);
        }
    }

    return index;
}
