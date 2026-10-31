import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import { A11yKeyboardService } from './a11y-keyboard.service.js';

interface Bounds {
    top: number;
    left: number;
    width: number;
    height: number;
}

@Component({
    selector: 'prism-a11y-overlay-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-overlay-host.component.html',
    styleUrl: './a11y-overlay-host.component.css'
})
export class A11yOverlayHostComponent {
    readonly rendererService = input.required<PrismRendererService>();
    private readonly keyboardService = inject(A11yKeyboardService);
    private readonly elementRef = inject(ElementRef<HTMLElement>);

    private readonly layoutTick = signal(0);

    protected readonly bounds = computed<Bounds | null>(() => {
        const el = this.rendererService().renderedElement();

        this.layoutTick();
        if (!el) return null;
        const parent = this.elementRef.nativeElement.parentElement;

        if (!parent) return null;
        const elRect = (el as HTMLElement).getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        return {
            top: elRect.top - parentRect.top,
            left: elRect.left - parentRect.left,
            width: elRect.width,
            height: elRect.height
        };
    });

    /** The role of the showcased element, which in a composition is not the rendered root. */
    protected readonly roleLabel = computed(() => {
        const el = this.rendererService().subjectElement();

        if (!el) return null;
        const role = el.getAttribute('role') ?? implicitRole(el);

        return role ? `role="${role}"` : null;
    });

    protected readonly tabLabel = computed(() => {
        const el = this.rendererService().renderedElement();

        if (!el) return null;
        const doc = (el as HTMLElement).ownerDocument;
        const items = this.keyboardService.extractTabOrder(el, doc ? (id) => doc.getElementById(id) : undefined);

        if (items.length === 0) return null;
        return `Tab ${items[0].index}`;
    });

    constructor() {
        effect((onCleanup) => {
            const el = this.rendererService().renderedElement();

            if (!el) return;
            const ro = new ResizeObserver(() => this.layoutTick.update((v) => v + 1));

            ro.observe(el);
            const parent = this.elementRef.nativeElement.parentElement;

            if (parent) ro.observe(parent);
            onCleanup(() => ro.disconnect());
        });

        effect(() => {
            this.rendererService().inputValues();
            this.rendererService().activeVariantIndex();
            this.layoutTick.update((v) => v + 1);
        });
    }
}

function implicitRole(el: Element): string | null {
    const tag = el.tagName.toLowerCase();

    if (tag === 'button') return 'button';
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'input') {
        const type = el.getAttribute('type') ?? 'text';

        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'range') return 'slider';
        return 'textbox';
    }
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'img') return 'img';
    return null;
}
