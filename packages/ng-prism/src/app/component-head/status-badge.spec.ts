import { statusBadge } from './status-badge.js';

describe('statusBadge', () => {
    it('labels every status', () => {
        expect(statusBadge('stable')).toEqual({ label: 'Stable', tooltip: 'Migrated and production-ready', tone: 'success' });
        expect(statusBadge('beta')).toEqual({ label: 'Beta', tooltip: 'Beta: API may change', tone: 'warn' });
        expect(statusBadge('wip')).toEqual(expect.objectContaining({ label: 'Work in progress', tone: 'warn' }));
        expect(statusBadge('deprecated')).toEqual(expect.objectContaining({ label: 'Deprecated', tone: 'danger' }));
    });

    it('has no badge without a status', () => {
        expect(statusBadge(undefined)).toBeNull();
    });
});
