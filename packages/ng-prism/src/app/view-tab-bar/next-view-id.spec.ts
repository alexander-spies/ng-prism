import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { nextViewId } from './next-view-id.js';

function panel(id: string): PanelDefinition {
    return { id, label: id };
}

describe('nextViewId', () => {
    it('stands pat on renderer even when nothing is visible', () => {
        expect(nextViewId('renderer', [])).toBeNull();
    });

    it('stands pat when the active view is still offered', () => {
        expect(nextViewId('overview', [panel('overview'), panel('api')])).toBeNull();
    });

    it('falls back to renderer when the active view is no longer offered', () => {
        expect(nextViewId('overview', [panel('api')])).toBe('renderer');
    });

    it('falls back to renderer when the visible list is empty (the case that drops a page out of its view tabs)', () => {
        expect(nextViewId('overview', [])).toBe('renderer');
    });

    it('on a service page, falls back to the first service panel when the active view is renderer', () => {
        expect(nextViewId('renderer', [panel('api'), panel('notes')], 'service')).toBe('api');
    });

    it('on a service page, keeps a service panel that is still offered', () => {
        expect(nextViewId('notes', [panel('api'), panel('notes')], 'service')).toBeNull();
    });

    it('on a service page, falls back to the first service panel when the active view is no longer offered', () => {
        expect(nextViewId('overview', [panel('api')], 'service')).toBe('api');
    });

    it('on a service page with no service panels, returns null', () => {
        expect(nextViewId('renderer', [], 'service')).toBeNull();
    });

    it('on a pipe page, falls back to the first pipe panel when the active view is renderer', () => {
        expect(nextViewId('renderer', [panel('api'), panel('notes')], 'pipe')).toBe('api');
    });

    it('on a pipe page, keeps a pipe panel that is still offered', () => {
        expect(nextViewId('notes', [panel('api'), panel('notes')], 'pipe')).toBeNull();
    });

    it('on a pipe page, falls back to the first pipe panel when the active view is no longer offered', () => {
        expect(nextViewId('overview', [panel('api')], 'pipe')).toBe('api');
    });

    it('on a pipe page with no pipe panels, returns null', () => {
        expect(nextViewId('renderer', [], 'pipe')).toBeNull();
    });
});
