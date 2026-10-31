import type { ImpactValue, Result } from 'axe-core';

/** Most severe first; a missing impact sorts last. */
export const IMPACT_ORDER: Record<string, number> = {
    critical: 0,
    serious: 1,
    moderate: 2,
    minor: 3
};

export function byImpact(a: { impact?: ImpactValue }, b: { impact?: ImpactValue }): number {
    return (IMPACT_ORDER[a.impact ?? ''] ?? 4) - (IMPACT_ORDER[b.impact ?? ''] ?? 4);
}

/** A check axe could not decide ("incomplete"), with why, for the Needs review list. */
export interface ReviewFinding {
    id: string;
    help: string;
    impact: ImpactValue | null;
    /** axe's own explanations from the checks of its nodes, each once. */
    reasons: string[];
    nodes: number;
}

/**
 * What axe could not decide, most severe first. It does not count towards the
 * score, but it is not a pass either: a contrast axe could not judge, for
 * instance over a background image, shows up here instead of disappearing.
 */
export function reviewFindings(incomplete: Result[]): ReviewFinding[] {
    return [...incomplete].sort(byImpact).map((result) => ({
        id: result.id,
        help: result.help,
        impact: result.impact ?? null,
        reasons: [...new Set(result.nodes.flatMap((node) => [...node.any, ...node.all, ...node.none].map((check) => check.message)))],
        nodes: result.nodes.length
    }));
}
