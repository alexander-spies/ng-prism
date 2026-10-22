import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BoxModelStateService } from './box-model-state.service.js';
import { formatSide } from './box-model-utils.js';
import type { BoxModelData } from './box-model.types.js';

@Component({
    selector: 'prism-box-model-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './box-model-panel.component.html',
    styleUrl: './box-model-panel.component.css'
})
export class BoxModelPanelComponent {
    protected readonly stateService = inject(BoxModelStateService);

    readonly activeComponent = input<unknown>(null);

    fmt(value: number): string {
        return formatSide(value);
    }

    /** The outer size and the content size, for the diagram's tooltip. */
    sizeTitle(bm: BoxModelData): string {
        return `Border box ${Math.round(bm.content.width)} × ${Math.round(bm.content.height)} · content ${this.contentW(bm)} × ${this.contentH(bm)}`;
    }

    contentW(bm: BoxModelData): string {
        return String(Math.round(bm.content.width - bm.border.left - bm.border.right - bm.padding.left - bm.padding.right));
    }

    contentH(bm: BoxModelData): string {
        return String(Math.round(bm.content.height - bm.border.top - bm.border.bottom - bm.padding.top - bm.padding.bottom));
    }
}
