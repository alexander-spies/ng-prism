import type { PanelDefinition, RuntimeComponent } from '../../../plugin/plugin.types.js';
import { addonPanelsFor } from './addon-panels.js';

const component = { meta: { className: 'ButtonComponent' } } as unknown as RuntimeComponent;

function panel(id: string, overrides: Partial<PanelDefinition> = {}): PanelDefinition {
    return { id, label: id, ...overrides };
}

describe('addonPanelsFor', () => {
    it('keeps a panel without appliesTo, which is a component panel', () => {
        expect(addonPanelsFor([panel('controls')], component).map((p) => p.id)).toEqual(['controls']);
    });

    it('keeps a panel that applies to components and services', () => {
        expect(addonPanelsFor([panel('notes', { appliesTo: ['component', 'service'] })], component).map((p) => p.id)).toEqual(['notes']);
    });

    it('leaves out a panel that applies to services only', () => {
        expect(addonPanelsFor([panel('controls'), panel('service-notes', { appliesTo: ['service'] })], component).map((p) => p.id)).toEqual(['controls']);
    });

    it('leaves out a panel whose isVisible turns the component down', () => {
        expect(addonPanelsFor([panel('controls'), panel('figma', { isVisible: () => false })], component).map((p) => p.id)).toEqual(['controls']);
    });

    it('does not ask isVisible without a component, and still leaves out a service-only panel', () => {
        const isVisible = jest.fn(() => false);

        expect(addonPanelsFor([panel('figma', { isVisible }), panel('service-notes', { appliesTo: ['service'] })], null).map((p) => p.id)).toEqual(['figma']);
        expect(isVisible).not.toHaveBeenCalled();
    });
});
