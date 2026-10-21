import ts from 'typescript';
import { describeInvalidSetup, describeSetupEntryNotExported, describeSetupEntryNotSupported } from '../showcase-diagnostics.js';
import type { ExportIndex } from './export-index.js';

/** One entry of a service's `setup`: what the styleguide shows to configure the service, and where to import it from. */
export interface SetupRef {
    name: string;
    kind: 'function' | 'token';
    declaration: ts.FunctionDeclaration | ts.VariableDeclaration;
    importPath: string;
}

/** Only the literal: a `setup` that arrives through a spread or a constant is not found, and dropped without a word. */
export function findSetupProperty(showcaseArg: ts.Expression): ts.ObjectLiteralElementLike | undefined {
    if (!ts.isObjectLiteralExpression(showcaseArg)) return undefined;

    return showcaseArg.properties.find((p) => p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'setup');
}

/**
 * Read the functions and tokens a service names in `setup: () => [provideToast, TOAST_LABELS]`.
 *
 * `setup` is an arrow function, not an array, so that the imports it refers to
 * are only touched when it runs: a showcase file that imports from a module
 * which imports the service back would otherwise hit the temporal dead zone.
 * The scanner never runs it. It reads the array literal in the source and
 * traces each element to its declaration, and to the entry point that exports it.
 *
 * What cannot be read is reported and dropped: a `setup` of another shape as a
 * whole, any other entry on its own.
 */
export function readSetupRefs(
    showcaseArg: ts.Expression,
    className: string,
    checker: ts.TypeChecker,
    exportIndex: ExportIndex,
    report: (message: string) => void
): SetupRef[] {
    const property = findSetupProperty(showcaseArg);

    if (!property) return [];

    const array = ts.isPropertyAssignment(property) ? readSetupArray(property.initializer) : undefined;

    if (!array) {
        report(describeInvalidSetup(className, ts.isPropertyAssignment(property) ? property.initializer : property));
        return [];
    }

    const refs: SetupRef[] = [];

    array.elements.forEach((element, index) => {
        const symbol = resolveEntry(element, checker);
        const target = symbol && classifyEntry(symbol, checker);

        if (!symbol || !target) {
            report(describeSetupEntryNotSupported(className, index, element));
            return;
        }

        const importPath = exportIndex.get(symbol);

        if (importPath === undefined) {
            report(describeSetupEntryNotExported(className, index, element));
            return;
        }

        refs.push({ name: symbol.name, ...target, importPath });
    });

    return refs;
}

/** The array literal an arrow function returns, as an expression body or as the only statement of a block. */
function readSetupArray(initializer: ts.Expression): ts.ArrayLiteralExpression | undefined {
    if (!ts.isArrowFunction(initializer)) return undefined;

    const { body } = initializer;
    const returned = ts.isBlock(body) ? (body.statements.length === 1 && ts.isReturnStatement(body.statements[0]) ? body.statements[0].expression : undefined) : body;
    const value = returned && skipParentheses(returned);

    return value && ts.isArrayLiteralExpression(value) ? value : undefined;
}

function skipParentheses(expression: ts.Expression): ts.Expression {
    let current = expression;

    while (ts.isParenthesizedExpression(current)) current = current.expression;
    return current;
}

/**
 * The declaration symbol an entry refers to, with an import followed to its
 * source: the symbol the export index holds. Only a name or a property access
 * (`toasts.provideToast`) can refer to one; a call or a spread cannot.
 */
function resolveEntry(element: ts.Expression, checker: ts.TypeChecker): ts.Symbol | undefined {
    if (!ts.isIdentifier(element) && !ts.isPropertyAccessExpression(element)) return undefined;

    const symbol = checker.getSymbolAtLocation(element);

    if (!symbol) return undefined;

    // A declaration that is exported from its own file is a local symbol there, and the export symbol is the one that is indexed.
    return checker.getExportSymbolOfSymbol(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
}

function classifyEntry(symbol: ts.Symbol, checker: ts.TypeChecker): Pick<SetupRef, 'kind' | 'declaration'> | undefined {
    for (const declaration of symbol.declarations ?? []) {
        if (ts.isFunctionDeclaration(declaration)) return { kind: 'function', declaration };

        if (!ts.isVariableDeclaration(declaration) || !(ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const)) continue;

        const initializer = declaration.initializer && skipParentheses(declaration.initializer);

        if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) return { kind: 'function', declaration };

        if (checker.getTypeAtLocation(declaration.name).getSymbol()?.name === 'InjectionToken') return { kind: 'token', declaration };
    }

    return undefined;
}
