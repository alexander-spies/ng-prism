import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { shouldSelectFirst } from './should-select-first.js';

const component = { meta: { className: 'ButtonComponent' } } as unknown as RuntimeComponent;
const service = { meta: { className: 'ToastService' } } as unknown as RuntimeService;
const pipe = { meta: { className: 'TruncatePipe' } } as unknown as RuntimePipe;
const page = { title: 'Intro', type: 'markdown' } as unknown as StyleguidePage;

describe('shouldSelectFirst', () => {
    it('leaves an empty selection alone', () => {
        expect(shouldSelectFirst(null, null, null, null, null)).toBe(false);
    });

    it('selects the first item when the active component vanished from the manifest', () => {
        const item: NavigationItem = { kind: 'component', data: component };

        expect(shouldSelectFirst(item, null, null, null, null)).toBe(true);
    });

    it('selects the first item when the active service vanished from the manifest', () => {
        const item: NavigationItem = { kind: 'service', data: service };

        expect(shouldSelectFirst(item, null, null, null, null)).toBe(true);
    });

    it('selects the first item when the active pipe vanished from the manifest', () => {
        const item: NavigationItem = { kind: 'pipe', data: pipe };

        expect(shouldSelectFirst(item, null, null, null, null)).toBe(true);
    });

    it('selects the first item when the active page vanished from the manifest', () => {
        const item: NavigationItem = { kind: 'page', data: page };

        expect(shouldSelectFirst(item, null, null, null, null)).toBe(true);
    });

    it('keeps a selected component', () => {
        const item: NavigationItem = { kind: 'component', data: component };

        expect(shouldSelectFirst(item, component, null, null, null)).toBe(false);
    });

    it('keeps a selected service instead of bouncing back to the first item', () => {
        const item: NavigationItem = { kind: 'service', data: service };

        expect(shouldSelectFirst(item, null, service, null, null)).toBe(false);
    });

    it('keeps a selected pipe instead of bouncing back to the first item', () => {
        const item: NavigationItem = { kind: 'pipe', data: pipe };

        expect(shouldSelectFirst(item, null, null, pipe, null)).toBe(false);
    });

    it('keeps a selected page', () => {
        const item: NavigationItem = { kind: 'page', data: page };

        expect(shouldSelectFirst(item, null, null, null, page)).toBe(false);
    });
});
