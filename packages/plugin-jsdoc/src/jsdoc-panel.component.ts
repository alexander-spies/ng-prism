import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RuntimePipe, RuntimeService, ScannedComponent } from '@ng-prism/core/plugin';
import { type ApiPageModel, componentApiPage, pipePage, servicePage } from './api-page/api-page.model.js';
import { JsDocApiPageComponent } from './api-page/jsdoc-api-page.component.js';

@Component({
    selector: 'prism-jsdoc-panel',
    standalone: true,
    imports: [JsDocApiPageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-panel.component.html',
    styleUrl: './jsdoc-panel.component.css'
})
export class JsDocPanelComponent {
    readonly activeComponent = input<unknown>(null);
    /** Set on a service page, where `activeComponent` is `null`. */
    readonly activeService = input<unknown>(null);
    /** Set on a pipe page, where `activeComponent` is `null`. */
    readonly activePipe = input<unknown>(null);

    /** The API page of whatever is on screen; `null` when nothing is selected. */
    protected readonly apiPage = computed<ApiPageModel | null>(() => {
        const service = this.activeService() as RuntimeService | null;
        const pipe = this.activePipe() as RuntimePipe | null;
        const component = this.activeComponent() as { meta: ScannedComponent } | null;

        if (service) return servicePage(service.meta);
        if (pipe) return pipePage(pipe.meta);
        return component ? componentApiPage(component.meta) : null;
    });
}
