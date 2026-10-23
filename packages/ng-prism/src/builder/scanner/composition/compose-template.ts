import {
    BindingType,
    CssSelector,
    parseTemplate,
    SelectorMatcher,
    type TmplAstElement,
    type TmplAstNode,
    TmplAstRecursiveVisitor,
    tmplAstVisitAll
} from '@angular/compiler';
import { COMPOSITION_SUBJECT_SLOT, SUBJECT_MARKER_ATTR } from '../../../shared/composition.js';
import { VOID_ELEMENTS } from '../../../shared/void-elements.js';
import { selectorElement } from '../../manifest/selector-element.js';

export interface ComposeInput {
    selector: string;
    isDirective: boolean;
    /** Public input name (alias ?? name) → member name. */
    inputNames: ReadonlyMap<string, string>;
    hostTemplate?: string;
    /** Inner markup of the subject: the variant's template, or a directive's text content already escaped. */
    content?: string;
}

export type ComposeResult = { ok: true; template: string; ownedInputs: string[]; nodes: TmplAstNode[] } | { ok: false; at: 'host' | 'template'; problem: string };

type Failure = Extract<ComposeResult, { ok: false }>;

/** A composition before its last check: the template with the slot, and the inputs it sets on the subject. */
type Composed = { ok: true; template: string; ownedInputs: string[] } | Failure;

/** The URL the parser files the composition under. A problem carries only Angular's `msg`, so it shows nowhere. */
const TEMPLATE_URL = 'prism-composition.html';

/**
 * The template of a composition: the subject in its host template, or written from its selector without one, with
 * `content` as what it holds. {@link COMPOSITION_SUBJECT_SLOT} marks the end of the subject's start tag, right after
 * its last attribute or its tag name; whoever replaces it brings the leading space.
 *
 * In a host template the subject is the element marked with `prism-subject`, else the one element its selector
 * matches. A directive whose selector does not match the marked element gets the attributes that make it match.
 * The marker is removed, and `content` replaces what the subject holds in the host template. `ownedInputs` are the
 * member names of the inputs the host template sets on the subject.
 *
 * What fails is reported against the field it comes from: `host` for the host template and finding the subject in
 * it, `template` for the content and, when there is content, for what Angular's parser rejects in the composed
 * template.
 */
export function composeTemplate(input: ComposeInput): ComposeResult {
    const composed = input.hostTemplate === undefined ? composeWithoutHost(input) : composeInHost(input, input.hostTemplate);

    if (!composed.ok) return composed;

    const parsed = parseTemplate(composed.template.replace(COMPOSITION_SUBJECT_SLOT, ''), TEMPLATE_URL);
    const error = parsed.errors?.[0];

    // Without content the host template alone was parsed, so a remaining error is still its own.
    if (error) return fail(input.content === undefined ? 'host' : 'template', error.msg);
    return { ...composed, nodes: parsed.nodes };
}

function composeWithoutHost({ selector, content }: ComposeInput): Composed {
    const element = selectorElement(selector);

    if (!element) return fail('template', `the selector "${selector}" names no element to render the subject on`);

    const { tag, attributes } = element;
    const opening = `<${tag}${attributes ? ` ${attributes}` : ''}${COMPOSITION_SUBJECT_SLOT}`;

    if (VOID_ELEMENTS.has(tag.toLowerCase())) {
        return content ? voidContent(tag) : { ok: true, template: `${opening} />`, ownedInputs: [] };
    }
    return { ok: true, template: `${opening}>${content ?? ''}</${tag}>`, ownedInputs: [] };
}

function composeInHost(input: ComposeInput, hostTemplate: string): Composed {
    const parsed = parseTemplate(hostTemplate, TEMPLATE_URL, { preserveWhitespaces: true });
    const error = parsed.errors?.[0];

    if (error) return fail('host', error.msg);

    const subject = findSubject(parsed.nodes, input.selector);

    if ('problem' in subject) return subject;

    const { element, matched } = subject;
    const tag = writtenTag(element, hostTemplate);
    let added = '';

    if (!matched) {
        if (!input.isDirective) return fail('host', `prism-subject marks <${tag}>, which the selector "${input.selector}" does not match`);

        const fitting = selectorElement(input.selector, tag);

        if (!fitting?.attributes) return fail('host', `prism-subject marks <${tag}>, but no part of the selector "${input.selector}" fits a <${tag}>`);
        added = ` ${fitting.attributes}`;
    }

    const isVoid = VOID_ELEMENTS.has(tag.toLowerCase());

    if (isVoid && input.content) return voidContent(tag);

    const edits: Edit[] = [];
    const startTagEnd = element.startSourceSpan.end.offset;
    const slotAt = slotOffset(hostTemplate, startTagEnd);
    const slot: Edit = { from: slotAt, to: slotAt, text: `${added}${COMPOSITION_SUBJECT_SLOT}` };
    const marker = element.attributes.find((attribute) => attribute.name === SUBJECT_MARKER_ATTR);

    if (marker) {
        edits.push({ from: skipWhitespaceBack(hostTemplate, marker.sourceSpan.start.offset), to: marker.sourceSpan.end.offset, text: '' });
    }

    if (!isVoid && input.content !== undefined) {
        if (!element.isSelfClosing) {
            // An element whose end tag the parser implies holds everything up to the end of its span.
            const childrenEnd = element.endSourceSpan?.start.offset ?? element.sourceSpan.end.offset;

            edits.push({ from: startTagEnd, to: childrenEnd, text: input.content });
        } else if (input.content) {
            slot.to = startTagEnd;
            slot.text += `>${input.content}</${tag}>`;
        }
    }
    edits.push(slot);

    return { ok: true, template: applyEdits(hostTemplate, edits), ownedInputs: ownedInputs(element, input) };
}

/** The subject of a host template, and whether its selector matches it, which only a marked element may fail. */
function findSubject(nodes: TmplAstNode[], selector: string): { element: TmplAstElement; matched: boolean } | Failure {
    const elements = collectElements(nodes);
    const marked = elements.filter((element) => element.attributes.some((attribute) => attribute.name === SUBJECT_MARKER_ATTR));

    if (marked.length > 1) return fail('host', `prism-subject marks ${marked.length} elements of the host template; mark one`);

    const matcher = new SelectorMatcher();

    matcher.addSelectables(CssSelector.parse(selector));

    const matches = (element: TmplAstElement) => matcher.match(elementSelector(element), null);

    if (marked.length === 1) return { element: marked[0], matched: matches(marked[0]) };

    const matching = elements.filter(matches);

    if (matching.length === 0) return fail('host', `the selector "${selector}" matches no element of the host template`);
    if (matching.length > 1) return fail('host', `the selector "${selector}" matches ${matching.length} elements of the host template; mark one with prism-subject`);
    return { element: matching[0], matched: true };
}

class ElementCollector extends TmplAstRecursiveVisitor {
    readonly elements: TmplAstElement[] = [];

    override visitElement(element: TmplAstElement): void {
        this.elements.push(element);
        super.visitElement(element);
    }
}

/** Every element of a template, also those in control flow blocks and in `<ng-template>`, in document order. */
function collectElements(nodes: TmplAstNode[]): TmplAstElement[] {
    const collector = new ElementCollector();

    tmplAstVisitAll(collector, nodes);
    return collector.elements;
}

/** What a directive matcher sees of an element, built the way Angular builds it: tag, static attributes and classes, bound inputs and outputs. */
function elementSelector(element: TmplAstElement): CssSelector {
    const selector = new CssSelector();

    selector.setElement(localName(element.name));
    for (const attribute of element.attributes) {
        selector.addAttribute(attribute.name, attribute.value);
        if (attribute.name.toLowerCase() === 'class') {
            for (const className of attribute.value.trim().split(/\s+/)) {
                if (className) selector.addClassName(className);
            }
        }
    }
    for (const bound of element.inputs) {
        if (isInputBinding(bound.type)) selector.addAttribute(bound.name, '');
    }
    for (const output of element.outputs) {
        selector.addAttribute(output.name, '');
    }
    return selector;
}

/**
 * The member names of the inputs that the host template sets on the subject, statically or by a property binding.
 * An attribute without a value that the selector names is there to match it (`<button libTooltip>`), so ng-prism
 * still binds the input of that name.
 */
function ownedInputs(element: TmplAstElement, { selector, inputNames }: ComposeInput): string[] {
    const selectorAttributes = new Set(CssSelector.parse(selector).flatMap((part) => part.attrs.filter((_, i) => i % 2 === 0)));
    const written = new Set<string>();

    for (const attribute of element.attributes) {
        if (attribute.value !== '' || !selectorAttributes.has(attribute.name)) written.add(attribute.name);
    }
    for (const bound of element.inputs) {
        if (isInputBinding(bound.type)) written.add(bound.name);
    }

    return [...inputNames].filter(([publicName]) => written.has(publicName)).map(([, member]) => member);
}

/** `[name]` and `[(name)]`; attribute, class, style and animation bindings set no input. */
function isInputBinding(type: BindingType): boolean {
    return type === BindingType.Property || type === BindingType.TwoWay;
}

/** The parser names an element in a namespace `:svg:rect`; selectors match the local name. */
function localName(name: string): string {
    return name.replace(/^:[^:]+:/, '');
}

/** The tag name as the host template writes it, which is what an end tag and a message repeat. */
function writtenTag(element: TmplAstElement, source: string): string {
    const start = element.startSourceSpan.start.offset;

    return /^<([^\s/>]+)/.exec(source.slice(start, element.startSourceSpan.end.offset))?.[1] ?? localName(element.name);
}

/** Where the slot goes in a start tag ending at `startTagEnd`: before its `>` or `/>` and the whitespace in front of it. */
function slotOffset(source: string, startTagEnd: number): number {
    let offset = startTagEnd - 1;

    if (source[offset - 1] === '/') offset--;
    return skipWhitespaceBack(source, offset);
}

function skipWhitespaceBack(source: string, offset: number): number {
    while (offset > 0 && /\s/.test(source[offset - 1])) offset--;
    return offset;
}

interface Edit {
    from: number;
    to: number;
    text: string;
}

/** Applies edits that do not overlap, from the last to the first, so that the offsets of the others stay valid. */
function applyEdits(source: string, edits: Edit[]): string {
    return [...edits].sort((a, b) => b.from - a.from).reduce((text, edit) => text.slice(0, edit.from) + edit.text + text.slice(edit.to), source);
}

function voidContent(tag: string): Failure {
    return fail('template', `<${tag}> is a void element and takes no content`);
}

function fail(at: Failure['at'], problem: string): Failure {
    return { ok: false, at, problem };
}
