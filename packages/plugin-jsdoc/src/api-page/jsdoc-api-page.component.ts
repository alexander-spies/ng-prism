import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, NgZone, signal, untracked } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ApiDocTags, ApiMethod, ApiProperty, ApiTypeDoc } from '@ng-prism/core/plugin';
import { Highlight } from 'ngx-highlightjs';
import { type ParsedExample, parseExample, renderBlockMarkdown, renderInlineMarkdown } from '../markdown.js';
import { activeTocId, buildApiPageToc, declaredParamSegments, documentsParams, setupSignature, splitReachedFrom, typeAnchor, typeSegments } from './api-page.helpers.js';
import type { ApiPageModel } from './api-page.model.js';

/** How far below the top of the scroll container a section lands when the page jumps to it. */
const SCROLL_OFFSET = 12;

/** How long a type card stays highlighted after a link jumped to it. */
const HIGHLIGHT_MS = 1600;

/** Without `scrollend`, a jump counts as over once its smooth scroll has been quiet for this long. */
const JUMP_SETTLE_MS = 150;

/** What the reader does to scroll by hand; any of it ends a jump. */
const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * The API page of a service or a pipe: what it is, how to bring it in, what it
 * offers and the types its API reaches, with an "On this page" list next to
 * it. It renders an `ApiPageModel`, so both kinds share one look.
 *
 * The host is the scroll container (the panel stylesheet gives it `overflow:
 * auto`), so every jump scrolls it, never the window or the shell around it.
 *
 * It also carries a render marker, the class name of what it shows:
 * `data-prism-service-rendered` on a service page, `data-prism-pipe-rendered`
 * on a pipe page, the other one absent. Host bindings update in the same pass
 * as the template, so the marker names a class only once its page is in the
 * DOM, which is what an outside tool such as the showcase skill's screenshot
 * script waits for.
 */
@Component({
    selector: 'prism-jsdoc-api-page',
    standalone: true,
    imports: [Highlight, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-api-page.component.html',
    styleUrls: ['../jsdoc-panel.component.css', './jsdoc-api-page.component.css'],
    host: {
        '[attr.data-prism-service-rendered]': "kind() === 'service' ? className() : null",
        '[attr.data-prism-pipe-rendered]': "kind() === 'pipe' ? className() : null"
    }
})
export class JsDocApiPageComponent {
    readonly page = input.required<ApiPageModel>();

    private readonly sanitizer = inject(DomSanitizer);
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;

    /** Kind and class name, not the page object: a manifest update during `serve` hands over a new page for the same class. */
    protected readonly kind = computed(() => this.page().kind);
    protected readonly className = computed(() => this.page().className);
    protected readonly serviceProperties = computed(() => this.page().properties ?? []);
    protected readonly serviceMethods = computed(() => this.page().methods ?? []);
    protected readonly transformSignatures = computed(() => this.page().transform ?? []);
    protected readonly toc = computed(() => buildApiPageToc(this.page()));
    protected readonly renderedDescription = computed(() => this.renderBlock(this.page().description));

    protected readonly activeId = signal('usage');
    protected readonly highlightedId = signal<string | null>(null);
    protected readonly copied = signal(false);

    // The template re-renders whenever the active TOC entry changes. Cached per
    // object or text, these hand it the same values again, so nothing below
    // the bindings is rebuilt and no `innerHTML` is written twice.
    protected readonly segmentsOf = memoize(typeSegments);
    protected readonly declaredParamSegmentsOf = memoize(declaredParamSegments);
    protected readonly signatureOf = memoize(setupSignature);
    protected readonly documentsParams = documentsParams;
    protected readonly splitReachedFrom = splitReachedFrom;
    protected readonly typeAnchor = typeAnchor;

    private readonly blockHtml = new Map<string, SafeHtml>();
    private readonly inlineHtml = new Map<string, SafeHtml>();

    /**
     * The entry the reader jumped to, until the jump is over: the smooth scroll
     * passes other sections on its way, and one near the bottom of the page is
     * never scrolled up to the activation line.
     */
    private jumpTarget: string | null = null;
    private spyFrame = 0;
    private jumpTimer?: ReturnType<typeof setTimeout>;
    private highlightTimer?: ReturnType<typeof setTimeout>;
    private copiedTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // The panel keeps this instance when the reader moves to another
        // service or pipe, so the page starts over at the top for the new one.
        effect(() => {
            this.kind();
            this.className();
            untracked(() => {
                this.endJump();
                this.host.scrollTo({ top: 0, behavior: 'instant' });
                this.activeId.set('usage');
                this.highlightedId.set(null);
            });
        });

        // Outside the zone: a scroll event alone changes nothing on screen.
        // Only a different active entry does, and that is a signal write.
        const onScroll = () => this.onScroll();
        const endJump = () => this.endJump();

        inject(NgZone).runOutsideAngular(() => {
            this.host.addEventListener('scroll', onScroll, { passive: true });
            this.host.addEventListener('scrollend', endJump);
            for (const type of READER_INPUT) this.host.addEventListener(type, endJump, { passive: true });
        });
        inject(DestroyRef).onDestroy(() => {
            this.host.removeEventListener('scroll', onScroll);
            this.host.removeEventListener('scrollend', endJump);
            for (const type of READER_INPUT) this.host.removeEventListener(type, endJump);
            cancelAnimationFrame(this.spyFrame);
            clearTimeout(this.jumpTimer);
            clearTimeout(this.highlightTimer);
            clearTimeout(this.copiedTimer);
        });
    }

    /** Scroll to a section or a type card; a type card lights up briefly so the eye finds it. */
    protected goTo(id: string): void {
        const target = this.anchors().find((anchor) => anchor.dataset['tocId'] === id);

        if (!target) return;

        this.activeId.set(id);
        this.jumpTarget = id;
        this.host.scrollTo({ top: this.offsetOf(target) - SCROLL_OFFSET });

        if (!id.startsWith('type-')) return;

        this.highlightedId.set(id);
        clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(() => this.highlightedId.set(null), HIGHLIGHT_MS);
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
        if (!this.blockHtml.has(text)) this.blockHtml.set(text, this.sanitizer.bypassSecurityTrustHtml(renderBlockMarkdown(text) ?? ''));
        return this.blockHtml.get(text)!;
    }

    protected renderInline(text: string): SafeHtml {
        if (!this.inlineHtml.has(text)) this.inlineHtml.set(text, this.sanitizer.bypassSecurityTrustHtml(renderInlineMarkdown(text)));
        return this.inlineHtml.get(text)!;
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

    protected hasParams(methods: ApiMethod[]): boolean {
        return methods.some((method) => method.params.length > 0);
    }

    protected hasValues(type: ApiTypeDoc): boolean {
        return !!type.members?.some((member) => member.value !== undefined);
    }

    private onScroll(): void {
        if (this.jumpTarget && !('onscrollend' in this.host)) {
            clearTimeout(this.jumpTimer);
            this.jumpTimer = setTimeout(() => this.endJump(), JUMP_SETTLE_MS);
        }

        if (this.spyFrame) return;

        this.spyFrame = requestAnimationFrame(() => {
            this.spyFrame = 0;
            this.activeId.set(this.sectionInView());
        });
    }

    /**
     * The jump is over: from here on the scroll position decides. The entry
     * stays as it is until the next scroll moves the page, so a frame still
     * pending from the jump is dropped rather than allowed to overrule it.
     */
    private endJump(): void {
        if (!this.jumpTarget) return;

        this.jumpTarget = null;
        clearTimeout(this.jumpTimer);
        cancelAnimationFrame(this.spyFrame);
        this.spyFrame = 0;
    }

    private anchors(): HTMLElement[] {
        return [...this.host.querySelectorAll<HTMLElement>('[data-toc-id]')];
    }

    private offsetOf(element: HTMLElement): number {
        return element.getBoundingClientRect().top - this.host.getBoundingClientRect().top + this.host.scrollTop;
    }

    private sectionInView(): string {
        const { scrollTop, clientHeight, scrollHeight } = this.host;

        return activeTocId({
            anchors: this.anchors().map((anchor) => ({ id: anchor.dataset['tocId']!, top: this.offsetOf(anchor) })),
            scrollTop,
            clientHeight,
            scrollHeight,
            jumpTarget: this.jumpTarget
        });
    }
}

function memoize<K extends object, V>(fn: (key: K) => V): (key: K) => V {
    const cache = new WeakMap<K, V>();

    return (key) => {
        if (!cache.has(key)) cache.set(key, fn(key));
        return cache.get(key)!;
    };
}
