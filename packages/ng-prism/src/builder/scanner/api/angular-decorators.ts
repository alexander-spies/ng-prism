import ts from 'typescript';
import type { ServiceProvision } from '../../../plugin/service.types.js';
import { evaluateExpression, evaluateStatic, findDecorator, getDecoratorArgument, UNEVALUABLE } from '../ast-utils.js';

const ANGULAR_CORE = '@angular/core';

/**
 * `@Showcase` fields that only a component can use. A class that carries
 * one of them next to `@Injectable` or `@Pipe` is a component with that
 * decorator, not a service or a pipe: showing it as one would drop the field.
 */
const COMPONENT_ONLY_FIELDS = ['variants', 'states', 'providers', 'bg', 'canvasLayout', 'host', 'renderPage', 'imports'] as const;

/** The values of `providedIn` that make Angular provide a service without anyone listing it. */
const AUTO_PROVIDED_IN: readonly unknown[] = ['root', 'platform', 'any'];

export type ShowcaseClassKind =
    | { kind: 'component' }
    /** `decorator` is the `@Injectable` or `@Service` that makes it one. */
    | { kind: 'service'; decorator: ts.Decorator }
    /** `decorator` is the `@Pipe` that makes it one; whether the pipe is shown is for the pipe scan to decide. */
    | { kind: 'pipe'; decorator: ts.Decorator }
    /**
     * An `@Injectable`, `@Service` or `@Pipe` that still declares component-only `fields`, so it stays a component for now.
     * `source` says which decorator would make it a service or a pipe; `standalone: false` only for a pipe declared in an NgModule.
     */
    | { kind: 'legacy-component'; fields: string[]; source: 'injectable' | 'pipe'; standalone?: false };

/** What the `@Pipe` metadata says, as far as the source can be read. */
export interface PipeOptions {
    /** Missing when the source does not give it as a string constant: the pipe cannot be shown without its name. */
    name?: string;
    /** `true` when the metadata does not say, missing when it says something the scan cannot read. */
    pure?: boolean;
    /** Only `false` when the metadata statically says `standalone: false`; Angular's default is `true`. */
    standalone: boolean;
}

type AngularCoreDecoratorName = 'Injectable' | 'Service' | 'Component' | 'Directive' | 'Pipe';

/**
 * {@link findDecorator} for an Angular decorator, found by the name it has in
 * `@angular/core` rather than in the file: `import { Injectable as Service }`
 * makes `@Service` Angular's `Injectable`, and `import * as ng` makes
 * `@ng.Pipe` its `Pipe`. A `@Service` from a dependency-injection package of
 * another name has nothing to do with Angular's.
 *
 * The scanner never imports `Service` itself, since Angular 20 has none: the
 * decorator is recognised in the source alone.
 */
export function findAngularCoreDecorator(classDecl: ts.ClassDeclaration, name: AngularCoreDecoratorName, checker: ts.TypeChecker): ts.Decorator | undefined {
    return ts.getDecorators(classDecl)?.find((decorator) => angularCoreName(decorator, checker) === name);
}

/**
 * Tell a service or a pipe from a component. They all carry `@Showcase`, and
 * the only thing that tells them apart is the Angular decorator beside it.
 *
 * A class with `@Component` or `@Directive` is a component, whatever else it
 * carries. Otherwise `@Pipe` makes it a pipe, and `@Service` or `@Injectable`
 * a service, so that a pipe that is also injectable stays a pipe. Either is
 * overruled by the `@Showcase` argument declaring a component-only field: such
 * a class has been shown as a component so far, so it stays one
 * (`legacy-component`) until 23.0.0, and the scan says why. That check comes
 * first, before anything is said about the pipe itself.
 *
 * `showcaseArg` is read from the literal and from the evaluated value, since a
 * constant or a spread can bring the field in and a field the evaluator cannot
 * read is still in the literal.
 */
export function classifyShowcaseClass(classDecl: ts.ClassDeclaration, showcaseArg: ts.Expression | undefined, checker: ts.TypeChecker): ShowcaseClassKind {
    // Compared by name, as everywhere else in the scanner.
    if (findDecorator(classDecl, 'Component') || findDecorator(classDecl, 'Directive')) return { kind: 'component' };

    const pipe = findAngularCoreDecorator(classDecl, 'Pipe', checker);

    if (pipe) {
        const fields = readComponentOnlyFields(showcaseArg, checker);

        if (fields.length === 0) return { kind: 'pipe', decorator: pipe };

        return readPipeOptions(pipe, checker).standalone
            ? { kind: 'legacy-component', fields, source: 'pipe' }
            : { kind: 'legacy-component', fields, source: 'pipe', standalone: false };
    }

    const decorator = findAngularCoreDecorator(classDecl, 'Service', checker) ?? findAngularCoreDecorator(classDecl, 'Injectable', checker);

    if (!decorator) return { kind: 'component' };

    const fields = readComponentOnlyFields(showcaseArg, checker);

    return fields.length > 0 ? { kind: 'legacy-component', fields, source: 'injectable' } : { kind: 'service', decorator };
}

/**
 * Whether Angular provides the service on its own (`auto`) or the user has to
 * list it in a providers array (`manual`).
 *
 * `@Service()` is auto-provided unless it says `autoProvided: false`;
 * `@Injectable` is when `providedIn` is `'root'`, `'platform'` or `'any'`.
 * Anything else, such as no argument, no `providedIn`, a module class or a value
 * the scan cannot read, is `manual`, without a warning: a service nobody
 * provides is a normal thing to document.
 */
export function readProvision(decorator: ts.Decorator, checker: ts.TypeChecker): ServiceProvision {
    const isService = angularCoreName(decorator, checker) === 'Service';
    const arg = getDecoratorArgument(decorator);

    if (!arg) return isService ? 'auto' : 'manual';

    let unreadable = false;
    const raw = evaluateStatic(arg, {
        checker,
        report: (issue) => {
            // A `factory` is a runtime value and always dropped, which leaves the provision alone.
            if (isService && issue.path[0] === 'autoProvided') unreadable = true;
        }
    });

    if (raw === UNEVALUABLE || typeof raw !== 'object' || raw === null) return 'manual';

    const options = raw as Record<string, unknown>;

    if (isService) return unreadable || options['autoProvided'] === false ? 'manual' : 'auto';

    return AUTO_PROVIDED_IN.includes(options['providedIn']) ? 'auto' : 'manual';
}

/**
 * Read `name`, `pure` and `standalone` from the `@Pipe` metadata.
 *
 * Nothing that cannot be read is guessed: a `name` or `pure` the source does not
 * give as a constant is left out, so that the caller can say so, while
 * `standalone` only counts as `false` when the source says exactly that.
 */
export function readPipeOptions(decorator: ts.Decorator, checker: ts.TypeChecker): PipeOptions {
    const arg = getDecoratorArgument(decorator);
    let unreadable = false;
    const raw = arg
        ? evaluateStatic(arg, {
              checker,
              report: (issue) => {
                  // The whole argument or a spread that fails could have carried `pure` along, so it counts for it too.
                  if (issue.path.length === 0 || issue.path[0] === 'pure') unreadable = true;
              }
          })
        : {};
    const options = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const result: PipeOptions = { standalone: options['standalone'] !== false };

    if (typeof options['name'] === 'string') result.name = options['name'];

    if (typeof options['pure'] === 'boolean') result.pure = options['pure'];
    else if (!unreadable && options['pure'] === undefined) result.pure = true;

    return result;
}

/**
 * The name a decorator has in `@angular/core`, or `undefined` when it does not
 * come from there: the imported name of an identifier, whatever it is called
 * in the file, or the member of a namespace import.
 */
function angularCoreName(decorator: ts.Decorator, checker: ts.TypeChecker): string | undefined {
    const expr = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;

    if (ts.isIdentifier(expr)) {
        const specifier = checker.getSymbolAtLocation(expr)?.declarations?.find(ts.isImportSpecifier);

        return specifier && importsAngularCore(specifier.parent.parent.parent) ? (specifier.propertyName ?? specifier.name).text : undefined;
    }

    if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
        const namespace = checker.getSymbolAtLocation(expr.expression)?.declarations?.find(ts.isNamespaceImport);

        return namespace && importsAngularCore(namespace.parent.parent) ? expr.name.text : undefined;
    }

    return undefined;
}

function importsAngularCore(importDeclaration: { moduleSpecifier: ts.Expression }): boolean {
    return ts.isStringLiteral(importDeclaration.moduleSpecifier) && importDeclaration.moduleSpecifier.text === ANGULAR_CORE;
}

function readComponentOnlyFields(showcaseArg: ts.Expression | undefined, checker: ts.TypeChecker): string[] {
    if (!showcaseArg) return [];

    const declared = new Set<string>();

    if (ts.isObjectLiteralExpression(showcaseArg)) {
        for (const prop of showcaseArg.properties) {
            if (prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) declared.add(prop.name.text);
        }
    }

    const evaluated = evaluateExpression(showcaseArg, checker);

    if (typeof evaluated === 'object' && evaluated !== null) {
        for (const key of Object.keys(evaluated)) declared.add(key);
    }

    return COMPONENT_ONLY_FIELDS.filter((field) => declared.has(field));
}
