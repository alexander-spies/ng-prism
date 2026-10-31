import type { CheckResult, NodeResult, Result } from 'axe-core';
import { reviewFindings } from './a11y-findings.js';

function check(message: string): CheckResult {
    return { id: 'c', impact: 'serious', message, data: null };
}

function node(checks: { any?: string[]; all?: string[]; none?: string[] }): NodeResult {
    return {
        html: '<span></span>',
        target: ['span'],
        any: (checks.any ?? []).map(check),
        all: (checks.all ?? []).map(check),
        none: (checks.none ?? []).map(check)
    };
}

function result(id: string, impact: Result['impact'], nodes: NodeResult[]): Result {
    return { id, impact, nodes, description: `${id} description`, help: `${id} help`, helpUrl: '', tags: [] };
}

const OVERLAP = "Element's background color could not be determined because it's overlapped by another element";

describe('reviewFindings', () => {
    it('gives each undecided check its reason once, and how many nodes it reached', () => {
        const findings = reviewFindings([result('color-contrast', 'serious', [node({ any: [OVERLAP] }), node({ any: [OVERLAP] })])]);

        expect(findings).toEqual([{ id: 'color-contrast', help: 'color-contrast help', impact: 'serious', reasons: [OVERLAP], nodes: 2 }]);
    });

    it('collects the reasons of the any, all and none checks', () => {
        const [finding] = reviewFindings([result('aria', 'moderate', [node({ any: ['a'], all: ['b'], none: ['c', 'a'] })])]);

        expect(finding.reasons).toEqual(['a', 'b', 'c']);
    });

    it('puts the most severe first, and an undecided impact last', () => {
        const findings = reviewFindings([
            result('minor-one', 'minor', []),
            result('none-one', null, []),
            result('critical-one', 'critical', []),
            result('serious-one', 'serious', []),
            result('moderate-one', 'moderate', [])
        ]);

        expect(findings.map((f) => f.id)).toEqual(['critical-one', 'serious-one', 'moderate-one', 'minor-one', 'none-one']);
    });

    it('has nothing to review when axe decided everything', () => {
        expect(reviewFindings([])).toEqual([]);
    });
});
