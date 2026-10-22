import ts from 'typescript';
import type { ApiMethod, ApiProperty, ApiTypeDoc, ApiTypeRef } from '../../../plugin/service.types.js';
import { isInternal, readDescription, readDocTags } from './doc-tags.js';
import type { ExportIndex } from './export-index.js';
import { collapseWhitespace, extractMembers, extractObjectTypeMembers, readTypeText, type TypeRefResolver, type TypeSite } from './member.extractor.js';

type DocumentedDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;

/** A type the collector documents, as it was first reached. */
interface ReachedType {
    id: string;
    symbol: ts.Symbol;
    declaration: DocumentedDeclaration;
    importPath: string;
    reachedFrom: string;
    /** The value it was reached by, e.g. `options`; what its members reach says `via ${path}.${member}`. */
    path: string;
}

/** A {@link TypeRefResolver} that links the documented types it meets and collects them for `ServiceApi.types`. */
export interface TypeCollector extends TypeRefResolver {
    /** A resolver for the members of the value at `path`, e.g. the options of a setup function's `config`. */
    within(path: string): TypeRefResolver;
    /** Documents what was reached so far, and what their members reach in turn, in the order of first reach. */
    drain(): ApiTypeDoc[];
}

/**
 * Collects the types a service's API reaches. A type is documented when it is
 * an interface, class, type alias or enum, a scanned entry point exports it,
 * and it is not tagged `@internal`. Anything else, `Signal` or `Provider` or a
 * type the library keeps to itself, stays text without a link.
 *
 * Each type is documented once, under the id it got when it was first
 * reached: its name, or `${name}@${importPath}` when a type of that name was
 * reached before. That also ends a type that refers to itself.
 */
export function createTypeCollector(checker: ts.TypeChecker, exportIndex: ExportIndex): TypeCollector {
    /** Every symbol met so far: what it was reached as, or `null` when it is not documented. */
    const reached = new Map<ts.Symbol, ReachedType | null>();
    const ids = new Set<string>();
    const queue: ReachedType[] = [];
    const docs: ApiTypeDoc[] = [];

    function collect(typeNode: ts.TypeNode | undefined, type: ts.Type, reachedFrom: string, path: string | undefined): ApiTypeRef {
        const links: string[] = [];
        const visit = (symbol: ts.Symbol): void => {
            const target = reach(symbol, reachedFrom, path);

            if (target && !links.includes(target.id)) links.push(target.id);
        };

        if (typeNode) forEachReferenceInNode(typeNode, checker, visit);
        else forEachReferenceInType(type, checker, visit, new Set());

        const text = readTypeText(checker, typeNode, type);

        return links.length > 0 ? { text, links } : { text };
    }

    function reach(symbol: ts.Symbol, reachedFrom: string, path: string | undefined): ReachedType | undefined {
        const target = resolveSymbol(symbol, checker);
        const known = reached.get(target);

        if (known !== undefined) return known ?? undefined;

        const declaration = target.declarations?.find(isDocumentedKind);
        const importPath = exportIndex.get(target);

        if (!declaration || importPath === undefined || isInternal(declaration)) {
            reached.set(target, null);
            return undefined;
        }

        const id = ids.has(target.name) ? `${target.name}@${importPath}` : target.name;
        const entry: ReachedType = { id, symbol: target, declaration, importPath, reachedFrom, path: path ?? target.name };

        ids.add(id);
        reached.set(target, entry);
        queue.push(entry);

        return entry;
    }

    function within(owner: string): TypeRefResolver {
        return {
            ref(typeNode, type, reachedFrom, site) {
                switch (site?.kind) {
                    case 'property':
                        return collect(typeNode, type, `via ${owner}.${site.name}`, `${owner}.${site.name}`);
                    case 'parameter':
                        return collect(typeNode, type, `parameter of ${owner}.${site.method}()`, site.name);
                    case 'return':
                        return collect(typeNode, type, `returned by ${owner}.${site.method}()`, `${owner}.${site.method}()`);
                    default:
                        return collect(typeNode, type, `via ${owner}`, owner);
                }
            }
        };
    }

    function describe({ id, symbol, declaration, importPath, reachedFrom, path }: ReachedType): ApiTypeDoc {
        const doc: ApiTypeDoc = { id, name: symbol.name, kind: kindOf(declaration), importPath, tags: readDocTags(declaration) };
        const description = readDescription(declaration);
        const members = within(path);

        if (description) doc.description = description;

        if (ts.isClassDeclaration(declaration)) {
            assignMembers(doc, extractMembers(declaration, checker, members));
        } else if (ts.isInterfaceDeclaration(declaration)) {
            assignMembers(doc, extractObjectTypeMembers(checker.getDeclaredTypeOfSymbol(symbol), checker, members));
        } else if (ts.isEnumDeclaration(declaration)) {
            doc.members = declaration.members.filter((member) => !isInternal(member)).map((member) => describeEnumMember(member, checker));
        } else if (isLiteralUnion(declaration.type)) {
            doc.union = declaration.type.types.map((member) => member.getText());
        } else if (ts.isTypeLiteralNode(declaration.type)) {
            assignMembers(doc, extractObjectTypeMembers(checker.getDeclaredTypeOfSymbol(symbol), checker, members));
        } else {
            // The text has no links of its own, but the types it names are reached all the same.
            doc.text = collect(declaration.type, checker.getDeclaredTypeOfSymbol(symbol), `via ${path}`, path).text;
        }

        doc.reachedFrom = reachedFrom;

        return doc;
    }

    return {
        ref: (typeNode, type, reachedFrom, site) => collect(typeNode, type, reachedFrom, site && pathOf(site)),
        within,
        drain() {
            // Describing a type reaches the types of its members, which join the queue behind it.
            while (docs.length < queue.length) docs.push(describe(queue[docs.length]));

            return [...docs];
        }
    };
}

/** The value a type at the top level is the type of: a property, a parameter by its name, or `show()` for a return value. */
function pathOf(site: TypeSite): string {
    return site.kind === 'return' ? `${site.method}()` : site.name;
}

/**
 * The declaration a reference ends at: an import followed to its source, the
 * export symbol of a declaration exported from its own file, an enum for one
 * of its members. That is the symbol the export index holds.
 */
function resolveSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
    let target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

    if (target.flags & ts.SymbolFlags.EnumMember && target.valueDeclaration && ts.isEnumDeclaration(target.valueDeclaration.parent)) {
        target = checker.getSymbolAtLocation(target.valueDeclaration.parent.name) ?? target;
    }

    return checker.getExportSymbolOfSymbol(target);
}

function isDocumentedKind(declaration: ts.Declaration): declaration is DocumentedDeclaration {
    return ts.isInterfaceDeclaration(declaration) || ts.isClassDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) || ts.isEnumDeclaration(declaration);
}

function kindOf(declaration: DocumentedDeclaration): ApiTypeDoc['kind'] {
    if (ts.isInterfaceDeclaration(declaration)) return 'interface';
    if (ts.isClassDeclaration(declaration)) return 'class';
    if (ts.isEnumDeclaration(declaration)) return 'enum';

    return 'type';
}

/** `'top-left' | 'top-right'`, `1 | 2` or `true | null`: a union of literals only. */
function isLiteralUnion(node: ts.TypeNode): node is ts.UnionTypeNode {
    return ts.isUnionTypeNode(node) && node.types.every(ts.isLiteralTypeNode);
}

function assignMembers(doc: ApiTypeDoc, { properties, methods }: { properties: ApiProperty[]; methods: ApiMethod[] }): void {
    if (properties.length > 0) doc.properties = properties;
    if (methods.length > 0) doc.methods = methods;
}

/** The initializer as written, or the value TypeScript counts up to without one. */
function describeEnumMember(member: ts.EnumMember, checker: ts.TypeChecker): NonNullable<ApiTypeDoc['members']>[number] {
    const result: NonNullable<ApiTypeDoc['members']>[number] = {
        name: ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : member.name.getText()
    };
    const value = member.initializer ? collapseWhitespace(member.initializer.getText()) : checker.getConstantValue(member)?.toString();
    const description = readDescription(member);

    if (value !== undefined) result.value = value;
    if (description) result.description = description;

    return result;
}

/** Every type reference in an annotation: in type arguments, arrays, unions and object literal types too. */
function forEachReferenceInNode(node: ts.Node, checker: ts.TypeChecker, visit: (symbol: ts.Symbol) => void): void {
    if (ts.isTypeReferenceNode(node)) {
        const symbol = checker.getSymbolAtLocation(ts.isQualifiedName(node.typeName) ? node.typeName.right : node.typeName);

        if (symbol) visit(symbol);
    }

    ts.forEachChild(node, (child) => forEachReferenceInNode(child, checker, visit));
}

/**
 * Every named type in a type without annotation, as `typeToString` prints it:
 * an alias or a class or interface with their type arguments, the parts of a
 * union or intersection, and the members of an object literal or function type.
 */
function forEachReferenceInType(type: ts.Type, checker: ts.TypeChecker, visit: (symbol: ts.Symbol) => void, seen: Set<ts.Type>): void {
    if (seen.has(type)) return;

    seen.add(type);

    const walk = (inner: ts.Type): void => forEachReferenceInType(inner, checker, visit, seen);

    if (type.aliasSymbol) {
        visit(type.aliasSymbol);
        type.aliasTypeArguments?.forEach(walk);
        return;
    }

    // An enum, or one of its members.
    if (type.flags & ts.TypeFlags.EnumLiteral && type.symbol) {
        visit(type.symbol);
        return;
    }

    if (type.isUnionOrIntersection()) {
        type.types.forEach(walk);
        return;
    }

    if (!(type.flags & ts.TypeFlags.Object)) return;

    const { objectFlags } = type as ts.ObjectType;

    if (objectFlags & (ts.ObjectFlags.Class | ts.ObjectFlags.Interface | ts.ObjectFlags.Reference)) {
        if (type.symbol) visit(type.symbol);
        if (objectFlags & ts.ObjectFlags.Reference) checker.getTypeArguments(type as ts.TypeReference).forEach(walk);
        return;
    }

    if (objectFlags & ts.ObjectFlags.Anonymous) {
        for (const property of type.getProperties()) walk(checker.getTypeOfSymbol(property));

        for (const signature of type.getCallSignatures()) {
            for (const parameter of signature.getParameters()) walk(checker.getTypeOfSymbol(parameter));

            walk(signature.getReturnType());
        }
    }
}
