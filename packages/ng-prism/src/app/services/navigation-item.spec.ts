import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { itemKey, itemShowcaseConfig } from './navigation-item.js';

const component: RuntimeComponent = {
    type: class {} as any,
    meta: {
        className: 'Button',
        filePath: '/button.ts',
        showcaseConfig: { title: 'Button' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'btn', standalone: true, isDirective: false }
    }
};

const service: RuntimeService = {
    meta: {
        className: 'ToastService',
        filePath: '/toast.service.ts',
        showcaseConfig: { title: 'Toasts' },
        provision: 'auto',
        api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
    }
};

const page: StyleguidePage = { type: 'component', title: 'Intro', component: class {} as any };

describe('navigation item helpers', () => {
    describe('itemKey', () => {
        it('uses the class name for a component', () => {
            expect(itemKey({ kind: 'component', data: component })).toBe('Button');
        });

        it('prefixes the class name of a service', () => {
            expect(itemKey({ kind: 'service', data: service })).toBe('service:ToastService');
        });

        it('prefixes the title of a page', () => {
            expect(itemKey({ kind: 'page', data: page })).toBe('page:Intro');
        });
    });

    describe('itemShowcaseConfig', () => {
        it('returns the config of a component and of a service', () => {
            expect(itemShowcaseConfig({ kind: 'component', data: component })).toBe(component.meta.showcaseConfig);
            expect(itemShowcaseConfig({ kind: 'service', data: service })).toBe(service.meta.showcaseConfig);
        });

        it('returns undefined for a page', () => {
            expect(itemShowcaseConfig({ kind: 'page', data: page })).toBeUndefined();
        });
    });
});
