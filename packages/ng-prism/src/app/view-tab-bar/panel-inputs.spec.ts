import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { activeViewPanel, panelInputsFor, panelTargets } from './panel-inputs.js';

const component = { meta: { className: 'ButtonComponent' } } as unknown as RuntimeComponent;
const service = { meta: { className: 'ToastService' } } as unknown as RuntimeService;

function panel(appliesTo?: PanelDefinition['appliesTo']): PanelDefinition {
    return { id: 'docs', label: 'API', placement: 'view', appliesTo };
}

describe('panelTargets', () => {
    it('defaults to component pages', () => {
        expect(panelTargets(panel())).toEqual(['component']);
    });

    it('returns the declared targets', () => {
        expect(panelTargets(panel(['service']))).toEqual(['service']);
    });
});

describe('panelInputsFor', () => {
    it('passes only activeComponent to a panel without appliesTo', () => {
        expect(panelInputsFor(panel(), component, service)).toEqual({ activeComponent: component });
    });

    it('passes only activeService to a service-only panel', () => {
        expect(panelInputsFor(panel(['service']), null, service)).toEqual({ activeService: service });
    });

    it('passes both to a panel that applies to both', () => {
        expect(panelInputsFor(panel(['component', 'service']), null, service)).toEqual({
            activeComponent: null,
            activeService: service
        });
    });

    it('keeps activeComponent as the only input when no panel is active', () => {
        expect(panelInputsFor(undefined, component, null)).toEqual({ activeComponent: component });
    });
});

describe('activeViewPanel', () => {
    const overview: PanelDefinition = { id: 'overview', label: 'Overview', placement: 'view' };
    const api: PanelDefinition = { id: 'jsdoc', label: 'API', placement: 'view', appliesTo: ['component', 'service'] };
    const notes: PanelDefinition = { id: 'notes', label: 'Notes', placement: 'view', appliesTo: ['service'] };

    it('resolves the active view on a component page', () => {
        expect(activeViewPanel([overview, api], 'overview', 'component')).toBe(overview);
    });

    it('resolves a view that applies to services on a service page', () => {
        expect(activeViewPanel([overview, api, notes], 'jsdoc', 'service')).toBe(api);
        expect(activeViewPanel([overview, api, notes], 'notes', 'service')).toBe(notes);
    });

    it('resolves nothing on a service page for a view that applies to components only', () => {
        expect(activeViewPanel([overview, api], 'overview', 'service')).toBeUndefined();
    });

    it('resolves nothing on a component page for a view that applies to services only', () => {
        expect(activeViewPanel([overview, notes], 'notes', 'component')).toBeUndefined();
    });

    it('resolves nothing for an id no view panel has', () => {
        expect(activeViewPanel([overview, api], 'renderer', 'component')).toBeUndefined();
    });
});
