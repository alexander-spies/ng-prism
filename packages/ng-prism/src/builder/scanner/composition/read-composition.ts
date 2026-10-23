import { CssSelector } from '@angular/compiler';
import type ts from 'typescript';
import type { DirectiveHost, HostTemplate, ShowcaseConfig, ShowcaseImport, Variant } from '../../../decorator/showcase.types.js';
import type { ComponentComposition, CompositionCase, InputMeta } from '../../../plugin/plugin.types.js';
import { SUBJECT_MARKER_ATTR } from '../../../shared/composition.js';
import { VOID_ELEMENTS } from '../../../shared/void-elements.js';
import { matchHostString } from '../../manifest/host-parser.js';
import type { EvaluationPath } from '../ast-utils.js';
import { describeShowcaseIssue, describeShowcaseOrigin } from '../showcase-diagnostics.js';
import { composeTemplate } from './compose-template.js';
import { type Declarable, resolveShowcaseImports } from './declarables.js';
import { matchDeclarables } from './match-declarables.js';

type Report = (message: string) => void;

/** What the compositions of every showcase in one scan are read against. */
export interface CompositionContext {
    /** The components, directives and pipes the library's entry points export. */
    declarables: readonly Declarable[];
    /** Look up the `imports` of a showcase written in `containingFile`. */
    resolveImports(imports: readonly ShowcaseImport[], containingFile: string): { resolved: Declarable[]; unresolved: ShowcaseImport[] };
}

/** The showcased component or directive, as the scan read it. */
export interface CompositionSubject {
    className: string;
    filePath: string;
    selector: string;
    isDirective: boolean;
    inputs: InputMeta[];
    config: ShowcaseConfig;
    /** The argument of `@Showcase`, which the messages point into. */
    configNode: ts.Expression;
    /**
     * Where each entry of `config.variants` and `config.imports` is written in `configNode`, which differs from its
     * position in the list after the scan dropped an entry before it. Without it, the position in the list.
     */
    sources?: { variants?: readonly number[]; imports?: readonly number[] };
}

/** How a directive's text `content` goes into a template to render as written: no tag, no interpolation, no block. */
const TEXT_ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '{': '&#123;', '}': '&#125;', '@': '&#64;' };

/** The one variant the styleguide renders a showcase without variants as. */
const IMPLICIT_VARIANT: Variant = { name: 'Default' };

/** A directive's string or object host as the host template of a variant template, or why it cannot be one. */
type ElementHost = (HostTemplate & { import?: ShowcaseImport }) | { problem: string };

/**
 * The context of one scan: the library's declarables, without those whose selector Angular cannot parse, each named
 * once in a notice, so that one of them cannot fail every composition; and the lookup of a showcase's `imports` with
 * the scan's compiler options.
 */
export function createCompositionContext(declarables: readonly Declarable[], compilerOptions: ts.CompilerOptions, notify: Report): CompositionContext {
    return {
        declarables: declarables.filter((declarable) => {
            const problem = selectorProblem(declarable);

            if (problem) {
                notify(
                    `${declarable.name} from "${declarable.from}" has the selector "${declarable.selector}", which Angular cannot parse (${problem}); no composition imports it.`
                );
            }
            return !problem;
        }),
        resolveImports: (imports, containingFile) => resolveShowcaseImports(imports, containingFile, compilerOptions)
    };
}

/**
 * Read the compositions of a showcase. A variant is composed when it has a `template` or a host template, its own
 * `host` or else the showcase's; a showcase without variants is one variant. A directive's `template` without a host
 * template renders inside the element of its string or object host, if it has one. Each composed variant gets its
 * template from {@link composeTemplate}, checked with Angular's parser against the library and the showcase's
 * `imports`, and variants with the same template and the same unbound inputs share a case.
 *
 * Each problem is reported against the field it comes from, with the showcase's file, line and variant, and leaves
 * that variant out: it renders as it would without `template` and `host`. Only what Angular may still accept is a
 * notice: an import ng-prism cannot read, an element or a pipe nothing declares while there is one, and a library
 * class that matches only by standard attributes.
 *
 * Mutates `config`: a composed variant loses the HTML `content` of a component inside a host template, and the
 * inputs that the template sets on the subject, each with a diagnostic.
 *
 * `undefined` when no variant is composed. Also when `@angular/compiler` throws, which is one diagnostic for the
 * showcase, so that the build goes on.
 */
export function readComposition(
    subject: CompositionSubject,
    context: CompositionContext,
    reporters: { report: Report; notify: Report }
): ComponentComposition | undefined {
    const { className, config, configNode } = subject;
    const sharedHost = isHostTemplate(config.host) ? config.host : undefined;
    const elementHost = subject.isDirective && !sharedHost ? readElementHost(config.host) : undefined;
    const declared = config.variants ?? [];
    const variants = declared.length > 0 ? declared : [IMPLICIT_VARIANT];
    // Without a template, a variant keeps rendering in a string or object host as it did before.
    const hosts = variants.map((variant) => variant.host ?? sharedHost ?? (variant.template !== undefined ? elementHost : undefined));

    if (!variants.some((variant, index) => variant.template !== undefined || hosts[index] !== undefined)) return undefined;

    const at = (path: EvaluationPath, text: string) => describeShowcaseIssue(className, configNode, path, text);
    // Messages and mutations wait for the end, so that a compiler failure leaves nothing behind but its own diagnostic.
    const pending: Array<() => void> = [];
    const report = (message: string) => pending.push(() => reporters.report(message));
    const notify = (message: string) => pending.push(() => reporters.notify(message));
    // Where the compiler is at, for the diagnostic when it throws.
    let current: EvaluationPath = ['imports'];

    try {
        const hostImport = elementHost && 'import' in elementHost && hosts.includes(elementHost) ? elementHost.import : undefined;
        const { resolved, unresolved } = readImports(subject, hostImport, context, (path, text) => notify(at(path, text)));
        const inputNames = new Map(subject.inputs.map((input) => [input.alias ?? input.name, input.name]));
        const cases: { template: string; unbound: CompositionCase['unbound']; paths: EvaluationPath[] }[] = [];
        const caseIndex = new Map<string, number>();
        const imports = new Map<string, ShowcaseImport>();
        const skipped = new Set<string>();

        const variantCases = variants.map((variant, index) => {
            const host = hosts[index];

            if (variant.template === undefined && host === undefined) return -1;
            if (host && 'problem' in host) {
                report(at(['host'], host.problem));
                return -1;
            }

            const path: EvaluationPath = declared.length > 0 ? ['variants', subject.sources?.variants?.[index] ?? index] : ['host'];
            const hostPath: EvaluationPath = variant.host ? [...path, 'host'] : ['host'];
            const templatePath: EvaluationPath = [...path, 'template'];
            const { content, dropsContent } = subjectContent(variant, subject.isDirective);

            current = variant.template !== undefined ? templatePath : hostPath;

            const composed = composeTemplate({ selector: subject.selector, isDirective: subject.isDirective, inputNames, hostTemplate: host?.template, content });

            if (!composed.ok) {
                report(at(composed.at === 'host' ? hostPath : variant.template !== undefined ? templatePath : [...path, 'content'], composed.problem));
                return -1;
            }

            const match = matchDeclarables(composed.nodes, context.declarables, resolved);
            // A message names the field that writes what it is about: the template when it does, else the host template.
            const fieldOf = (written: (template: string) => boolean) =>
                variant.template !== undefined && (!host || written(variant.template)) ? templatePath : hostPath;
            const undeclared = [
                ...match.unknownElements.map((element) => ({ where: fieldOf((t) => writesElement(t, element)), text: `<${element}> matches no imported component` })),
                ...match.unknownPipes.map((pipe) => ({ where: fieldOf((t) => writesPipe(t, pipe)), text: `pipe "${pipe}" matches no imported pipe` }))
            ];
            const problems = match.ambiguous.map(({ element, classes }) =>
                at(
                    fieldOf((t) => writesElement(t, element)),
                    `<${element}> matches ${andList(classes)}, and Angular allows one component per element (NG0300)`
                )
            );

            // An import ng-prism cannot read may declare what nothing else does, so Angular decides.
            if (unresolved.length > 0) {
                for (const { where, text } of undeclared) notify(at(where, `${text}; an import ng-prism cannot read may declare it, so Angular checks it`));
            } else {
                problems.unshift(...undeclared.map(({ where, text }) => at(where, text)));
            }
            problems.forEach(report);
            if (problems.length > 0) return -1;

            // The wrapper imports the subject anyway, by the path of its entry point.
            for (const { name, from, selector } of match.imports) {
                if (name !== className || selector !== subject.selector) imports.set(`${from} ${name}`, { name, from });
            }
            for (const { element, className: skippedClass } of match.skipped) {
                if (skippedClass !== className) skipped.add(`${skippedClass} on <${element}>`);
            }
            if (dropsContent) {
                report(at([...path, 'content'], 'HTML content cannot be projected into a host template; use template'));
                pending.push(() => delete variant.content);
            }

            const owned = new Set(composed.ownedInputs);
            const unbound = subject.inputs.flatMap(({ name, defaultUnreadable }): CompositionCase['unbound'] => {
                if (owned.has(name)) return [{ name, reason: 'template' }];
                return defaultUnreadable && variant.inputs?.[name] === undefined ? [{ name, reason: 'default' }] : [];
            });

            for (const name of composed.ownedInputs) {
                if (!variant.inputs || !(name in variant.inputs)) continue;
                report(at([...path, 'inputs', name], 'set by the template on the subject; the variant value was dropped'));
                pending.push(() => delete variant.inputs?.[name]);
            }

            // Variants that set an input with an unreadable default and variants that leave it to the subject need a case each.
            const key = JSON.stringify([composed.template, unbound]);
            let caseAt = caseIndex.get(key);

            if (caseAt === undefined) {
                caseAt = cases.push({ template: composed.template, unbound, paths: [] }) - 1;
                caseIndex.set(key, caseAt);
            }
            cases[caseAt].paths.push(path);
            return caseAt;
        });

        if (skipped.size > 0) {
            const [verb, pronoun] = skipped.size === 1 ? ['matches', 'it'] : ['match', 'them'];

            notify(
                at(
                    ['imports'],
                    `${[...skipped].join(', ')} ${verb} only by standard attributes and ${skipped.size === 1 ? 'is' : 'are'} not imported; add ${pronoun} here to apply ${pronoun}`
                )
            );
        }
        pending.forEach((flush) => flush());

        if (cases.length === 0) return undefined;
        for (const entry of unresolved) imports.set(`${entry.from} ${entry.name}`, entry);

        return {
            variantCases,
            cases: cases.map(({ template, unbound, paths }) => ({ template, unbound, origin: describeShowcaseOrigin(configNode, paths) })),
            imports: [...imports.values()]
        };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        reporters.report(at(current, `@angular/compiler failed on it (${reason}); no variant of this showcase renders a template or a host template`));
        return undefined;
    }
}

/**
 * The showcase's `imports`, and the class of an object host a variant template renders in, looked up: a class of the
 * library as it is indexed, anything else through {@link CompositionContext.resolveImports}. What ng-prism can read is
 * matched like a library class, the rest is imported as written, with a notice. That includes an import whose
 * selector Angular cannot parse.
 */
function readImports(
    { config, filePath, sources }: CompositionSubject,
    hostImport: ShowcaseImport | undefined,
    context: CompositionContext,
    notice: (path: EvaluationPath, text: string) => void
): { resolved: Declarable[]; unresolved: ShowcaseImport[] } {
    const listed = (config.imports ?? []).map((entry, index): { entry: ShowcaseImport; path: EvaluationPath } => ({
        entry,
        path: ['imports', sources?.imports?.[index] ?? index]
    }));

    if (hostImport) listed.push({ entry: hostImport, path: ['host', 'import'] });

    const isEntry = (entry: ShowcaseImport) => (declarable: Declarable) => declarable.name === entry.name && declarable.from === entry.from;
    const fromLibrary = listed.flatMap(({ entry }) => context.declarables.filter(isEntry(entry)));
    const elsewhere = listed.filter(({ entry }) => !fromLibrary.some(isEntry(entry))).map(({ entry }) => entry);
    const looked = elsewhere.length > 0 ? context.resolveImports(elsewhere, filePath).resolved : [];
    const resolved = [...fromLibrary, ...looked.filter((declarable) => !selectorProblem(declarable))];
    const unresolved = listed.filter(({ entry }) => !resolved.some(isEntry(entry)));

    for (const { entry, path } of unresolved) {
        notice(
            path,
            `"${entry.name}" from "${entry.from}" is not a component, directive or pipe ng-prism can read; it is imported as written and Angular checks the template`
        );
    }
    return { resolved, unresolved: unresolved.map(({ entry }) => entry) };
}

/**
 * A directive's string or object host as the host template of a variant template: the one element the host names,
 * marked as the subject, with the static inputs of an object host as attributes and its class to import. The text a
 * string host holds is left out, as the template replaces it. `undefined` for no host or an empty string.
 */
function readElementHost(host: ShowcaseConfig['host']): ElementHost | undefined {
    const consequence = 'so the variants render without their template';

    if (typeof host === 'string') {
        if (host.trim() === '') return undefined;

        const parsed = matchHostString(host);

        return parsed
            ? { template: markedElement(parsed.tag, parsed.attrs) }
            : { problem: `${JSON.stringify(host)} is not one element ("<tag attrs>" or "<tag>text</tag>") for a variant template to render in, ${consequence}` };
    }
    if (typeof host !== 'object' || host === null) return undefined;

    const { selector, import: hostImport, inputs } = host as Partial<DirectiveHost>;

    if (typeof selector !== 'string' || selector === '' || !hostImport?.name || !hostImport.from) {
        return { problem: `an object host needs a selector and an import { name, from } for a variant template to render in, ${consequence}` };
    }

    const attributes = Object.entries(inputs ?? {}).map(([name, value]) => `${name}="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);

    return { template: markedElement(selector, attributes.join(' ')), import: { name: hostImport.name, from: hostImport.from } };
}

function markedElement(tag: string, attributes: string): string {
    const opening = `<${tag}${attributes ? ` ${attributes}` : ''} ${SUBJECT_MARKER_ATTR}`;

    return VOID_ELEMENTS.has(tag.toLowerCase()) ? `${opening} />` : `${opening}></${tag}>`;
}

/**
 * What a composed variant puts into its subject: its template, or the text `content` of a directive, escaped. A
 * component's `content` is HTML, which cannot go into a host template, the only way such a variant is composed.
 */
function subjectContent(variant: Variant, isDirective: boolean): { content?: string; dropsContent: boolean } {
    if (variant.template !== undefined) return { content: variant.template, dropsContent: false };
    if (variant.content === undefined) return { dropsContent: false };
    if (!isDirective) return { dropsContent: true };
    return { content: typeof variant.content === 'string' && variant.content !== '' ? escapeText(variant.content) : undefined, dropsContent: false };
}

function escapeText(text: string): string {
    return text.replace(/[&<{}@]/g, (char) => TEXT_ENTITIES[char]);
}

/** Why Angular cannot parse the selector of a declarable, `undefined` when it can or there is none. */
function selectorProblem({ selector }: Declarable): string | undefined {
    if (selector === undefined) return undefined;
    try {
        CssSelector.parse(selector);
        return undefined;
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
}

function isHostTemplate(host: ShowcaseConfig['host']): host is HostTemplate {
    return typeof host === 'object' && host !== null && typeof (host as Partial<HostTemplate>).template === 'string';
}

function writesElement(template: string, element: string): boolean {
    return new RegExp(`<${escapeRegExp(element)}[\\s/>]`, 'i').test(template);
}

function writesPipe(template: string, pipe: string): boolean {
    return new RegExp(`\\|\\s*${escapeRegExp(pipe)}(?![\\w$])`).test(template);
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `A and B`, `A, B and C`. */
function andList(items: readonly string[]): string {
    return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
