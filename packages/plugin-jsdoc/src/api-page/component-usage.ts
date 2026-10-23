import type { ScannedComponent } from '@ng-prism/core/plugin';
import { importLines, joinUsageBlocks } from './service-usage.js';

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
 */
export function generateComponentUsage(component: ScannedComponent): string {
    const { className, componentMeta, showcaseConfig } = component;
    // A component renders itself; only a directive needs an element to sit on. A `{ template }` host is not shown yet.
    const configured = componentMeta.isDirective ? showcaseConfig.host : undefined;
    const host = typeof configured === 'object' && 'template' in configured ? undefined : configured;
    const hostImport = host && typeof host !== 'string' ? host.import : undefined;

    return joinUsageBlocks([
        importLines(component, hostImport ? [hostImport] : []),
        ['// in the component that uses it', `@Component({ imports: [${[className, hostImport?.name].filter(Boolean).join(', ')}], … })`],
        ['// in its template', templateLine(component, host)]
    ]);
}

function templateLine({ inputs, componentMeta }: ScannedComponent, host: Exclude<ScannedComponent['showcaseConfig']['host'], { template: string }>): string {
    const selector = parseSelector(componentMeta.selector);
    const hostElement = typeof host === 'string' ? parseHostString(host) : host && { element: host.selector, attributes: hostAttributes(host.inputs) };
    const element = hostElement?.element ?? selector.element ?? 'div';
    const required = inputs.filter((input) => input.required).map((input) => ({ publicName: input.alias ?? input.name, member: input.name }));
    // A binding takes the place of the bare attribute the selector asks for.
    const selectorAttributes = selector.attributes.filter((attribute) => !required.some(({ publicName }) => publicName === attribute.name));
    const attributes = [
        ...(hostElement?.attributes ?? []),
        ...selectorAttributes.map(({ name, value }) => (value === undefined ? name : `${name}="${value}"`)),
        ...required.map(({ publicName, member }) => `[${publicName}]="${member}"`)
    ];
    const opening = [element, ...attributes].join(' ');

    return element.includes('-') || VOID_ELEMENTS.has(element) ? `<${opening} />` : `<${opening}></${element}>`;
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
