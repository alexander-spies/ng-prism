import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, type Signal, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ApiDocTags, ApiMethod, ApiParam, ApiProperty, ApiSetupEntry, ApiTypeDoc, ApiTypeRef } from '@ng-prism/core/plugin';
import { Highlight } from 'ngx-highlightjs';
import { type ParsedExample, parseExample, renderBlockMarkdown, renderInlineMarkdown } from '../markdown.js';
import {
    declaredParamSegments,
    documentsParams,
    scopedAnchor,
    setupSignature,
    splitReachedFrom,
    typeAnchor,
    type TypeSegment,
    typeSegments
} from './api-page.helpers.js';
import type { ApiOutputRow, ApiPageModel } from './api-page.model.js';
import { resolveDocLinks, typeLinkTarget } from './doc-links.js';

/**
 * What the sections of an API page need from the page that scrolls them: the
 * jump to an anchor, and the anchor the last jump lit up. The page provides
 * it, so the sections of a part jump inside the one scroll host as well.
 */
export abstract class ApiPageNavigation {
    abstract readonly highlightedId: Signal<string | null>;
    abstract goTo(id: string): void;
}

/**
 * The content of an API page: the description, the chips and the sections
 * from Usage to Types. The page shows its own API with one, and the API of
 * each part of a component with one more, `nested` under the part's heading.
 *
 * Every anchor it sets is in `scope`: none for the page's own API, the part's
 * scope for a part. The anchors of two blocks never meet in the one scroll
 * host that way, and the links in a block's texts and types lead to the type
 * cards of the same block.
 */
@Component({
    selector: 'prism-jsdoc-api-sections',
    standalone: true,
    imports: [Highlight, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-api-sections.component.html',
    styleUrls: ['../jsdoc-panel.component.css', './jsdoc-api-sections.component.css']
})
export class JsDocApiSectionsComponent {
    readonly page = input.required<ApiPageModel>();
    /** What every anchor of the sections starts with, see `scopedAnchor`; empty for the page's own API. */
    readonly scope = input('');
    /** Under the heading of a part's block, which puts the section headings a level deeper. */
    readonly nested = input(false, { transform: booleanAttribute });

    private readonly sanitizer = inject(DomSanitizer);
    private readonly navigation = inject(ApiPageNavigation);

    protected readonly highlightedId = this.navigation.highlightedId;
    protected readonly inputs = computed(() => this.page().inputs ?? []);
    protected readonly outputs = computed(() => this.page().outputs ?? []);
    protected readonly serviceProperties = computed(() => this.page().properties ?? []);
    protected readonly pageMethods = computed(() => this.page().methods ?? []);
    protected readonly transformSignatures = computed(() => this.page().transform ?? []);
    protected readonly renderedDescription = computed(() => this.renderBlock(this.page().description));

    protected readonly copied = signal(false);

    protected readonly documentsParams = documentsParams;
    protected readonly splitReachedFrom = splitReachedFrom;
    protected readonly typeAnchor = typeAnchor;

    // The template re-renders whenever a type card lights up or goes dark.
    // Cached per object, these hand it the same values again, so nothing
    // below the bindings is rebuilt. Their links are in the scope, so the
    // caches go with it.
    private readonly segments = computed(() => {
        const scope = this.scope();

        return {
            type: memoize((ref: ApiTypeRef) => typeSegments(ref, scope)),
            declaredParam: memoize((param: ApiParam) => declaredParamSegments(param, scope)),
            signature: memoize((entry: ApiSetupEntry) => setupSignature(entry, scope))
        };
    });

    /**
     * The rendered descriptions of the page being shown. A link resolves against
     * that page's types and into the scope, so the caches go with both: the
     * panel keeps this instance when the reader moves to another component,
     * service or pipe, and the HTML of its texts must not outlive the page they
     * were rendered for.
     */
    private readonly rendered = computed(() => ({
        page: this.page(),
        scope: this.scope(),
        block: new Map<string, SafeHtml>(),
        inline: new Map<string, SafeHtml>()
    }));

    private copiedTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
    }

    /** The TOC id of a section, in the scope of these sections. */
    protected anchor(id: string): string {
        return scopedAnchor(this.scope(), id);
    }

    protected goTo(id: string): void {
        this.navigation.goTo(id);
    }

    protected segmentsOf(ref: ApiTypeRef): TypeSegment[] {
        return this.segments().type(ref);
    }

    protected declaredParamSegmentsOf(param: ApiParam): TypeSegment[] {
        return this.segments().declaredParam(param);
    }

    protected signatureOf(entry: ApiSetupEntry): TypeSegment[] {
        return this.segments().signature(entry);
    }

    protected copyUsage(): void {
        navigator.clipboard
            ?.writeText(this.page().usage)
            .then(() => {
                this.copied.set(true);
                clearTimeout(this.copiedTimer);
                this.copiedTimer = setTimeout(() => this.copied.set(false), 1500);
            })
            .catch(() => undefined);
    }

    protected isDeprecated(tags: ApiDocTags): boolean {
        return !!tags.deprecated;
    }

    protected deprecatedMessage(tags: ApiDocTags): string | undefined {
        return typeof tags.deprecated === 'string' ? tags.deprecated : undefined;
    }

    // Source is library-author JSDoc compiled into the manifest at build time,
    // not user input, so bypassing sanitization is safe here.
    protected renderBlock(text: string | undefined): SafeHtml | null {
        if (!text) return null;

        const { page, scope, block } = this.rendered();

        if (!block.has(text)) block.set(text, this.sanitizer.bypassSecurityTrustHtml(renderBlockMarkdown(withLinks(page, scope, text)) ?? ''));
        return block.get(text)!;
    }

    protected renderInline(text: string): SafeHtml {
        const { page, scope, inline } = this.rendered();

        if (!inline.has(text)) inline.set(text, this.sanitizer.bypassSecurityTrustHtml(renderInlineMarkdown(withLinks(page, scope, text))));
        return inline.get(text)!;
    }

    /** The TOC anchor of the type card a `@see` reference names, if it is in these sections. */
    protected seeTarget(reference: string): string | undefined {
        return typeLinkTarget(this.page().types, reference, this.scope());
    }

    protected parseExample(raw: string): ParsedExample {
        return parseExample(raw);
    }

    /** An interface or object type says what may be left out; a class property has nothing to require. */
    protected isRequired(property: ApiProperty, owner?: ApiTypeDoc): boolean {
        return owner?.kind !== 'class' && !property.optional;
    }

    protected hasDefaults(properties: ApiProperty[]): boolean {
        return properties.some((property) => property.tags.default !== undefined);
    }

    /** The scanner reads an output's payload from the source; without it the column would be empty. */
    protected hasPayloads(outputs: ApiOutputRow[]): boolean {
        return outputs.some((output) => output.payload !== undefined);
    }

    protected hasParams(methods: ApiMethod[]): boolean {
        return methods.some((method) => method.params.length > 0);
    }

    protected hasValues(type: ApiTypeDoc): boolean {
        return !!type.members?.some((member) => member.value !== undefined);
    }
}

/** The links of a text as buttons to the type cards of the page, in the scope the page is shown in. */
function withLinks(page: ApiPageModel, scope: string, text: string): string {
    return resolveDocLinks(text, (target) => typeLinkTarget(page.types, target, scope));
}

function memoize<K extends object, V>(fn: (key: K) => V): (key: K) => V {
    const cache = new WeakMap<K, V>();

    return (key) => {
        if (!cache.has(key)) cache.set(key, fn(key));
        return cache.get(key)!;
    };
}
