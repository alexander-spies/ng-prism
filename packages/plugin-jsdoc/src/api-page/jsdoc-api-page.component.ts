import { NgTemplateOutlet } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    forwardRef,
    inject,
    Injector,
    input,
    NgZone,
    signal,
    untracked,
    viewChild
} from '@angular/core';
import { activeTocId, buildApiPageToc, buildPartsToc, isTypeAnchor, partAnchor } from './api-page.helpers.js';
import type { ApiPageModel, ApiPagePart } from './api-page.model.js';
import { TYPE_LINK_ATTRIBUTE } from './doc-links.js';
import { ApiPageNavigation, JsDocApiSectionsComponent } from './jsdoc-api-sections.component.js';

/** How far below the top of the scroll container a section lands when the page jumps to it. */
const SCROLL_OFFSET = 12;

/** How long a type card or a part's block stays highlighted after a jump to it. */
const HIGHLIGHT_MS = 1600;

/** Without `scrollend`, a jump counts as over once its smooth scroll has been quiet for this long. */
const JUMP_SETTLE_MS = 150;

/** What the reader does to scroll by hand; any of it ends a jump. */
const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * The API page of a component, a directive, a service or a pipe: what it is,
 * how to bring it in, what it offers and the types its API reaches, with an
 * "On this page" list next to it. It renders an `ApiPageModel`, so all four
 * kinds share one look. A component's parts follow its own sections, each as
 * a block with the API page of the part, and the list has a group for them.
 *
 * The host is the scroll container (the panel stylesheet gives it `overflow:
 * auto`), so every jump scrolls it, never the window or the shell around it.
 *
 * It also carries a render marker, the class name of what it shows:
 * `data-prism-component-rendered` on a component or directive page,
 * `data-prism-service-rendered` on a service page, `data-prism-pipe-rendered`
 * on a pipe page. Exactly one of the three is set, the others are absent. Host
 * bindings update in the same pass as the template, so the marker names a
 * class only once its page is in the DOM, which is what an outside tool such
 * as the showcase skill's screenshot script waits for.
 */
@Component({
    selector: 'prism-jsdoc-api-page',
    standalone: true,
    imports: [JsDocApiSectionsComponent, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-api-page.component.html',
    styleUrls: ['../jsdoc-panel.component.css', './jsdoc-api-page.component.css'],
    providers: [{ provide: ApiPageNavigation, useExisting: forwardRef(() => JsDocApiPageComponent) }],
    host: {
        '[attr.data-prism-service-rendered]': "kind() === 'service' ? className() : null",
        '[attr.data-prism-pipe-rendered]': "kind() === 'pipe' ? className() : null",
        '[attr.data-prism-component-rendered]': "kind() === 'component' || kind() === 'directive' ? className() : null",
        '(click)': 'onHostClick($event)'
    }
})
export class JsDocApiPageComponent implements ApiPageNavigation {
    readonly page = input.required<ApiPageModel>();
    /** The parts of the component, a block each after its own sections. */
    readonly parts = input<readonly ApiPagePart[]>([]);
    /** The class name of the part whose block the page scrolls to and lights up, `null` for none. */
    readonly activePart = input<string | null>(null);

    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    /** The grid of the page, content and list. */
    private readonly layout = viewChild.required<ElementRef<HTMLElement>>('layout');

    /** Kind and class name, not the page object: a manifest update during `serve` hands over a new page for the same class. */
    protected readonly kind = computed(() => this.page().kind);
    protected readonly className = computed(() => this.page().className);
    protected readonly toc = computed(() => buildApiPageToc(this.page()));
    protected readonly partsToc = computed(() => buildPartsToc(this.parts()));

    /** The ids the "On this page" list has. The scroll spy marks one of them, never an anchor the list leaves out. */
    private readonly tocIds = computed(() => new Set([...this.toc(), ...this.partsToc()].map((entry) => entry.id)));

    /**
     * The block of `activePart`, while the page has that part. An id rather
     * than the part: a manifest update during `serve` hands over new parts,
     * which must not send the reader back to the block.
     */
    private readonly activePartAnchor = computed(() => partAnchor(this.parts(), this.activePart()));

    protected readonly activeId = signal('usage');
    private readonly highlighted = signal<string | null>(null);
    /** The type card or part's block the last jump lit up, for as long as it stays lit. */
    readonly highlightedId = this.highlighted.asReadonly();

    /**
     * The entry the reader jumped to, until the jump is over: the smooth scroll
     * passes other sections on its way, and one near the bottom of the page is
     * never scrolled up to the activation line.
     */
    private jumpTarget: string | null = null;
    private spyFrame = 0;
    private jumpTimer?: ReturnType<typeof setTimeout>;
    private highlightTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // The panel keeps this instance when the reader moves to another
        // component, service or pipe, so the page starts over at the top for the new one.
        effect(() => {
            this.kind();
            this.className();
            untracked(() => {
                this.endJump();
                this.host.scrollTo({ top: 0, behavior: 'instant' });
                this.activeId.set('usage');
                this.highlighted.set(null);
            });
        });

        // After the next render: the block has to be in the DOM, and the jump
        // has to come after the effect above has put a new component at the top.
        effect((onCleanup) => {
            const anchor = this.activePartAnchor();

            if (!anchor) return;

            const jump = afterNextRender(() => this.goTo(anchor), { injector: this.injector });

            onCleanup(() => jump.destroy());
        });

        // Outside the zone: a scroll event alone changes nothing on screen.
        // Only a different active entry does, and that is a signal write.
        const onScroll = () => this.onScroll();
        const endJump = () => this.endJump();

        // A code block gets its text a frame after it is rendered, so the page
        // still grows under a jump that starts right after a render, as the
        // one to `activePart` does. Until the jump is over, it follows its target.
        const resizes = inject(NgZone).runOutsideAngular(() => {
            this.host.addEventListener('scroll', onScroll, { passive: true });
            this.host.addEventListener('scrollend', endJump);
            for (const type of READER_INPUT) this.host.addEventListener(type, endJump, { passive: true });
            return new ResizeObserver(() => this.followJump());
        });

        afterNextRender(() => resizes.observe(this.layout().nativeElement));
        inject(DestroyRef).onDestroy(() => {
            resizes.disconnect();
            this.host.removeEventListener('scroll', onScroll);
            this.host.removeEventListener('scrollend', endJump);
            for (const type of READER_INPUT) this.host.removeEventListener(type, endJump);
            cancelAnimationFrame(this.spyFrame);
            clearTimeout(this.jumpTimer);
            clearTimeout(this.highlightTimer);
        });
    }

    /**
     * Scroll to a section, a type card or a part's block. A card or a block
     * lights up briefly so the eye finds it; a section has its heading.
     */
    goTo(id: string): void {
        const target = this.anchorOf(id);

        if (!target) return;

        this.activeId.set(id);
        this.jumpTarget = id;
        this.host.scrollTo({ top: this.offsetOf(target) - SCROLL_OFFSET });

        if (!isTypeAnchor(id) && !this.parts().some((part) => part.scope === id)) return;

        this.highlighted.set(id);
        clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(() => this.highlighted.set(null), HIGHLIGHT_MS);
    }

    /** The links inside rendered descriptions are plain HTML, so one listener on the host catches them all. */
    protected onHostClick(event: MouseEvent): void {
        const link = event.target instanceof Element ? event.target.closest(`[${TYPE_LINK_ATTRIBUTE}]`) : null;
        const anchor = link?.getAttribute(TYPE_LINK_ATTRIBUTE);

        if (!anchor) return;

        event.preventDefault();
        this.goTo(anchor);
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

    /** The page grew or shrank during a jump: the jump goes on to where its target is now. */
    private followJump(): void {
        const target = this.jumpTarget === null ? undefined : this.anchorOf(this.jumpTarget);

        if (target) this.host.scrollTo({ top: this.offsetOf(target) - SCROLL_OFFSET });
    }

    private anchors(): HTMLElement[] {
        return [...this.host.querySelectorAll<HTMLElement>('[data-toc-id]')];
    }

    private anchorOf(id: string): HTMLElement | undefined {
        return this.anchors().find((anchor) => anchor.dataset['tocId'] === id);
    }

    private offsetOf(element: HTMLElement): number {
        return element.getBoundingClientRect().top - this.host.getBoundingClientRect().top + this.host.scrollTop;
    }

    /** A part's Types section and its cards have anchors but no entry, so reading them keeps the part's last listed section marked. */
    private sectionInView(): string {
        const { scrollTop, clientHeight, scrollHeight } = this.host;
        const listed = this.tocIds();

        return activeTocId({
            anchors: this.anchors()
                .filter((anchor) => listed.has(anchor.dataset['tocId']!))
                .map((anchor) => ({ id: anchor.dataset['tocId']!, top: this.offsetOf(anchor) })),
            scrollTop,
            clientHeight,
            scrollHeight,
            jumpTarget: this.jumpTarget
        });
    }
}
