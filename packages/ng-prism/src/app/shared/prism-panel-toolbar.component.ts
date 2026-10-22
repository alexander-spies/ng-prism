import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The toolbar row of an addon panel: sub-tabs on the left (`[toolbarStart]`),
 * actions on the right (`[toolbarEnd]`, secondary before primary).
 *
 * No meta text: counts, timestamps, thresholds and sizes belong in tooltips. A
 * panel renders this only when it has sub-tabs or actions.
 */
@Component({
    selector: 'prism-panel-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-panel-toolbar.component.html',
    styleUrl: './prism-panel-toolbar.component.css'
})
export class PrismPanelToolbarComponent {}
