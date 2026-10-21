import { bootstrapApplication } from '@angular/platform-browser';
import { enablePrismHmr, PrismShellComponent, providePrism } from '@ng-prism/core';
import config from 'ng-prism.config';
import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/test-lib-prism';
import { ButtonPatternsPageComponent } from './pages/button-patterns-page.component';
import { ButtonTooltipPageComponent } from './pages/button-tooltip-page.component';
import { DesignTokensPageComponent } from './pages/design-tokens-page.component';
import { GettingStartedPageComponent } from './pages/getting-started-page.component';

const hot = (
    import.meta as ImportMeta & {
        hot?: {
            accept(dep: string, cb: (mod: { PRISM_RUNTIME_MANIFEST: typeof PRISM_RUNTIME_MANIFEST } | undefined) => void): void;
        };
    }
).hot;

bootstrapApplication(PrismShellComponent, {
    providers: [
        providePrism(PRISM_RUNTIME_MANIFEST, config, {
            componentPages: [
                {
                    title: 'Getting Started',
                    category: 'Guides',
                    component: GettingStartedPageComponent,
                    order: 1,
                    categoryOrder: 0
                },
                {
                    title: 'Design Tokens',
                    category: 'Guides',
                    component: DesignTokensPageComponent,
                    order: 2
                },
                {
                    title: 'Button Patterns',
                    category: 'Inputs',
                    component: ButtonPatternsPageComponent
                },
                {
                    title: 'Button + Tooltip',
                    category: 'Patterns',
                    component: ButtonTooltipPageComponent
                }
            ]
        })
    ]
}).then((appRef) => {
    hot?.accept('prism-manifest/test-lib-prism', (mod) => {
        if (mod) enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);
    });
});
