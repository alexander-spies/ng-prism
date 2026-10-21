import ts from 'typescript';
import type { ComponentStatus, ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';
import { CANVAS_LAYOUTS, type CanvasLayout } from '../../shared/canvas-layout.type.js';
import { evaluateExpression, evaluateStatic, findDecorator, getDecoratorArgument, UNEVALUABLE } from './ast-utils.js';
import { getClassHierarchy } from './class-hierarchy.js';
import { extractInputs, extractOutputs } from './input.extractor.js';
import { describeValue, readPseudoStates } from './pseudo-states.js';
import { classifyShowcaseClass } from './service/angular-decorators.js';
import {
    describeDeprecatedProviders,
    describeLegacyServiceComponent,
    describeSetupOnComponent,
    describeUnevaluable,
    describeUnreadableBase
} from './showcase-diagnostics.js';
import { readShowcaseStates } from './showcase-states.js';

const COMPONENT_STATUSES = ['stable', 'beta', 'wip', 'deprecated'] as const;

function isComponentStatus(value: unknown): value is ComponentStatus {
    return typeof value === 'string' && (COMPONENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Backgrounds that still work but should not be reached for any more.
 *
 * `checker` draws the same checkerboard as `transparent` while browsing, so
 * the canvas cannot tell them apart. It captures as `--prism-bg-surface`, though,
 * a *theme* token, which makes a baseline recorded on it depend on the theme
 * the runner's browser started in. Since `transparent` took over as the
 * default, it is the value that looks like transparency and is not.
 *
 * Only warned about: the value is valid, and rejecting it would change what a
 * component renders on, which is a breaking change. Scheduled for removal in
 * 23.0.0, the next Angular-aligned major.
 */
const DEPRECATED_BGS: Partial<Record<CanvasBg, string>> = {
    checker: "use 'transparent' for the same look with a capture that keeps its alpha, or 'light'/'dark' for an absolute colour"
};

function warnDeprecatedBg(bg: CanvasBg, where: string): void {
    const advice = DEPRECATED_BGS[bg];

    if (!advice) return;
    console.warn(`⚠ ng-prism: ${where} declares bg "${bg}", which is deprecated and will ` + `be removed in 23.0.0; ${advice}.`);
}

function isCanvasBg(value: unknown): value is CanvasBg {
    return typeof value === 'string' && (CANVAS_BGS as readonly string[]).includes(value);
}

function isCanvasLayout(value: unknown): value is CanvasLayout {
    return typeof value === 'string' && (CANVAS_LAYOUTS as readonly string[]).includes(value);
}

type Report = (message: string) => void;

/**
 * Scan exported symbols for Angular components annotated with @Showcase.
 * A class with `@Injectable` or `@Service` is a service and is left to the
 * service scan, unless it declares fields only a component can use.
 *
 * Every @Showcase value the scan has to drop is printed and collected in
 * `diagnostics`, once: sharing the array across entry points keeps a
 * component exported from several of them from repeating its warnings.
 * `notices` does the same for warnings about what a component inherits,
 * which are not diagnostics.
 */
export function scanComponents(exports: ts.Symbol[], checker: ts.TypeChecker, diagnostics: string[] = [], notices = new Set<string>()): ScannedComponent[] {
    const components: ScannedComponent[] = [];
    const report: Report = (message) => {
        if (diagnostics.includes(message)) return;
        diagnostics.push(message);
        console.warn(`⚠ ng-prism: ${message}`);
    };
    const notify = (message: string) => {
        if (notices.has(message)) return;
        notices.add(message);
        console.warn(`⚠ ng-prism: ${message}`);
    };

    for (const sym of exports) {
        const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

        const classDecl = resolved.declarations?.find(ts.isClassDeclaration);

        if (!classDecl) continue;

        // Perf: cheap pre-filter that skips the full decorator walk for files that don't
        // mention Showcase at all. False positives (string-literal containing "@Showcase")
        // just lose the optimization for that file; correctness is unaffected.
        if (!classDecl.getSourceFile().text.includes('@Showcase')) continue;

        const showcaseDecorator = findDecorator(classDecl, 'Showcase');

        if (!showcaseDecorator) continue;

        const className = classDecl.name?.text ?? 'Anonymous';
        const showcaseArg = getDecoratorArgument(showcaseDecorator);
        const classKind = classifyShowcaseClass(classDecl, showcaseArg, checker);

        if (classKind.kind === 'service') continue;

        const showcaseConfig = extractShowcaseConfig(showcaseDecorator, className, report, checker);

        if (!showcaseConfig) continue;

        // Not a diagnostic: the component still works, and strictShowcase must not fail the build over a notice about 23.0.0.
        if (classKind.kind === 'legacy-component') notify(describeLegacyServiceComponent(className, classKind.fields));

        const setup = showcaseArg && findSetupProperty(showcaseArg);

        if (setup) report(describeSetupOnComponent(className, setup));

        const componentMeta = extractComponentMeta(classDecl, checker);
        const hierarchy = getClassHierarchy(classDecl, checker);
        const inputs = extractInputs(classDecl, checker, hierarchy);
        const outputs = extractOutputs(classDecl, checker, hierarchy);

        const filePath = classDecl.getSourceFile().fileName;
        const decoratorInputs = hierarchy.classes.find((c) => c.definesMetadata && hasDecoratorInputs(c.classDecl))?.classDecl;

        if (decoratorInputs) {
            const where =
                decoratorInputs === classDecl ? 'uses @Input() decorators' : `inherits @Input() decorators from ${decoratorInputs.name?.text ?? 'an anonymous class'},`;

            notify(`${className} ${where} which are not fully supported. Migrate to input() signals for full ng-prism support.`);
        }

        // Not diagnostics: strictShowcase would fail the build over a base
        // class in a package, which the component's author cannot change.
        for (const base of hierarchy.unreadable) {
            notify(describeUnreadableBase(className, base));
        }

        components.push({
            className,
            filePath,
            showcaseConfig,
            inputs,
            outputs,
            componentMeta,
            // Plugins look a base class up by name, so an anonymous one is of no use to them.
            baseClasses: hierarchy.classes
                .slice(1)
                .flatMap(({ classDecl: base }) => (base.name ? [{ className: base.name.text, filePath: base.getSourceFile().fileName }] : []))
        });
    }

    return components;
}

function hasDecoratorInputs(classDecl: ts.ClassDeclaration): boolean {
    for (const member of classDecl.members) {
        if (!ts.isPropertyDeclaration(member)) continue;
        if (findDecorator(member, 'Input')) return true;
    }
    return false;
}

/** Only the literal: a `setup` that arrives through a spread or a constant is dropped without a word. */
function findSetupProperty(arg: ts.Expression): ts.ObjectLiteralElementLike | undefined {
    if (!ts.isObjectLiteralExpression(arg)) return undefined;

    return arg.properties.find((p) => p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'setup');
}

/**
 * `setup` is read for services only, so a component's is never part of the
 * config: the issue the evaluator raises for its function is swallowed here,
 * and {@link scanComponents} says what is wrong with it instead.
 */
export function extractShowcaseConfig(decorator: ts.Decorator, className: string, report: Report, checker: ts.TypeChecker): ShowcaseConfig | undefined {
    const arg = getDecoratorArgument(decorator);

    if (!arg) return undefined;

    // Reported once for the whole field below, wherever it came from: the literal, a spread or a constant.
    let providers: ts.Node | undefined;
    // A state the evaluator dropped whole leaves no element behind, so its position is noted to keep the later states where the source has them.
    const unevaluableStates = new Set<number>();
    const raw = evaluateStatic(arg, {
        checker,
        report: (issue) => {
            if (issue.path[0] === 'setup') return;
            if (issue.path[0] === 'providers') {
                providers ??= issue.node;
                return;
            }
            if (issue.path[0] === 'states' && issue.path.length === 2 && typeof issue.path[1] === 'number') unevaluableStates.add(issue.path[1]);
            report(describeUnevaluable(className, arg, issue));
        }
    });

    if (providers || (typeof raw === 'object' && raw !== null && 'providers' in raw)) {
        report(describeDeprecatedProviders(className, arg, providers));
    }

    if (raw === UNEVALUABLE || !raw || typeof raw !== 'object') return undefined;

    if (!('title' in raw)) {
        report(`${className} has @Showcase without a "title" field, skipping. ` + `Add a title so it can appear in the styleguide.`);
        return undefined;
    }

    const obj = raw as Record<string, unknown>;
    const config: ShowcaseConfig = {
        title: obj['title'] as string
    };

    if (obj['description']) config.description = obj['description'] as string;
    if (obj['category']) config.category = obj['category'] as string;
    if (obj['section']) config.section = obj['section'] as string;
    if (typeof obj['sectionOrder'] === 'number') {
        config.sectionOrder = obj['sectionOrder'];
    }
    if (typeof obj['categoryOrder'] === 'number') {
        config.categoryOrder = obj['categoryOrder'];
    }
    if (typeof obj['componentOrder'] === 'number') {
        config.componentOrder = obj['componentOrder'];
    }
    if (obj['tags']) config.tags = obj['tags'] as string[];
    if (obj['meta']) config.meta = obj['meta'] as Record<string, unknown>;
    if (obj['host'] !== undefined) config.host = obj['host'] as ShowcaseConfig['host'];
    if (obj['renderPage']) config.renderPage = obj['renderPage'] as string;

    if (obj['states'] !== undefined) {
        if (config.renderPage) {
            report(`${className} declares states together with renderPage; a component page has no Overview to show them in. Skipping states.`);
        } else {
            const states = readShowcaseStates(obj['states'], className, report, unevaluableStates);

            if (states) config.states = states;
        }
    }

    if (obj['status'] !== undefined) {
        if (isComponentStatus(obj['status'])) {
            config.status = obj['status'];
        } else {
            report(`${className} declares invalid status "${String(obj['status'])}", ` + `expected one of: ${COMPONENT_STATUSES.join(', ')}. Skipping.`);
        }
    }

    if (obj['bg'] !== undefined) {
        if (isCanvasBg(obj['bg'])) {
            config.bg = obj['bg'];
            warnDeprecatedBg(obj['bg'], className);
        } else {
            report(`${className} declares invalid bg "${String(obj['bg'])}", ` + `expected one of: ${CANVAS_BGS.join(', ')}. Skipping.`);
        }
    }

    if (obj['canvasLayout'] !== undefined) {
        if (isCanvasLayout(obj['canvasLayout'])) {
            config.canvasLayout = obj['canvasLayout'];
        } else {
            report(`${className} declares invalid canvasLayout "${String(obj['canvasLayout'])}", ` + `expected one of: ${CANVAS_LAYOUTS.join(', ')}. Skipping.`);
        }
    }

    if (Array.isArray(obj['variants'])) {
        config.variants = (obj['variants'] as Array<Record<string, unknown>>).map((variant) => {
            const cleaned: Record<string, unknown> = { ...variant };

            if (isCanvasBg(variant['bg'])) {
                warnDeprecatedBg(variant['bg'], `${className} variant "${String(variant['name'])}"`);
            }
            if (variant['bg'] !== undefined && !isCanvasBg(variant['bg'])) {
                report(
                    `${className} variant "${String(variant['name'])}" declares ` +
                        `invalid bg "${String(variant['bg'])}", expected one of: ` +
                        `${CANVAS_BGS.join(', ')}. Skipping.`
                );
                delete cleaned['bg'];
            }
            if (variant['canvasLayout'] !== undefined && !isCanvasLayout(variant['canvasLayout'])) {
                report(
                    `${className} variant "${String(variant['name'])}" declares ` +
                        `invalid canvasLayout "${String(variant['canvasLayout'])}", expected one of: ${CANVAS_LAYOUTS.join(', ')}. Skipping.`
                );
                delete cleaned['canvasLayout'];
            }
            if (variant['pseudo'] !== undefined) {
                const pseudo = readPseudoStates(variant['pseudo'], `${className} variant "${String(variant['name'])}"`, report);

                if (pseudo) cleaned['pseudo'] = pseudo;
                else delete cleaned['pseudo'];
            }
            if (variant['states'] !== undefined && variant['states'] !== false) {
                report(`${className} variant "${String(variant['name'])}" declares invalid states ${describeValue(variant['states'])}, expected false. Skipping.`);
                delete cleaned['states'];
            }
            return cleaned;
        }) as unknown as ShowcaseConfig['variants'];
    }

    return config;
}

function extractComponentMeta(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ScannedComponent['componentMeta'] {
    const componentDecorator = findDecorator(classDecl, 'Component');
    const decorator = componentDecorator ?? findDecorator(classDecl, 'Directive');
    const isDirective = !componentDecorator && decorator !== undefined;
    const arg = decorator && getDecoratorArgument(decorator);

    if (!arg) return { selector: '', standalone: true, isDirective };

    const selector = readDecoratorField(arg, 'selector', checker);

    return {
        selector: typeof selector === 'string' ? selector : '',
        standalone: readDecoratorField(arg, 'standalone', checker) !== false,
        isDirective
    };
}

/**
 * One field of `@Component`/`@Directive` metadata, read from its own
 * property where the literal has one, so that `imports`, `providers` and the
 * rest are not resolved only to be thrown away. A spread or a shorthand could
 * supply the field from elsewhere, so then the whole argument is evaluated.
 */
function readDecoratorField(arg: ts.Expression, key: string, checker: ts.TypeChecker): unknown {
    if (ts.isObjectLiteralExpression(arg) && !arg.properties.some(ts.isSpreadAssignment)) {
        const prop = arg.properties.find((p) => p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === key);

        if (!prop) return undefined;
        if (ts.isPropertyAssignment(prop)) return evaluateExpression(prop.initializer, checker);
    }

    const raw = evaluateExpression(arg, checker);

    return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)[key] : undefined;
}
