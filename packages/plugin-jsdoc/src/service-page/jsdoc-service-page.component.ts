import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, NgZone, signal, untracked } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ApiDocTags, ApiMethod, ApiProperty, ApiTypeDoc, RuntimeService } from '@ng-prism/core/plugin';
import { Highlight } from 'ngx-highlightjs';
import { type ParsedExample, parseExample, renderBlockMarkdown, renderInlineMarkdown } from '../markdown.js';
import { buildServiceToc, paramSegments, setupSignature, splitReachedFrom, typeAnchor, typeSegments } from './service-page.model.js';
import { generateServiceUsage } from './service-usage.js';

/** How far below the top of the scroll container a section lands when the page jumps to it. */
const SCROLL_OFFSET = 12;

/** How long a type card stays highlighted after a link jumped to it. */
const HIGHLIGHT_MS = 1600;

/**
 * The API page of a service: what it is, how to bring it in, what it offers and
 * the types its API reaches, with an "On this page" list next to it.
 *
 * The host is the scroll container (the panel stylesheet gives it `overflow:
 * auto`), so every jump scrolls it, never the window or the shell around it.
 */
@Component({
    selector: 'prism-jsdoc-service-page',
    standalone: true,
    imports: [Highlight, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-service-page.component.html',
    styleUrls: ['../jsdoc-panel.component.css', './jsdoc-service-page.component.css']
})
export class JsDocServicePageComponent {
    readonly service = input.required<RuntimeService>();

    private readonly sanitizer = inject(DomSanitizer);
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;

    protected readonly meta = computed(() => this.service().meta);
    protected readonly api = computed(() => this.meta().api);
    protected readonly tags = computed(() => this.api().tags);
    protected readonly usage = computed(() => generateServiceUsage(this.meta()));
    protected readonly toc = computed(() => buildServiceToc(this.api()));
    protected readonly providedIn = computed(() => (this.meta().provision === 'auto' ? 'root/automatically' : 'providers'));
    protected readonly renderedDescription = computed(() => this.renderBlock(this.api().description));

    protected readonly activeId = signal('usage');
    protected readonly highlightedId = signal<string | null>(null);
    protected readonly copied = signal(false);

    // The template re-renders whenever the active TOC entry changes. Cached per
    // object or text, these hand it the same values again, so nothing below
    // the bindings is rebuilt and no `innerHTML` is written twice.
    protected readonly segmentsOf = memoize(typeSegments);
    protected readonly paramSegmentsOf = memoize(paramSegments);
    protected readonly signatureOf = memoize(setupSignature);
    protected readonly splitReachedFrom = splitReachedFrom;
    protected readonly typeAnchor = typeAnchor;

    private readonly blockHtml = new Map<string, SafeHtml>();
    private readonly inlineHtml = new Map<string, SafeHtml>();

    private spyFrame = 0;
    private highlightTimer?: ReturnType<typeof setTimeout>;
    private copiedTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // The panel keeps this instance when the reader moves to another
        // service, so the page starts over at the top for the new one.
        effect(() => {
            this.service();
            untracked(() => {
                this.host.scrollTo({ top: 0, behavior: 'instant' });
                this.activeId.set('usage');
                this.highlightedId.set(null);
            });
        });

        // Outside the zone: a scroll event alone changes nothing on screen.
        // Only a different active entry does, and that is a signal write.
        const onScroll = () => this.onScroll();

        inject(NgZone).runOutsideAngular(() => this.host.addEventListener('scroll', onScroll, { passive: true }));
        inject(DestroyRef).onDestroy(() => {
            this.host.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(this.spyFrame);
            clearTimeout(this.highlightTimer);
            clearTimeout(this.copiedTimer);
        });
    }

    /** Scroll to a section or a type card; a type card lights up briefly so the eye finds it. */
    protected goTo(id: string): void {
        const target = this.anchors().find((anchor) => anchor.dataset['tocId'] === id);

        if (!target) return;

        this.activeId.set(id);
        this.host.scrollTo({ top: this.offsetOf(target) - SCROLL_OFFSET });

        if (!id.startsWith('type-')) return;

        this.highlightedId.set(id);
        clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(() => this.highlightedId.set(null), HIGHLIGHT_MS);
    }

    protected copyUsage(): void {
        navigator.clipboard
            ?.writeText(this.usage())
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

    // Source is service-author JSDoc compiled into the manifest at build time,
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
        if (this.spyFrame) return;

        this.spyFrame = requestAnimationFrame(() => {
            this.spyFrame = 0;
            this.activeId.set(this.sectionInView());
        });
    }

    private anchors(): HTMLElement[] {
        return [...this.host.querySelectorAll<HTMLElement>('[data-toc-id]')];
    }

    private offsetOf(element: HTMLElement): number {
        return element.getBoundingClientRect().top - this.host.getBoundingClientRect().top + this.host.scrollTop;
    }

    /**
     * The last section that has reached the top of the scroll container. At the
     * bottom of the page the sections below it can never get there, so one the
     * reader jumped to stays active: down there, every section below the
     * reached one is in view.
     */
    private sectionInView(): string {
        const anchors = this.anchors();
        const threshold = this.host.scrollTop + SCROLL_OFFSET + 1;
        const reached = anchors.filter((anchor) => this.offsetOf(anchor) <= threshold).at(-1);
        const current = anchors.find((anchor) => anchor.dataset['tocId'] === this.activeId());
        const atBottom = this.host.scrollTop + this.host.clientHeight >= this.host.scrollHeight - 1;

        if (atBottom && current && (!reached || this.offsetOf(current) > this.offsetOf(reached))) return this.activeId();
        return reached?.dataset['tocId'] ?? 'usage';
    }
}

function memoize<K extends object, V>(fn: (key: K) => V): (key: K) => V {
    const cache = new WeakMap<K, V>();

    return (key) => {
        if (!cache.has(key)) cache.set(key, fn(key));
        return cache.get(key)!;
    };
}
