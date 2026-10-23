import {
    type BindingPipe,
    CombinedRecursiveAstVisitor,
    CssSelector,
    DomElementSchemaRegistry,
    SelectorMatcher,
    TmplAstElement,
    type TmplAstNode,
    type TmplAstTemplate
} from '@angular/compiler';
import type { Declarable } from './declarables.js';
import { elementSelector, localName } from './template-elements.js';

/** What a composed template uses of the declarables it can see, and what it uses that none of them declares. */
export interface DeclarableMatch {
    /** Library matches that name something the author wrote, plus every explicit import. Deduplicated by from + name. */
    imports: Declarable[];
    /**
     * Elements neither standard HTML nor matched by an imported component or directive: as in Angular, an element a
     * directive matches (`<lib-outlet>`) counts as declared. Excludes ng-container, ng-template, ng-content.
     */
    unknownElements: string[];
    /** Pipe names no library or explicit pipe declares. */
    unknownPipes: string[];
    /** Elements two or more imported library components match, which Angular rejects with NG0300. */
    ambiguous: { element: string; classes: string[] }[];
    /** Library matches left out by the written-name rule, for a notice. */
    skipped: { element: string; className: string }[];
}

/** Elements that Angular renders itself, which the DOM schema does not list. */
const ANGULAR_ELEMENTS: ReadonlySet<string> = new Set(['ng-container', 'ng-template', 'ng-content']);

let domSchema: DomElementSchemaRegistry | undefined;

type MatchedNode = TmplAstElement | TmplAstTemplate;

interface Hit {
    declarable: Declarable;
    /** Whether the declarable is one of the showcase's own `imports`. */
    explicit: boolean;
    /** Whether the part of its selector that matched names something the author wrote. */
    written: boolean;
}

/**
 * Decide what the wrapper of a composed template imports, and find what the template uses that nothing declares.
 *
 * A library class is imported when its selector matches an element (or an `<ng-template>`) of the template and the
 * part that matched names something the author wrote: a custom element, which has a `-` in its name, or an attribute
 * that is no DOM property of the element. A class does not count. So `<input type="email">` does not pull in a
 * library directive for `input[type=email]`, which a consumer of the library would not get without importing it
 * either. A library pipe is imported when the template calls it by name. The `explicit` declarables, the resolved
 * `imports` of the showcase, are always imported, and they declare elements and pipes like the library does.
 *
 * Throws what `@angular/compiler` throws, for a selector it cannot parse, say.
 */
export function matchDeclarables(nodes: readonly TmplAstNode[], library: readonly Declarable[], explicit: readonly Declarable[]): DeclarableMatch {
    const schema = (domSchema ??= new DomElementSchemaRegistry());
    const walker = new TemplateWalker();
    const matcher = new SelectorMatcher<Omit<Hit, 'written'>>();
    const addSelectables = (declarables: readonly Declarable[], isExplicit: boolean) => {
        for (const declarable of declarables) {
            if (declarable.selector) matcher.addSelectables(CssSelector.parse(declarable.selector), { declarable, explicit: isExplicit });
        }
    };

    for (const node of nodes) walker.visit(node);
    addSelectables(library, false);
    addSelectables(explicit, true);

    const matches = walker.nodes.map((node) => {
        const tag = node instanceof TmplAstElement ? node.name : 'ng-template';
        const hits: Hit[] = [];

        matcher.match(elementSelector(node), (part, hit) => hits.push({ ...hit, written: hit.explicit || namesWritten(part, tag, schema) }));
        return { node, hits };
    });

    const imports = new Map<string, Declarable>();
    const add = (declarable: Declarable) => {
        if (!imports.has(key(declarable))) imports.set(key(declarable), declarable);
    };

    explicit.forEach(add);
    for (const { hits } of matches) {
        for (const hit of hits) if (hit.written) add(hit.declarable);
    }
    for (const declarable of library) {
        if (declarable.pipeName !== undefined && walker.pipes.has(declarable.pipeName)) add(declarable);
    }

    const isImported = (declarable: Declarable) => imports.has(key(declarable));
    const unknownElements = new Set<string>();
    const ambiguous = new Map<string, DeclarableMatch['ambiguous'][number]>();
    const skipped = new Map<string, DeclarableMatch['skipped'][number]>();

    for (const { node, hits } of matches) {
        const element = displayName(node);
        const libraryHits = hits.filter((hit) => !hit.explicit);
        const components = new Map(
            libraryHits.filter((hit) => hit.declarable.kind === 'component' && isImported(hit.declarable)).map((hit) => [key(hit.declarable), hit.declarable.name])
        );

        if (components.size > 1) {
            const classes = [...components.values()].sort();

            ambiguous.set(`${element} ${classes.join(' ')}`, { element, classes });
        }
        for (const { declarable } of libraryHits) {
            if (!isImported(declarable)) skipped.set(`${element} ${declarable.name}`, { element, className: declarable.name });
        }
        if (node instanceof TmplAstElement && !ANGULAR_ELEMENTS.has(element) && !schema.hasElement(node.name, []) && !hits.some((hit) => isImported(hit.declarable))) {
            unknownElements.add(element);
        }
    }

    const declaredPipes = new Set([...library, ...explicit].map((declarable) => declarable.pipeName));

    return {
        imports: [...imports.values()],
        unknownElements: [...unknownElements],
        unknownPipes: [...walker.pipes].filter((pipe) => !declaredPipes.has(pipe)),
        ambiguous: [...ambiguous.values()],
        skipped: [...skipped.values()]
    };
}

/** Every element and `<ng-template>` of a template, also those in control flow blocks, and every pipe its expressions call. */
class TemplateWalker extends CombinedRecursiveAstVisitor {
    readonly nodes: MatchedNode[] = [];
    /** Pipe names, in the order of their first use. */
    readonly pipes = new Set<string>();

    override visitElement(element: TmplAstElement): void {
        this.nodes.push(element);
        super.visitElement(element);
    }

    override visitTemplate(template: TmplAstTemplate): void {
        this.nodes.push(template);
        super.visitTemplate(template);
    }

    override visitPipe(pipe: BindingPipe, context: unknown): unknown {
        this.pipes.add(pipe.name);
        return super.visitPipe(pipe, context);
    }
}

/**
 * Whether the part of a selector that matched names something the author wrote: a custom element, or an attribute
 * that is no DOM property of `tag` (`libInput`, but neither `type` nor `tabindex`). Classes do not count.
 */
function namesWritten(part: CssSelector, tag: string, schema: DomElementSchemaRegistry): boolean {
    if (part.element?.includes('-')) return true;
    return part.attrs.some((name, i) => i % 2 === 0 && !schema.hasProperty(tag, schema.getMappedPropName(camelCase(name)), []));
}

/** `aria-label` → `ariaLabel`, the way Angular maps an attribute to a property. */
function camelCase(name: string): string {
    return name.replace(/-+([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

/** The element as the author wrote it; a template that `*libIf` creates is named after its element. */
function displayName(node: MatchedNode): string {
    return localName(node instanceof TmplAstElement ? node.name : (node.tagName ?? 'ng-template'));
}

/** Class names have no spaces, so this tells apart every name and module pair. */
function key({ name, from }: Declarable): string {
    return `${name} ${from}`;
}
