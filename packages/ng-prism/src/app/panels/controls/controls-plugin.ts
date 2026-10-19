import type { NgPrismPlugin } from '../../../plugin/plugin.types.js';
import { PrismControlsPanelComponent } from './prism-controls-panel.component.js';

export const CONTROLS_PLUGIN: NgPrismPlugin = {
    name: 'ng-prism:controls',
    panels: [
        {
            id: 'controls',
            label: 'Controls',
            icon: 'sliders-horizontal',
            component: PrismControlsPanelComponent
        }
    ]
};
