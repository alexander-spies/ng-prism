import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { activeCase } from '../renderer/composition.js';
import { unboundInputs } from '../renderer/input-bindings.js';
import { generateCompositionSnippet, generateSnippet, subjectAttributes } from '../renderer/snippet-generator.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenizeXml(code: string): string {
    const re = /(\/\/[^\n]*)|(<\/?[\w-]+)|(\[[\w.]+\]|[\w-]+)=|"([^"]*)"|(\/>|>)|(\n)|([^<["\n/>=]+|[\s\S])/g;
    let out = '';
    let m: RegExpExecArray | null;

    while ((m = re.exec(code)) !== null) {
        if (m[1] != null) {
            out += `<span class="tok-com">${esc(m[1])}</span>`;
        } else if (m[2] != null) {
            out += `<span class="tok-tag">${esc(m[2])}</span>`;
        } else if (m[3] != null) {
            out += `<span class="tok-attr">${esc(m[3])}</span>=`;
        } else if (m[4] != null) {
            out += `"<span class="tok-str">${esc(m[4])}</span>"`;
        } else if (m[5] != null) {
            out += `<span class="tok-tag">${esc(m[5])}</span>`;
        } else if (m[6] != null) {
            out += '\n';
        } else {
            out += esc(m[0]);
        }
    }
    return out;
}

@Component({
    selector: 'prism-template-popover',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-template-popover.component.html',
    styleUrl: './prism-template-popover.component.css'
})
export class PrismTemplatePopoverComponent {
    private readonly navigationService = inject(PrismNavigationService);
    private readonly rendererService = inject(PrismRendererService);

    protected readonly copied = signal(false);
    private copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

    protected readonly snippet = computed(() => {
        const comp = this.navigationService.activeComponent();

        if (!comp) return '';
        const variantIndex = this.rendererService.activeVariantIndex();
        const variant = comp.meta.showcaseConfig.variants?.[variantIndex];
        const explicitKeys = variant?.inputs ? new Set(Object.keys(variant.inputs)) : undefined;
        const values = this.rendererService.inputValues();
        const composed = activeCase(comp, variantIndex);

        // A composed variant shows the composition as written, with the subject's current values where it stands.
        if (composed) {
            return generateCompositionSnippet(composed.template, subjectAttributes(comp.meta.inputs, values, explicitKeys, unboundInputs(comp, variantIndex)));
        }
        const directiveOptions = comp.meta.componentMeta.isDirective ? { host: comp.meta.showcaseConfig.host } : undefined;

        return generateSnippet(comp.meta.componentMeta.selector, comp.meta.inputs, values, explicitKeys, this.rendererService.activeContent(), directiveOptions);
    });

    protected readonly highlighted = computed(() => {
        const code = this.snippet();

        if (!code) return '';
        return tokenizeXml(code);
    });

    protected copy(): void {
        const code = this.snippet();

        if (!code) return;
        navigator.clipboard?.writeText(code);
        this.copied.set(true);
        if (this.copiedResetTimer) clearTimeout(this.copiedResetTimer);
        this.copiedResetTimer = setTimeout(() => this.copied.set(false), 1500);
    }
}
