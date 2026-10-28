import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { A11Y_UNLIMITED, resolveA11yThresholds } from '../../app/panels/a11y/a11y-thresholds.js';
import type { A11yReport, A11yScoreResult } from '../../app/panels/a11y/a11y.types.js';
import {
    checkA11yThresholds,
    clearA11yReportCache,
    deriveA11ySummary,
    loadA11yReport,
    readA11yForComponent,
    readA11yForComponents,
    readA11yMeta,
    resolveA11yGate
} from './a11y-report-reader.js';

function makeReport(overrides?: Partial<A11yReport['total']>): A11yReport {
    return {
        total: {
            score: 92,
            violations: 2,
            critical: 0,
            serious: 0,
            moderate: 1,
            minor: 1,
            passes: 50,
            incomplete: 3,
            auditedComponents: 5,
            auditedVariants: 12,
            ...overrides
        },
        components: {},
        generatedAt: '2026-06-01T10:00:00.000Z'
    };
}

describe('a11y-report-reader', () => {
    let tmpDir: string;
    let reportPath: string;

    beforeEach(() => {
        tmpDir = mkdtempSync(path.join(tmpdir(), 'prism-a11y-'));
        reportPath = path.join(tmpDir, 'a11y-report.json');
        clearA11yReportCache();
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('loadA11yReport', () => {
        it('returns null when the file does not exist', () => {
            expect(loadA11yReport('/nonexistent/a11y.json')).toBeNull();
        });

        it('reads and parses an existing report', () => {
            writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
            const result = loadA11yReport(reportPath);

            expect(result?.total.score).toBe(92);
        });

        it('caches by mtime', () => {
            const fs = require('node:fs');

            writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
            const spy = jest.spyOn(fs, 'readFileSync');

            loadA11yReport(reportPath);
            loadA11yReport(reportPath);
            const matchingCalls = spy.mock.calls.filter((c) => typeof c[0] === 'string' && (c[0] as string).includes('a11y-report'));

            expect(matchingCalls).toHaveLength(1);
            spy.mockRestore();
        });
    });

    describe('readA11yMeta', () => {
        it('combines report.total with resolved thresholds', () => {
            writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
            const meta = readA11yMeta(reportPath, { score: 90 });

            expect(meta?.total.score).toBe(92);
            expect(meta?.thresholds.score).toBe(90);
            expect(meta?.thresholds.critical).toBe(0); // default
        });

        it('returns null when report missing', () => {
            expect(readA11yMeta('/nonexistent/a11y.json')).toBeNull();
        });
    });

    describe('checkA11yThresholds', () => {
        it('returns empty when nothing is violated', () => {
            const meta = {
                total: makeReport().total,
                thresholds: {
                    score: 80,
                    critical: 0,
                    serious: 0,
                    moderate: A11Y_UNLIMITED
                }
            };

            expect(checkA11yThresholds(meta)).toEqual([]);
        });

        it('flags score below threshold', () => {
            const meta = {
                total: makeReport({ score: 70 }).total,
                thresholds: {
                    score: 80,
                    critical: 0,
                    serious: 0,
                    moderate: A11Y_UNLIMITED
                }
            };
            const violations = checkA11yThresholds(meta);

            expect(violations).toEqual([{ metric: 'score', actual: 70, threshold: 80 }]);
        });

        it('flags excess critical and serious violations', () => {
            const meta = {
                total: makeReport({ critical: 2, serious: 1 }).total,
                thresholds: {
                    score: 80,
                    critical: 0,
                    serious: 0,
                    moderate: A11Y_UNLIMITED
                }
            };
            const violations = checkA11yThresholds(meta);

            expect(violations.map((v) => v.metric).sort()).toEqual(['critical', 'serious']);
        });

        it('does not flag moderate violations when unlimited (default)', () => {
            const meta = {
                total: makeReport({ moderate: 50 }).total,
                thresholds: {
                    score: 80,
                    critical: 0,
                    serious: 0,
                    moderate: A11Y_UNLIMITED
                }
            };

            expect(checkA11yThresholds(meta)).toEqual([]);
        });

        it('flags moderate violations when threshold is set', () => {
            const meta = {
                total: makeReport({ moderate: 3 }).total,
                thresholds: { score: 80, critical: 0, serious: 0, moderate: 2 }
            };
            const violations = checkA11yThresholds(meta);

            expect(violations).toEqual([{ metric: 'moderate', actual: 3, threshold: 2 }]);
        });
    });

    describe('readA11yForComponent', () => {
        const thresholds = resolveA11yThresholds();

        /** A per-component entry with everything clean unless overridden. */
        const entry = (over: Partial<A11yScoreResult>): A11yScoreResult => ({
            score: 100,
            violations: 0,
            critical: 0,
            serious: 0,
            moderate: 0,
            minor: 0,
            passes: 10,
            incomplete: 0,
            ...over
        });

        function write(components: Record<string, A11yScoreResult>): void {
            writeFileSync(reportPath, JSON.stringify({ ...makeReport(), components }), 'utf-8');
            clearA11yReportCache();
        }

        it('returns null when the report file is missing', () => {
            expect(readA11yForComponent('does/not/exist.json', 'ButtonComponent', thresholds)).toBeNull();
        });

        it('returns null when the report does not know the component', () => {
            write({ CardComponent: entry({}) });
            expect(readA11yForComponent(reportPath, 'ButtonComponent', thresholds)).toBeNull();
        });

        it('returns the score plus a derived summary', () => {
            write({
                ButtonComponent: entry({ score: 50, violations: 2, critical: 2 })
            });
            const result = readA11yForComponent(reportPath, 'ButtonComponent', thresholds);

            expect(result?.found).toBe(true);
            expect(result?.score.critical).toBe(2);
            expect(result?.summary?.variant).toBe('danger');
        });

        it('returns every component the report knows, each with its verdict', () => {
            // The plural form exists so the pipeline reads the report once instead
            // of once per scanned component: the singular form re-stats the file on
            // every call, cache hit included, which scales the syscalls with the
            // library and repeats them on every watch rebuild. Each entry has to
            // carry the same derivation the singular form applies.
            write({
                ButtonComponent: entry({ score: 50, critical: 2 }),
                CardComponent: entry({ score: 100 })
            });

            const byClassName = readA11yForComponents(reportPath, thresholds);

            expect([...byClassName.keys()].sort()).toEqual(['ButtonComponent', 'CardComponent']);
            for (const className of byClassName.keys()) {
                expect(byClassName.get(className)).toEqual(readA11yForComponent(reportPath, className, thresholds));
            }
        });

        it('returns an empty map when the report file is missing', () => {
            expect(readA11yForComponents('does/not/exist.json', thresholds).size).toBe(0);
        });
    });
});

describe('resolveA11yGate', () => {
    it('gates with the defaults when nothing is configured', () => {
        expect(resolveA11yGate(undefined)).toEqual(resolveA11yThresholds());
    });

    it('gates with the grading thresholds while gate is not set, as before 22.7.0', () => {
        expect(resolveA11yGate({ thresholds: { score: 90 } })).toEqual(resolveA11yThresholds({ score: 90 }));
    });

    it('gates with its own limits, filled from the defaults rather than the grading thresholds', () => {
        expect(resolveA11yGate({ thresholds: { score: 90 }, gate: { serious: 3 } })).toEqual({ ...resolveA11yThresholds(), serious: 3 });
    });

    it('does not gate with gate: false', () => {
        expect(resolveA11yGate({ thresholds: { serious: 0 }, gate: false })).toBeNull();
    });
});

describe('deriveA11ySummary', () => {
    const thresholds = resolveA11yThresholds();

    const score = (over: Partial<A11yScoreResult>): A11yScoreResult => ({
        score: 100,
        violations: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
        passes: 10,
        incomplete: 0,
        ...over
    });

    it('is danger for a critical violation', () => {
        const result = deriveA11ySummary(score({ critical: 2 }), thresholds);

        expect(result.variant).toBe('danger');
        expect(result.label).toContain('2 critical');
    });

    it('is danger for a serious violation', () => {
        const result = deriveA11ySummary(score({ serious: 1 }), thresholds);

        expect(result.variant).toBe('danger');
        expect(result.label).toContain('1 serious');
    });

    it('names both counts when both are over', () => {
        const result = deriveA11ySummary(score({ critical: 1, serious: 3 }), thresholds);

        expect(result.label).toBe('A11y: 1 critical, 3 serious');
    });

    it('is warn for a score below the threshold', () => {
        const result = deriveA11ySummary(score({ score: 60 }), thresholds);

        expect(result.variant).toBe('warn');
        expect(result.label).toBe('A11y score 60');
    });

    it('is ok inside every threshold', () => {
        expect(deriveA11ySummary(score({}), thresholds).variant).toBe('ok');
    });

    it('never fires on moderate with the unlimited default', () => {
        const result = deriveA11ySummary(score({ moderate: 999 }), thresholds);

        expect(result.variant).toBe('ok');
    });

    it('falls back to the score-based label if a negative threshold fires danger with nothing to name', () => {
        // Not reachable with a sane config: a negative `critical` threshold makes
        // `0 > threshold` true even though nothing was actually found, so `parts`
        // stays empty and a naive label would read "A11y: ".
        const negativeThresholds = resolveA11yThresholds({ critical: -1 });
        const result = deriveA11ySummary(score({}), negativeThresholds);

        expect(result.variant).toBe('danger');
        expect(result.label).toBe('A11y score 100');
    });
});
