import { Injector, runInInjectionContext, signal } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismHeadPartsComponent } from './prism-head-parts.component.js';

/** The class without its template, which this workspace's JIT setup cannot render: the handler is what is checked. */
function createHeadParts(calls: string[]): PrismHeadPartsComponent {
    const injector = Injector.create({
        providers: [
            { provide: PrismNavigationService, useValue: { activeComponent: signal(null) } },
            {
                provide: PrismPanelService,
                useValue: {
                    partsPanel: signal(null),
                    showPart: (part: string, panelId: string) => calls.push(`showPart ${part} ${panelId}`)
                }
            }
        ]
    });

    return runInInjectionContext(injector, () => new PrismHeadPartsComponent());
}

describe('PrismHeadPartsComponent', () => {
    it('closes the card, then opens the panel on the part', () => {
        const calls: string[] = [];
        const card = { hidePopover: () => calls.push('hidePopover') } as unknown as HTMLElement;

        createHeadParts(calls)['showFullApi']('OptionComponent', 'jsdoc', card);

        expect(calls).toEqual(['hidePopover', 'showPart OptionComponent jsdoc']);
    });
});
