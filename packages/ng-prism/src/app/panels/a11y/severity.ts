import type { BadgeTone } from '../../shared/badge.types.js';

export interface SeverityBadge {
    label: string;
    tone: BadgeTone;
    variant: 'soft' | 'outline';
}

const SEVERITY: Record<'critical' | 'serious' | 'moderate' | 'minor', SeverityBadge> = {
    critical: { label: 'Critical', tone: 'danger', variant: 'soft' },
    // Serious fails the build gate like critical does, so it shares the tone and
    // is told apart by its outline and its word, not by a fifth colour.
    serious: { label: 'Serious', tone: 'danger', variant: 'outline' },
    moderate: { label: 'Moderate', tone: 'warn', variant: 'soft' },
    minor: { label: 'Minor', tone: 'neutral', variant: 'soft' }
};

/** The badge of an axe impact level; an unknown impact reads as minor. */
export function severityBadge(impact: string | null | undefined): SeverityBadge {
    return SEVERITY[impact as keyof typeof SEVERITY] ?? SEVERITY.minor;
}
