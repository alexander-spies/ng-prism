import { COMPOSITION_SUBJECT_SLOT, type CompositionCase, type InputMeta, type ScannedComponent } from '@ng-prism/core/plugin';
import { importLines, joinUsageBlocks, type UsageImport } from './service-usage.js';

type ShowcaseHost = ScannedComponent['showcaseConfig']['host'];
type HostTemplate = Extract<ShowcaseHost, { template: string }>;

/** Elements that have no closing tag. */
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/**
 * The snippet that shows how to use a component or directive: the import, the
 * `imports` entry of the component that uses it, and one line of template.
 *
 * It is generated from the scanned selector and inputs, not taken from the
 * author, so it shows the minimum that works: the required inputs, bound to a
 * member of the same name, and nothing else. A directive goes where the
 * showcase puts it: on the `host` element, or on a plain element of its own.
 * A `{ template }` host is the exception: the snippet shows the subject inside
 * that markup, as the first variant that has one renders it.
 */
export function generateComponentUsage(component: ScannedComponent): string {
    const { className, componentMeta, showcaseConfig } = component;
    const configured = showcaseConfig.host;
    const composed = isHostTemplate(configured) ? firstCase(component) : undefined;
    // A component renders itself; only a directive needs an element to sit on.
    const host = componentMeta.isDirective && !isHostTemplate(configured) ? configured : undefined;
    const hostImport = host && typeof host !== 'string' ? host.import : undefined;
    const extraImports: UsageImport[] = composed ? (component.composition?.imports ?? []) : hostImport ? [hostImport] : [];

    return joinUsageBlocks([
        importLines(component, extraImports),
        ['// in the component that uses it', `@Component({ imports: [${[className, ...extraImports.map(({ name }) => name)].join(', ')}], … })`],
        ['// in its template', composed ? compositionLine(component, composed) : templateLine(component, host)]
    ]);
}

/** `null` is no host, though `typeof null` is `'object'`: a config from untyped code may carry one. */
function isHostTemplate(host: ShowcaseHost): host is HostTemplate {
    return !!host && typeof host === 'object' && 'template' in host;
}

/** The case of the first variant that has a composition: what the styleguide shows first. */
function firstCase({ composition }: ScannedComponent): CompositionCase | undefined {
    const index = composition?.variantCases.find((candidate) => candidate >= 0);

    return index === undefined ? undefined : composition?.cases[index];
}

/**
 * The template of a case as its author wrote it, with the required inputs on the
 * subject element in place of the slot. A required input the template sets
 * itself is not bound a second time.
 */
function compositionLine({ inputs }: ScannedComponent, { template, unbound }: CompositionCase): string {
    const owned = new Set(unbound.filter(({ reason }) => reason === 'template').map(({ name }) => name));
    const bindings = requiredInputs(inputs)
        .filter(({ member }) => !owned.has(member))
        .map(binding);

    // Split and join, not replace: a member name may hold `$`, which `replace` would read as a pattern.
    return template.split(COMPOSITION_SUBJECT_SLOT).join(bindings.length ? ` ${bindings.join(' ')}` : '');
}

function templateLine({ inputs, componentMeta }: ScannedComponent, host: Exclude<ShowcaseHost, HostTemplate>): string {
    const selector = parseSelector(componentMeta.selector);
    const hostElement = typeof host === 'string' ? parseHostString(host) : host && { element: host.selector, attributes: hostAttributes(host.inputs) };
    const element = hostElement?.element ?? selector.element ?? 'div';
    const required = requiredInputs(inputs);
    // A binding takes the place of the bare attribute the selector asks for.
    const selectorAttributes = selector.attributes.filter((attribute) => !required.some(({ publicName }) => publicName === attribute.name));
    const attributes = [
        ...(hostElement?.attributes ?? []),
        ...selectorAttributes.map(({ name, value }) => (value === undefined ? name : `${name}="${value}"`)),
        ...required.map(binding)
    ];
    const opening = [element, ...attributes].join(' ');

    return element.includes('-') || VOID_ELEMENTS.has(element) ? `<${opening} />` : `<${opening}></${element}>`;
}

/** The required inputs in source order, each by the name a template binds it under and the member it is bound to. */
function requiredInputs(inputs: InputMeta[]): { publicName: string; member: string }[] {
    return inputs.filter((input) => input.required).map((input) => ({ publicName: input.alias ?? input.name, member: input.name }));
}

function binding({ publicName, member }: { publicName: string; member: string }): string {
    return `[${publicName}]="${member}"`;
}

interface ParsedSelector {
    element?: string;
    attributes: { name: string; value?: string }[];
}

const SELECTOR_PART = /\[([\w-]+)(?:=(["']?)([^\]"']*)\2)?]|\.([\w-]+)/g;

/**
 * The first selector of a list as an element and attributes. A class becomes
 * the `class` attribute; negations, other attribute operators and pseudo
 * classes say nothing about what to write, so they are left out.
 */
function parseSelector(selector: string): ParsedSelector {
    const first = selector
        .split(',')[0]
        .trim()
        .replace(/:not\([^)]*\)/g, '');
    const element = first.match(/^[a-zA-Z][\w-]*/)?.[0];
    const attributes: ParsedSelector['attributes'] = [];

    for (const [, name, , value, className] of first.slice(element?.length ?? 0).matchAll(SELECTOR_PART)) {
        const classAttribute = attributes.find((attribute) => attribute.name === 'class');

        if (className === undefined) attributes.push({ name, value });
        else if (classAttribute) classAttribute.value += ` ${className}`;
        else attributes.push({ name: 'class', value: className });
    }

    return { element, attributes };
}

/**
 * The opening tag a string host starts with and its attributes as written;
 * undefined when the string does not start with a tag. A host may carry
 * content and a closing tag (`<button class="btn">Hover me</button>`): the
 * showcase renders all of it, the snippet only needs the element to put the
 * directive on.
 */
function parseHostString(host: string): { element: string; attributes: string[] } | undefined {
    const match = host.match(/^\s*<\s*([a-zA-Z][\w-]*)([^>]*?)\s*\/?\s*>/);

    if (!match) return undefined;
    return { element: match[1], attributes: match[2].trim() ? [match[2].trim()] : [] };
}

/** Strings are attributes; numbers and booleans need a binding to stay what they are; anything else is bound to a member of that name. */
function hostAttributes(inputs: Record<string, unknown> | undefined): string[] {
    return Object.entries(inputs ?? {}).map(([name, value]) => {
        if (typeof value === 'string') return `${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
        if (typeof value === 'number' || typeof value === 'boolean') return `[${name}]="${value}"`;
        return `[${name}]="${name}"`;
    });
}
