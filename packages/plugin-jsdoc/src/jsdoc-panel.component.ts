import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RuntimeComponent, RuntimePipe, RuntimeService } from '@ng-prism/core/plugin';
import { type ApiPageModel, type ApiPagePart, componentApiPage, partPages, pipePage, servicePage } from './api-page/api-page.model.js';
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
    /**
     * The class name of the part of `activeComponent` whose block the page
     * scrolls to and lights up, `null` for none. The core sets it, since the
     * panel declares `listsParts`. Since 22.7.0.
     *
     * @experimental Experimental until 23.0.0: the shape may change in a 22.x minor release.
     */
    readonly activePart = input<string | null>(null);

    /** The API page of whatever is on screen; `null` when nothing is selected. */
    protected readonly apiPage = computed<ApiPageModel | null>(() => {
        const service = this.activeService() as RuntimeService | null;
        const pipe = this.activePipe() as RuntimePipe | null;
        const component = this.activeComponent() as RuntimeComponent | null;

        if (service) return servicePage(service.meta);
        if (pipe) return pipePage(pipe.meta);
        return component ? componentApiPage(component.meta) : null;
    });

    /** The parts of the component on screen, a block each on its page; a service or pipe page has none. */
    protected readonly parts = computed<readonly ApiPagePart[]>(() => {
        const component = this.activeComponent() as RuntimeComponent | null;

        return this.activeService() || this.activePipe() ? [] : partPages(component?.parts);
    });
}
