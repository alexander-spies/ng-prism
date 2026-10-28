import type { ComponentStatus } from '../../decorator/showcase.types.js';

/** What the status of a showcase says in the component head and in the popover of a part. */
export interface StatusBadge {
    label: string;
    tooltip: string;
    tone: 'success' | 'warn' | 'danger';
}

const STATUS_BADGES: Record<ComponentStatus, StatusBadge> = {
    stable: {
        label: 'Stable',
        tooltip: 'Migrated and production-ready',
        tone: 'success'
    },
    beta: {
        label: 'Beta',
        tooltip: 'Beta: API may change',
        tone: 'warn'
    },
    wip: {
        label: 'Work in progress',
        tooltip: 'Migration in progress',
        tone: 'warn'
    },
    deprecated: {
        label: 'Deprecated',
        tooltip: 'Deprecated / Legacy. Do not use in new code',
        tone: 'danger'
    }
};

/** The badge for a status, `null` for a showcase without one: it renders no indicator. */
export function statusBadge(status: ComponentStatus | undefined): StatusBadge | null {
    return status ? STATUS_BADGES[status] : null;
}
