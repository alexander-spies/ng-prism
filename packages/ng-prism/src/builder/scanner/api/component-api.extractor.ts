import ts from 'typescript';
import type { ComponentApi, InputMeta, OutputMeta } from '../../../plugin/plugin.types.js';
import type { ApiTypeRef } from '../../../plugin/service.types.js';
import { modelChangeOutput } from '../../../shared/model-outputs.js';
import { findDecorator } from '../ast-utils.js';
import type { ClassHierarchy } from '../class-hierarchy.js';
import { findInputDeclaration, findOutputDeclaration, getInstantiatedType, isModelInput, usesTypeParameters } from '../input.extractor.js';
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

        if (isModelInput(declaration.member)) modelChanges.push({ input: name, event: modelChangeOutput(pub), type: ref });
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

    if (findDecorator(member, 'Input')) {
        const instantiated = readInstantiatedType(declaration, member.type ?? member.initializer, name, classDecl, checker);

        return instantiated ? { node: undefined, type: instantiated } : { node: member.type, type: checker.getTypeAtLocation(member) };
    }

    // Without the decorator, an input is a member initialized by a call to `input()` or `model()`.
    const call = member.initializer as ts.CallExpression;
    const node = call.typeArguments?.[0];
    const instantiated = readInstantiatedType(declaration, node ?? call.arguments[0], name, classDecl, checker);
    const signal = instantiated ?? checker.getTypeAtLocation(member);

    // A signal is a getter function, so its call signature returns the value type.
    return { node: instantiated ? undefined : node, type: signal.getCallSignatures()[0]?.getReturnType() ?? signal };
}

/**
 * What an output emits: the type argument of its type, `OutputEmitterRef<T>`
 * or `EventEmitter<T>`, which is `void` for an `output()` without one. It is
 * shown as written in `output<T>()`, `new EventEmitter<T>()` or the annotation.
 */
function readOutputPayload(declaration: Declaration, name: string, classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): TypeSource {
    const { member } = declaration;
    const node = readCreatedPayload(member.initializer) ?? readAnnotatedPayload(member.type);
    const instantiated = readInstantiatedType(declaration, node, name, classDecl, checker);
    const emitter = instantiated ?? checker.getTypeAtLocation(member);
    const isReference = emitter.flags & ts.TypeFlags.Object && (emitter as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference;
    // A type without type arguments says nothing about what it emits.
    const type = (isReference ? checker.getTypeArguments(emitter as ts.TypeReference)[0] : undefined) ?? checker.getUnknownType();

    return { node: instantiated ? undefined : node, type };
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
 * The type of a member of a generic base class as the showcased class
 * instantiates it, when what the member is declared with names the base's
 * type parameters: `model<T>()` in `Field<T>` is a `number` on a class that
 * extends `Field<number>`, and its annotation, which says `T`, is not shown.
 * `undefined` for a member that does not use them, as `extractInputs`
 * decides it: that one keeps its annotation, with the links in it.
 */
function readInstantiatedType(
    { owner }: Declaration,
    declared: ts.Node | undefined,
    name: string,
    classDecl: ts.ClassDeclaration,
    checker: ts.TypeChecker
): ts.Type | undefined {
    return owner !== classDecl && usesTypeParameters(declared, owner, checker) ? getInstantiatedType(name, classDecl, checker) : undefined;
}
