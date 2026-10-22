import ts from 'typescript';
import type { ApiMethod, ApiParam, ApiProperty, ApiTypeRef } from '../../../plugin/service.types.js';
import { getClassHierarchy } from '../class-hierarchy.js';
import { isDocumented, isInternal, readDescription, readDocTags, readParamDescriptions } from './doc-tags.js';

/** What a type is the type of: a property, a parameter of a method, or what a method returns. */
export type TypeSite = { kind: 'property'; name: string } | { kind: 'parameter'; name: string; method: string } | { kind: 'return'; method: string };

/**
 * Turns the type of a member, parameter or return value into an {@link ApiTypeRef}.
 * `reachedFrom` says where it was met, e.g. `parameter of show()`, and `site`
 * the same in parts, for a resolver that documents the types it finds on the
 * way and follows their members.
 */
export interface TypeRefResolver {
    ref(typeNode: ts.TypeNode | undefined, type: ts.Type, reachedFrom: string, site?: TypeSite): ApiTypeRef;
}

/** The lifecycle hooks Angular calls on a service or a component; they are not part of what a user calls. */
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
type NamedMember = ts.PropertyDeclaration | ts.MethodDeclaration | Accessor | ts.ParameterPropertyDeclaration;
type PropertyLike = ts.PropertyDeclaration | ts.PropertySignature | Accessor | ts.ParameterPropertyDeclaration;

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
 * The constructor's parameter properties (`constructor(readonly id: string)`)
 * are properties, in the constructor's place, described by its `@param`.
 * Methods are listed with or without JSDoc. A redeclaration without JSDoc of
 * its own keeps its signature, but takes description, tags and `@param` texts
 * from the nearest base class member of that name that has them.
 */
export function extractMembers(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker, types: TypeRefResolver): { properties: ApiProperty[]; methods: ApiMethod[] } {
    const properties: ApiProperty[] = [];
    const methods: ApiMethod[] = [];

    for (const { name, group, declaration, docs } of collectPublicMembers(classDecl, checker)) {
        if (ts.isMethodDeclaration(declaration)) methods.push(extractMethod(name, declaration, docs, checker, types));
        else properties.push(extractProperty(name, group as PropertyLike[], declaration, docs, checker, types));
    }

    return { properties, methods };
}

/**
 * The methods {@link extractMembers} lists, but only those with docs of their
 * own or taken from a base class member of that name. A component's public
 * methods are often only there for its own template; the documented ones are
 * those meant to be called from outside.
 */
export function extractDocumentedMethods(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker, types: TypeRefResolver): ApiMethod[] {
    return collectPublicMembers(classDecl, checker).flatMap(({ name, declaration, docs }) =>
        ts.isMethodDeclaration(declaration) && isDocumented(docs) ? [extractMethod(name, declaration, docs, checker, types)] : []
    );
}

/** A public member, found by {@link collectPublicMembers}. */
interface PublicMember {
    name: string;
    /** Its declarations in the class that declares it: the overloads of a method, or a getter and its setter. */
    group: NamedMember[];
    /** The one of them that carries the doc block, or the first. */
    declaration: NamedMember;
    /** The node its docs are read from: `declaration`, or the base class member it takes them from. */
    docs: NamedMember;
}

/** The walk behind {@link extractMembers}: hierarchy, exclusions and inherited docs, properties and methods in one list. */
function collectPublicMembers(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): PublicMember[] {
    const members: PublicMember[] = [];
    const declared = new Set<string>();
    const levels = getClassHierarchy(classDecl, checker).classes.map(({ classDecl: current }) => groupByName(current));

    levels.forEach((groups, level) => {
        for (const [name, group] of groups) {
            if (declared.has(name)) continue;

            // The doc block sits on one of them: the first overload, or the getter or the setter.
            const declaration = group.find(hasOwnDocs) ?? group[0];

            if (!isPublicApi(name, group, declaration)) continue;

            const docs = hasOwnDocs(declaration) ? declaration : (findInheritedDocs(levels.slice(level + 1), name) ?? declaration);

            members.push({ name, group, declaration, docs });
        }

        for (const name of groups.keys()) declared.add(name);
    });

    return members;
}

/**
 * The members of an interface or an object literal type, the inherited ones
 * included, own members first. What is tagged `@internal` is left out; there
 * is nothing private to leave out.
 */
export function extractObjectTypeMembers(type: ts.Type, checker: ts.TypeChecker, types: TypeRefResolver): { properties: ApiProperty[]; methods: ApiMethod[] } {
    const properties: ApiProperty[] = [];
    const methods: ApiMethod[] = [];

    for (const symbol of checker.getPropertiesOfType(type)) {
        const group = (symbol.declarations ?? []).filter(
            (d): d is ts.MethodSignature | ts.MethodDeclaration | PropertyLike =>
                ts.isMethodSignature(d) ||
                ts.isMethodDeclaration(d) ||
                ts.isPropertySignature(d) ||
                ts.isPropertyDeclaration(d) ||
                ts.isGetAccessor(d) ||
                ts.isSetAccessor(d)
        );
        const declaration = group.find(isDocumented) ?? group[0];

        if (!declaration || isInternal(declaration)) continue;

        if (ts.isMethodSignature(declaration) || ts.isMethodDeclaration(declaration)) methods.push(extractMethod(symbol.name, declaration, declaration, checker, types));
        else properties.push(extractProperty(symbol.name, group as PropertyLike[], declaration, declaration, checker, types));
    }

    return { properties, methods };
}

/**
 * The named instance members of a class by name, in source order: a getter and
 * its setter, or the overloads of a method, share one entry. The parameter
 * properties of the constructor come in where the constructor stands.
 */
function groupByName(classDecl: ts.ClassDeclaration): Map<string, NamedMember[]> {
    const groups = new Map<string, NamedMember[]>();
    const add = (name: string, member: NamedMember) => groups.set(name, [...(groups.get(name) ?? []), member]);

    for (const member of classDecl.members) {
        if (ts.isConstructorDeclaration(member)) {
            for (const param of member.parameters) {
                if (ts.isParameterPropertyDeclaration(param, member)) add(param.name.text, param);
            }
            continue;
        }
        if (!(ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member))) continue;
        if (hasModifier(member, ts.SyntaxKind.StaticKeyword)) continue;

        const name = getMemberName(member);

        if (name !== undefined) add(name, member);
    }

    return groups;
}

/**
 * Whether a member is documented where it is declared: by a doc block of its
 * own, or, for a parameter property, by the constructor's `@param` for it.
 */
function hasOwnDocs(member: NamedMember): boolean {
    return isDocumented(member) || (ts.isParameter(member) && readParamDescriptions(member.parent).has(member.name.text));
}

function isPublicApi(name: string, group: NamedMember[], declaration: NamedMember): boolean {
    if (name.startsWith('_') || LIFECYCLE_HOOKS.has(name)) return false;
    if (group.some((member) => hasModifier(member, ts.SyntaxKind.PrivateKeyword) || hasModifier(member, ts.SyntaxKind.ProtectedKeyword))) return false;

    // Only its own block: a member is internal where it is declared, as for `stripInternal`.
    return !isInternal(declaration);
}

/** The documented declaration of a name in the nearest of the given base classes that has one. */
function findInheritedDocs(levels: Map<string, NamedMember[]>[], name: string): NamedMember | undefined {
    for (const groups of levels) {
        const documented = groups.get(name)?.find(hasOwnDocs);

        if (documented) return documented;
    }

    return undefined;
}

/** `docs` is the node the doc block is read from: the declaration itself, or a declaration it inherits the docs of. */
function extractProperty(name: string, group: PropertyLike[], declaration: PropertyLike, docs: ts.Node, checker: ts.TypeChecker, types: TypeRefResolver): ApiProperty {
    const getter = group.find(ts.isGetAccessorDeclaration);
    const setter = group.find(ts.isSetAccessorDeclaration);
    const isField = ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration) || ts.isParameter(declaration);
    // A property reads its type from the getter, and from the setter's parameter when there is none.
    const typeNode = isField ? declaration.type : (getter?.type ?? setter?.parameters[0]?.type);
    const property: ApiProperty = {
        name,
        type: types.ref(typeNode, checker.getTypeAtLocation(declaration), `type of ${name}`, { kind: 'property', name }),
        readonly: isField ? hasModifier(declaration, ts.SyntaxKind.ReadonlyKeyword) : !!getter && !setter,
        tags: readDocTags(docs)
    };

    if (isField && declaration.questionToken) property.optional = true;

    // A parameter property has its text in the constructor's `@param`, unless it carries a block of its own.
    const description =
        readDescription(docs) ?? (ts.isParameter(docs) && ts.isIdentifier(docs.name) ? readParamDescriptions(docs.parent).get(docs.name.text) : undefined);

    if (description) property.description = description;

    return property;
}

/**
 * The signature of a method, or of a function such as a setup function, with
 * the doc block read from `docs`: the declaration itself, the statement of a
 * `const` arrow function, or a declaration it inherits the docs of.
 */
export function extractMethod(name: string, declaration: ts.SignatureDeclaration, docs: ts.Node, checker: ts.TypeChecker, types: TypeRefResolver): ApiMethod {
    const signature = checker.getSignatureFromDeclaration(declaration);
    const returnType = signature ? checker.getReturnTypeOfSignature(signature) : checker.getTypeAtLocation(declaration);
    const descriptions = readParamDescriptions(docs);
    const result: ApiMethod = {
        name,
        params: declaration.parameters.filter((param) => !isThisParameter(param)).map((param) => extractParam(name, param, descriptions, checker, types)),
        returnType: types.ref(declaration.type, returnType, `returned by ${name}()`, { kind: 'return', method: name }),
        tags: readDocTags(docs)
    };
    const description = readDescription(docs);

    if (description) result.description = description;

    return result;
}

function extractParam(methodName: string, param: ts.ParameterDeclaration, descriptions: Map<string, string>, checker: ts.TypeChecker, types: TypeRefResolver): ApiParam {
    const name = ts.isIdentifier(param.name) ? param.name.text : collapseWhitespace(param.name.getText());
    const result: ApiParam = {
        name,
        type: types.ref(param.type, checker.getTypeAtLocation(param), `parameter of ${methodName}()`, { kind: 'parameter', name, method: methodName }),
        optional: !!(param.questionToken || param.initializer)
    };

    if (param.dotDotDotToken) result.rest = true;
    if (param.initializer) result.defaultValue = collapseWhitespace(param.initializer.getText());

    const description = descriptions.get(name);

    if (description) result.description = description;

    return result;
}

/** The first parameter that is not `this`. */
export function firstParameter(declaration: ts.SignatureDeclaration): ts.ParameterDeclaration | undefined {
    return declaration.parameters.find((param) => !isThisParameter(param));
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

export function collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}
