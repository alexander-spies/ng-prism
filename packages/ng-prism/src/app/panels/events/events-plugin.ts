import type { NgPrismPlugin } from '../../../plugin/plugin.types.js';
import { PrismEventsPanelComponent } from './prism-events-panel.component.js';

export const EVENTS_PLUGIN: NgPrismPlugin = {
    name: 'ng-prism:events',
    panels: [
        {
            id: 'events',
            label: 'Events',
            icon: 'zap',
            component: PrismEventsPanelComponent
        }
    ]
};
