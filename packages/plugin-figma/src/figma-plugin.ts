import type { NgPrismPlugin, PanelDefinition } from '@ng-prism/core/plugin';
import { FIGMA_PLUGIN_CONFIG, type FigmaPluginOptions } from './figma-config.token.js';
import { FigmaPanelComponent } from './figma-panel.component.js';

const hasFigmaMeta = (comp: { meta: { showcaseConfig: { meta?: Record<string, unknown> } } }) => typeof comp.meta.showcaseConfig.meta?.['figma'] === 'string';

const hasVariantFigmaMeta = (comp: {
    meta: {
        showcaseConfig: { variants?: Array<{ meta?: Record<string, unknown> }> };
    };
}) => comp.meta.showcaseConfig.variants?.some((v) => v.meta?.['figma'] != null) === true;

export function figmaPlugin(options: FigmaPluginOptions = {}): NgPrismPlugin {
    const panels: PanelDefinition[] = [
        {
            id: 'figma',
            label: 'Figma',
            icon: 'figma',
            component: FigmaPanelComponent,
            isVisible: hasFigmaMeta,
            keepAlive: true
        }
    ];

    if (options.designDiff === true) {
        panels.push({
            id: 'figma-diff',
            label: 'Design Diff',
            icon: 'copy',
            loadComponent: () => import('./diff/figma-design-diff-panel.component.js').then((m) => m.FigmaDesignDiffPanelComponent),
            providers: [{ provide: FIGMA_PLUGIN_CONFIG, useValue: options }],
            isVisible: hasVariantFigmaMeta
        });
    }

    return {
        name: '@ng-prism/plugin-figma',
        panels
    };
}
