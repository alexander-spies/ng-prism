import ts from 'typescript';
import type { ComponentApi, InputMeta, OutputMeta } from '../../../plugin/plugin.types.js';
import type { ApiTypeRef } from '../../../plugin/service.types.js';
import { findDecorator } from '../ast-utils.js';
import type { ClassHierarchy } from '../class-hierarchy.js';
import { findInputDeclaration, findOutputDeclaration, getInstantiatedType, isModelInput } from '../input.extractor.js';
import { readDescription, readDocTags } from './doc-tags.js';
import type { ExportIndex } from './export-index.js';
import { extractDocumentedMethods } from './member.extractor.js';
import { createTypeCollector } from './type-collector.js';

/** An input or output, where Angular takes it from. */
interface Declaration {
    member: ts.PropertyDeclaration;
    owner: ts.ClassDeclaration;
}

/** A type, and the annotation it is written as when there is one to show. */
interface TypeSource {
    node: ts.TypeNode | undefined;
    type: ts.Type;
}

/**
 * What the API page of a component or directive shows beyond `inputs` and
 * `outputs`: the type of each input and the payload of each output, the
 * change output of each `model()`, the documented methods, the description
 * and tags of the class, and every documented type all of them reach, the
 * inputs first, then the outputs, then the methods.
 */
export function extractComponentApi(
    classDecl: ts.ClassDeclaration,
    inputs: InputMeta[],
    outputs: OutputMeta[],
    hierarchy: ClassHierarchy,
    checker: ts.TypeChecker,
    exportIndex: ExportIndex
): ComponentApi {
    const collector = createTypeCollector(checker, exportIndex);
    const inputTypes: Record<string, ApiTypeRef> = {};
    const outputTypes: Record<string, ApiTypeRef> = {};
    const modelChanges: ComponentApi['modelChanges'] = [];

    for (const { name, alias } of inputs) {
        const declaration = findInputDeclaration(hierarchy, name);

        if (!declaration) continue;

        // A type is reached by the name a template binds.
        const pub = alias ?? name;
        const { node, type } = readInputType(declaration, name, classDecl, checker);
        const ref = collector.ref(node, type, `type of ${pub}`, { kind: 'property', name: pub });

        inputTypes[name] = ref;

        if (isModelInput(declaration.member)) modelChanges.push({ input: name, event: `${pub}Change`, type: ref });
    }

    for (const { name, alias } of outputs) {
        const declaration = findOutputDeclaration(hierarchy, name);

        if (!declaration) continue;

        const pub = alias ?? name;
        const { node, type } = readOutputPayload(declaration, name, classDecl, checker);

        outputTypes[name] = collector.ref(node, type, `payload of ${pub}`, { kind: 'property', name: pub });
    }

    const methods = extractDocumentedMethods(classDecl, checker, collector);
    const api: ComponentApi = { tags: readDocTags(classDecl), inputTypes, outputTypes, modelChanges, methods, types: collector.drain() };
    const description = readDescription(classDecl);

    if (description) api.description = description;

    return api;
}

/**
 * The value an input takes, shown as written where it is written: the type
 * argument of `input()` or `model()`, or the annotation of an `@Input()`.
 * The type itself comes from the checker, so an input without either has one too.
 */
function readInputType(declaration: Declaration, name: string, classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): TypeSource {
    const { member } = declaration;
    const generic = isGenericBase(declaration, classDecl);
    const propertyType = readPropertyType(declaration, name, classDecl, checker);

    if (findDecorator(member, 'Input')) return { node: generic ? undefined : member.type, type: propertyType };

    // Without the decorator, an input is a member initialized by a call to `input()` or `model()`.
    const call = member.initializer as ts.CallExpression;

    // A signal is a getter function, so its call signature returns the value type.
    return { node: generic ? undefined : call.typeArguments?.[0], type: propertyType.getCallSignatures()[0]?.getReturnType() ?? propertyType };
}

/**
 * What an output emits: the type argument of its type, `OutputEmitterRef<T>`
 * or `EventEmitter<T>`, which is `void` for an `output()` without one. It is
 * shown as written in `output<T>()`, `new EventEmitter<T>()` or the annotation.
 */
function readOutputPayload(declaration: Declaration, name: string, classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): TypeSource {
    const { member } = declaration;
    const propertyType = readPropertyType(declaration, name, classDecl, checker);
    const isReference = propertyType.flags & ts.TypeFlags.Object && (propertyType as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference;
    // A type without type arguments says nothing about what it emits.
    const type = (isReference ? checker.getTypeArguments(propertyType as ts.TypeReference)[0] : undefined) ?? checker.getUnknownType();

    if (isGenericBase(declaration, classDecl)) return { node: undefined, type };

    return { node: readCreatedPayload(member.initializer) ?? readAnnotatedPayload(member.type), type };
}

/** `output<T>()` and `new EventEmitter<T>()`. */
function readCreatedPayload(initializer: ts.Expression | undefined): ts.TypeNode | undefined {
    if (initializer && ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression) && initializer.expression.text === 'output') {
        return initializer.typeArguments?.[0];
    }
    if (initializer && ts.isNewExpression(initializer) && ts.isIdentifier(initializer.expression) && initializer.expression.text === 'EventEmitter') {
        return initializer.typeArguments?.[0];
    }

    return undefined;
}

/** `EventEmitter<T>`, `OutputEmitterRef<T>` or `Observable<T>` as annotated. */
function readAnnotatedPayload(typeNode: ts.TypeNode | undefined): ts.TypeNode | undefined {
    return typeNode && ts.isTypeReferenceNode(typeNode) ? typeNode.typeArguments?.[0] : undefined;
}

/**
 * Written in a generic base class, an annotation names the base's type
 * parameters: `model<T>()` in `Field<T>` is a `number` on a class that
 * extends `Field<number>`. There the type is read as the class instantiates
 * it, and there is no annotation to show.
 */
function isGenericBase({ owner }: Declaration, classDecl: ts.ClassDeclaration): boolean {
    return owner !== classDecl && !!owner.typeParameters?.length;
}

function readPropertyType(declaration: Declaration, name: string, classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ts.Type {
    const instantiated = isGenericBase(declaration, classDecl) ? getInstantiatedType(name, classDecl, checker) : undefined;

    return instantiated ?? checker.getTypeAtLocation(declaration.member);
}
