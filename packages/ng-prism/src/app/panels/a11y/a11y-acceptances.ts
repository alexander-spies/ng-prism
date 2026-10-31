import type { Result } from 'axe-core';
import type { A11yAcceptance, ShowcaseMeta } from '../../../decorator/showcase.types.js';

/** A violation an acceptance covers, with its reason: shown under Accepted, not counted. */
export type AcceptedViolation = Result & { reason: string };

/** What was warned about already: the audit resolves on every input change, the console hears it once. */
const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(message);
}

function isAcceptance(entry: unknown): entry is A11yAcceptance {
    if (typeof entry !== 'object' || entry === null) return false;
    const { rule, reason } = entry as Partial<Record<keyof A11yAcceptance, unknown>>;

    return typeof rule === 'string' && rule.trim() !== '' && typeof reason === 'string' && reason.trim() !== '';
}

/** The valid entries of one `meta.a11y.accept`; the others are dropped with a warning, since tsc cannot see a value built at runtime. */
function acceptancesOf(meta: ShowcaseMeta | undefined): A11yAcceptance[] {
    const accept: unknown = meta?.a11y?.accept;

    if (accept === undefined) return [];
    if (!Array.isArray(accept)) {
        warnOnce(JSON.stringify(accept), `[ng-prism] meta.a11y.accept must be a list of { rule, reason }; ignoring ${JSON.stringify(accept)}.`);
        return [];
    }
    return accept.filter((entry: unknown) => {
        if (isAcceptance(entry)) return true;
        warnOnce(JSON.stringify(entry), `[ng-prism] Ignoring a meta.a11y.accept entry without a rule or a reason: ${JSON.stringify(entry)}. An acceptance needs both.`);
        return false;
    });
}

/**
 * The acceptances that apply to one variant: the component's, which apply to
 * every variant, and the variant's own. Since 22.7.0.
 */
export function resolveAcceptances(componentMeta: ShowcaseMeta | undefined, variantMeta: ShowcaseMeta | undefined): A11yAcceptance[] {
    return [...acceptancesOf(componentMeta), ...acceptancesOf(variantMeta)];
}

/** Splits violations into the ones that count and the ones an acceptance covers, matched by the axe rule id. */
export function partitionViolations(violations: Result[], acceptances: readonly A11yAcceptance[]): { counted: Result[]; accepted: AcceptedViolation[] } {
    const counted: Result[] = [];
    const accepted: AcceptedViolation[] = [];

    for (const violation of violations) {
        const reasons = acceptances.filter((acceptance) => acceptance.rule === violation.id).map((acceptance) => acceptance.reason);

        if (reasons.length > 0) accepted.push({ ...violation, reason: reasons.join(' · ') });
        else counted.push(violation);
    }
    return { counted, accepted };
}
