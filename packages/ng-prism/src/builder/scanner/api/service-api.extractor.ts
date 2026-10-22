import ts from 'typescript';
import type { ApiProperty, ApiSetupEntry, ServiceApi } from '../../../plugin/service.types.js';
import { readDescription, readDocTags } from './doc-tags.js';
import type { ExportIndex } from './export-index.js';
import { extractMembers, extractMethod, extractObjectTypeMembers, firstParameter, type TypeRefResolver } from './member.extractor.js';
import { type SetupRef, skipParentheses } from './setup.reader.js';
import { createTypeCollector, type TypeCollector } from './type-collector.js';

/** The wrappers a config table looks through. */
const CONFIG_WRAPPERS = new Set(['Partial', 'Required', 'Readonly']);

/**
 * What the API page of a service shows: the description and tags of the
 * class, its public members, its setup functions and tokens with their config
 * tables, and every documented type all of them reach.
 */
export function extractServiceApi(classDecl: ts.ClassDeclaration, setupRefs: SetupRef[], checker: ts.TypeChecker, exportIndex: ExportIndex): ServiceApi {
    const collector = createTypeCollector(checker, exportIndex);
    const { properties, methods } = extractMembers(classDecl, checker, collector);
    const setup = describeSetupEntries(setupRefs, checker, collector);
    const api: ServiceApi = { tags: readDocTags(classDecl), properties, methods, setup, types: collector.drain() };
    const description = readDescription(classDecl);

    if (description) api.description = description;

    return api;
}

/** The setup functions and tokens of a service or a pipe, with their config tables; the types they reach go to `collector`. */
export function describeSetupEntries(setupRefs: SetupRef[], checker: ts.TypeChecker, collector: TypeCollector): ApiSetupEntry[] {
    return setupRefs.map((ref) => (ref.kind === 'function' ? describeSetupFunction(ref, checker, collector) : describeSetupToken(ref, checker, collector)));
}

/** A setup function: its signature and docs, and the options of its first parameter when that is an object. */
function describeSetupFunction({ name, declaration, importPath }: SetupRef, checker: ts.TypeChecker, collector: TypeCollector): ApiSetupEntry {
    const fn = ts.isFunctionDeclaration(declaration) ? declaration : (skipParentheses(declaration.initializer!) as ts.ArrowFunction | ts.FunctionExpression);
    const { params, returnType, description, tags } = extractMethod(name, fn, docNodeOf(declaration), checker, collector);
    const entry: ApiSetupEntry = { name, kind: 'function', importPath, tags, params, returnType };
    const param = firstParameter(fn);
    const config = param && readConfig(param.type, checker.getTypeAtLocation(param), checker, collector.within(params[0].name));

    if (description) entry.description = description;
    if (config) entry.config = config;

    return entry;
}

/** A token: `InjectionToken<T>` as written, and the options of `T` when that is an object. */
function describeSetupToken({ name, declaration, importPath }: SetupRef, checker: ts.TypeChecker, collector: TypeCollector): ApiSetupEntry {
    // A token is always a `const`: the setup reader takes no other declaration for one.
    const variable = declaration as ts.VariableDeclaration;
    const typeNode = variable.type;
    const type = checker.getTypeAtLocation(variable.name);
    const docs = docNodeOf(variable);
    const entry: ApiSetupEntry = {
        name,
        kind: 'token',
        importPath,
        tags: readDocTags(docs),
        tokenType: collector.ref(typeNode, type, `type of ${name}`, { kind: 'property', name })
    };
    const argumentNode = typeNode && ts.isTypeReferenceNode(typeNode) ? typeNode.typeArguments?.[0] : undefined;
    const argument = argumentNode ? checker.getTypeFromTypeNode(argumentNode) : isTypeReference(type) ? checker.getTypeArguments(type)[0] : undefined;
    const config = argument && readConfig(argumentNode, argument, checker, collector.within(name));
    const description = readDescription(docs);

    if (description) entry.description = description;
    if (config) entry.config = config;

    return entry;
}

/** The doc block of a `const` sits on its statement, not on the declaration. */
function docNodeOf(declaration: ts.FunctionDeclaration | ts.VariableDeclaration): ts.Node {
    return ts.isVariableDeclaration(declaration) && ts.isVariableStatement(declaration.parent.parent) ? declaration.parent.parent : declaration;
}

/**
 * The options of a config object: the properties of an interface, an object
 * literal type or an object type alias, looked for through `Partial`,
 * `Required` and `Readonly`, which change what the options say. `undefined`
 * for anything else, a class or an array or a primitive.
 */
function readConfig(typeNode: ts.TypeNode | undefined, type: ts.Type, checker: ts.TypeChecker, types: TypeRefResolver): ApiProperty[] | undefined {
    const wrappers: string[] = [];
    let node = typeNode;
    // The type as annotated: the parameter's own type has `undefined` in it when the parameter is optional.
    let current = node ? checker.getTypeFromTypeNode(node) : checker.getNonNullableType(type);

    // Through the annotation where there is one, through the alias the checker keeps otherwise.
    for (;;) {
        if (node && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && CONFIG_WRAPPERS.has(node.typeName.text) && node.typeArguments?.length === 1) {
            wrappers.push(node.typeName.text);
            node = node.typeArguments[0];
            current = checker.getTypeFromTypeNode(node);
        } else if (!node && current.aliasSymbol && CONFIG_WRAPPERS.has(current.aliasSymbol.name) && current.aliasTypeArguments?.length === 1) {
            wrappers.push(current.aliasSymbol.name);
            current = current.aliasTypeArguments[0];
        } else {
            break;
        }
    }

    if (!isConfigObject(current, checker)) return undefined;

    const { properties } = extractObjectTypeMembers(current, checker, types);

    // The innermost wrapper first: `Partial<Required<T>>` leaves every option optional.
    for (const wrapper of wrappers.reverse()) properties.forEach((option) => applyWrapper(wrapper, option));

    return properties.length > 0 ? properties : undefined;
}

function applyWrapper(wrapper: string, option: ApiProperty): void {
    if (wrapper === 'Partial') option.optional = true;
    else if (wrapper === 'Required') delete option.optional;
    else option.readonly = true;
}

function isConfigObject(type: ts.Type, checker: ts.TypeChecker): boolean {
    if (type.isIntersection()) return type.types.every((part) => isConfigObject(part, checker));
    if (!(type.flags & ts.TypeFlags.Object) || (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Class) return false;

    return !checker.isArrayType(type) && !checker.isTupleType(type) && type.getCallSignatures().length === 0;
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
    return !!(type.flags & ts.TypeFlags.Object) && !!((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference);
}
