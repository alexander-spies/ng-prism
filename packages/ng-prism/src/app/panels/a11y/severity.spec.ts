import { severityBadge } from './severity.js';

describe('severityBadge', () => {
    it.each([
        ['critical', { label: 'Critical', tone: 'danger', variant: 'soft' }],
        ['serious', { label: 'Serious', tone: 'danger', variant: 'outline' }],
        ['moderate', { label: 'Moderate', tone: 'warn', variant: 'soft' }],
        ['minor', { label: 'Minor', tone: 'neutral', variant: 'soft' }]
    ] as const)('shows %s as %o', (impact, badge) => {
        expect(severityBadge(impact)).toEqual(badge);
    });

    it('treats an unknown impact like a minor one', () => {
        expect(severityBadge(null)).toEqual({ label: 'Minor', tone: 'neutral', variant: 'soft' });
    });
});
