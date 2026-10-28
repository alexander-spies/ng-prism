import { signal } from '@angular/core';
import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { selectInstead } from './select-instead.js';

const option = { meta: { className: 'OptionComponent' } } as unknown as RuntimeComponent;
const select = { meta: { className: 'SelectComponent' }, parts: [option] } as unknown as RuntimeComponent;
const service = { meta: { className: 'ToastService' } } as unknown as RuntimeService;
const JSDOC = { id: 'jsdoc', label: 'API', listsParts: true } as unknown as PanelDefinition;

function setup(view: string, partsPanel: PanelDefinition | null = JSDOC) {
    const calls: string[] = [];
    const navigation = {
        parentOfPart: (className: string) => (className === 'OptionComponent' ? select : undefined),
        select: (comp: RuntimeComponent) => void calls.push(`select ${comp.meta.className}`),
        selectFirst: () => void calls.push('selectFirst')
    };
    const panels = {
        activeViewId: signal(view),
        partsPanel: signal(partsPanel),
        showPart: (part: string, panelId: string) => void calls.push(`showPart ${part} ${panelId}`)
    };

    return { calls, navigation, panels };
}

describe('selectInstead', () => {
    it('opens the parent of a component that became a part, on the part in the view that lists parts', () => {
        const { calls, navigation, panels } = setup('jsdoc');

        selectInstead({ kind: 'component', data: option }, navigation, panels);

        expect(calls).toEqual(['select SelectComponent', 'showPart OptionComponent jsdoc']);
    });

    it('opens the parent without the part in any other view', () => {
        const { calls, navigation, panels } = setup('renderer');

        selectInstead({ kind: 'component', data: option }, navigation, panels);

        expect(calls).toEqual(['select SelectComponent']);
    });

    it('opens the parent without the part when no visible panel lists parts', () => {
        const { calls, navigation, panels } = setup('jsdoc', null);

        selectInstead({ kind: 'component', data: option }, navigation, panels);

        expect(calls).toEqual(['select SelectComponent']);
    });

    it('falls back to the first entry for a component that is gone, and for any other kind', () => {
        const gone = { meta: { className: 'GoneComponent' } } as unknown as RuntimeComponent;
        const items: NavigationItem[] = [
            { kind: 'component', data: gone },
            { kind: 'service', data: service }
        ];

        for (const item of items) {
            const { calls, navigation, panels } = setup('jsdoc');

            selectInstead(item, navigation, panels);
            expect(calls).toEqual(['selectFirst']);
        }
    });
});
