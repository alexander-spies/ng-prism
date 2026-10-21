import ts from 'typescript';
import type { ApiMethod, ApiParam, ApiProperty, ApiTypeRef } from '../../../plugin/service.types.js';
import { getClassHierarchy } from '../class-hierarchy.js';
import { isDocumented, isInternal, readDescription, readDocTags, readParamDescriptions } from './doc-tags.js';

/**
 * Turns the type of a member, parameter or return value into an {@link ApiTypeRef}.
 * `reachedFrom` says where it was met, e.g. `parameter of show()`, for a
 * resolver that documents the types it finds on the way.
 */
export interface TypeRefResolver {
    ref(typeNode: ts.TypeNode | undefined, type: ts.Type, reachedFrom: string): ApiTypeRef;
}

/** The lifecycle hooks Angular calls on a service; they are not part of what a user calls. */
const LIFECYCLE_HOOKS = new Set([
    'ngOnInit',
    'ngOnDestroy',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterContentInit',
    'ngAfterContentChecked',
    'ngAfterViewInit',
    'ngAfterViewChecked'
]);

type Accessor = ts.GetAccessorDeclaration | ts.SetAccessorDeclaration;
type NamedMember = ts.PropertyDeclaration | ts.MethodDeclaration | Accessor;

/** A type as written, or as the checker prints it when there is nothing written. Whitespace is collapsed, so a multi-line literal type stays on one line. */
export function readTypeText(checker: ts.TypeChecker, typeNode: ts.TypeNode | undefined, type: ts.Type): string {
    return typeNode ? collapseWhitespace(typeNode.getText()) : checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
}

/** Gives the text of a type and nothing else: no links, no documented types. */
export function textOnlyResolver(checker: ts.TypeChecker): TypeRefResolver {
    return {
        ref: (typeNode, type) => ({ text: readTypeText(checker, typeNode, type) })
    };
}

/**
 * The public instance members of a class and of its base classes, nearest
 * class first and in source order. A class that declares a name hides it in
 * the classes above, whatever it declares: an `@internal` override removes
 * the member, a redeclaration replaces the inherited one. A static member
 * hides nothing, as it is not an instance member.
 *
 * Left out: `private`, `protected` and `#` members, names with a `_` prefix,
 * lifecycle hooks, the constructor, statics and what is tagged `@internal`.
 * Methods are listed with or without JSDoc.
 */
export function extractMembers(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker, types: TypeRefResolver): { properties: ApiProperty[]; methods: ApiMethod[] } {
    const properties: ApiProperty[] = [];
    const methods: ApiMethod[] = [];
    const declared = new Set<string>();

    for (const { classDecl: current } of getClassHierarchy(classDecl, checker).classes) {
        const groups = groupByName(current);

        for (const [name, group] of groups) {
            if (declared.has(name)) continue;

            // The doc block sits on one of them: the first overload, or the getter or the setter.
            const documented = group.find(isDocumented) ?? group[0];

            if (!isPublicApi(name, group, documented)) continue;

            if (ts.isMethodDeclaration(documented)) methods.push(extractMethod(name, documented, checker, types));
            else properties.push(extractProperty(name, group as (ts.PropertyDeclaration | Accessor)[], documented, checker, types));
        }

        for (const name of groups.keys()) declared.add(name);
    }

    return { properties, methods };
}

/** The named instance members of a class by name: a getter and its setter, or the overloads of a method, share one entry. */
function groupByName(classDecl: ts.ClassDeclaration): Map<string, NamedMember[]> {
    const groups = new Map<string, NamedMember[]>();

    for (const member of classDecl.members) {
        if (!(ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member))) continue;
        if (hasModifier(member, ts.SyntaxKind.StaticKeyword)) continue;

        const name = getMemberName(member);

        if (name === undefined) continue;

        groups.set(name, [...(groups.get(name) ?? []), member]);
    }

    return groups;
}

function isPublicApi(name: string, group: NamedMember[], documented: NamedMember): boolean {
    if (name.startsWith('_') || LIFECYCLE_HOOKS.has(name)) return false;
    if (group.some((member) => hasModifier(member, ts.SyntaxKind.PrivateKeyword) || hasModifier(member, ts.SyntaxKind.ProtectedKeyword))) return false;

    return !isInternal(documented);
}

function extractProperty(
    name: string,
    group: (ts.PropertyDeclaration | Accessor)[],
    documented: ts.PropertyDeclaration | Accessor,
    checker: ts.TypeChecker,
    types: TypeRefResolver
): ApiProperty {
    const getter = group.find(ts.isGetAccessorDeclaration);
    const setter = group.find(ts.isSetAccessorDeclaration);
    // A property reads its type from the getter, and from the setter's parameter when there is none.
    const typeNode = ts.isPropertyDeclaration(documented) ? documented.type : (getter?.type ?? setter?.parameters[0]?.type);
    const property: ApiProperty = {
        name,
        type: types.ref(typeNode, checker.getTypeAtLocation(documented), `type of ${name}`),
        readonly: ts.isPropertyDeclaration(documented) ? hasModifier(documented, ts.SyntaxKind.ReadonlyKeyword) : !!getter && !setter,
        tags: readDocTags(documented)
    };

    if (ts.isPropertyDeclaration(documented) && documented.questionToken) property.optional = true;

    const description = readDescription(documented);

    if (description) property.description = description;

    return property;
}

function extractMethod(name: string, method: ts.MethodDeclaration, checker: ts.TypeChecker, types: TypeRefResolver): ApiMethod {
    const signature = checker.getSignatureFromDeclaration(method);
    const returnType = signature ? checker.getReturnTypeOfSignature(signature) : checker.getTypeAtLocation(method);
    const descriptions = readParamDescriptions(method);
    const result: ApiMethod = {
        name,
        params: method.parameters.filter((param) => !isThisParameter(param)).map((param) => extractParam(name, param, descriptions, checker, types)),
        returnType: types.ref(method.type, returnType, `returned by ${name}()`),
        tags: readDocTags(method)
    };
    const description = readDescription(method);

    if (description) result.description = description;

    return result;
}

function extractParam(methodName: string, param: ts.ParameterDeclaration, descriptions: Map<string, string>, checker: ts.TypeChecker, types: TypeRefResolver): ApiParam {
    const name = ts.isIdentifier(param.name) ? param.name.text : collapseWhitespace(param.name.getText());
    const result: ApiParam = {
        name,
        type: types.ref(param.type, checker.getTypeAtLocation(param), `parameter of ${methodName}()`),
        optional: !!(param.questionToken || param.initializer)
    };

    if (param.dotDotDotToken) result.rest = true;
    if (param.initializer) result.defaultValue = collapseWhitespace(param.initializer.getText());

    const description = descriptions.get(name);

    if (description) result.description = description;

    return result;
}

function isThisParameter(param: ts.ParameterDeclaration): boolean {
    return ts.isIdentifier(param.name) && param.name.text === 'this';
}

/** `#private` and computed names have none: neither is part of the API a user reads. */
function getMemberName(member: ts.ClassElement): string | undefined {
    if (!member.name) return undefined;
    if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) return member.name.text;

    return undefined;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((modifier) => modifier.kind === kind);
}

function collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}
