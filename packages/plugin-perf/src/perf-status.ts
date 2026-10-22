import { statusFor, type StatusTone } from '@ng-prism/core/plugin';

const LABEL: Record<StatusTone, 'OK' | 'Warning' | 'Critical'> = {
    ok: 'OK',
    warn: 'Warning',
    danger: 'Critical'
};

/**
 * A perf figure graded against its budget, lower being better: within the
 * warning bound it is OK, up to the critical bound a warning, above it critical.
 * Same rule as every other key figure (`statusFor`), so the card's colour and
 * its label cannot disagree.
 */
export function perfStatus(value: number, warn: number, crit: number): { tone: StatusTone; label: 'OK' | 'Warning' | 'Critical' } {
    const tone = statusFor(value, { ok: warn, warn: crit, direction: 'lower' });

    return { tone, label: LABEL[tone] };
}
