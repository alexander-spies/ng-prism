import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearReportCache, readTotals, readVariantsForComponent } from './report-reader.js';

const FIXTURE = join(__dirname, '__fixtures__', 'vrt-report.json');
const MISSING = join(__dirname, '__fixtures__', 'does-not-exist.json');

/** Writes `content` verbatim to a throwaway report file and returns its path. */
function writeReport(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'vrt-report-'));

    scratchDirs.push(dir);
    const file = join(dir, 'vrt-report.json');

    writeFileSync(file, content, 'utf-8');
    return file;
}

const scratchDirs: string[] = [];

afterAll(() => {
    for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

describe('readVariantsForComponent', () => {
    beforeEach(() => clearReportCache());

    it('returns every variant recorded for the component', () => {
        const variants = readVariantsForComponent(FIXTURE, 'DividerComponent');

        expect(variants).toHaveLength(2);
        expect(variants.map((v) => v.variantName)).toEqual(['Horizontal', 'Vertical']);
    });

    it('drops a variant whose status it cannot render', () => {
        // Everything downstream is keyed by `status`, and the group tables only
        // know the five documented values. Letting an unknown one through used to
        // produce a variant that the counts included and the list did not show.
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const file = writeReport(
            JSON.stringify({
                byVariant: [
                    { className: 'A', variantIndex: 0, status: 'unchanged' },
                    { className: 'A', variantIndex: 1, status: 'failed' }
                ]
            })
        );

        const variants = readVariantsForComponent(file, 'A');

        expect(variants.map((v) => v.status)).toEqual(['unchanged']);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('"failed"');
        warn.mockRestore();
    });

    it('warns once per unknown status, not once per component', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const file = writeReport(
            JSON.stringify({
                byVariant: [
                    { className: 'A', variantIndex: 0, status: 'failed' },
                    { className: 'B', variantIndex: 0, status: 'failed' }
                ]
            })
        );

        readVariantsForComponent(file, 'A');
        readVariantsForComponent(file, 'B');
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it('orders variants by variantIndex', () => {
        const variants = readVariantsForComponent(FIXTURE, 'ButtonComponent');

        expect(variants.map((v) => v.variantIndex)).toEqual([0, 1, 2]);
    });

    it('sorts states after their variant', () => {
        const file = writeReport(
            JSON.stringify({
                byVariant: [
                    { className: 'A', variantIndex: 1, status: 'unchanged' },
                    { className: 'A', variantIndex: 0, stateIndex: 2, stateName: 'Focus', status: 'unchanged' },
                    { className: 'A', variantIndex: 0, stateIndex: 0, stateName: 'Hover', status: 'unchanged' },
                    { className: 'A', variantIndex: 0, status: 'unchanged' }
                ]
            })
        );

        const variants = readVariantsForComponent(file, 'A');

        expect(variants.map((v) => [v.variantIndex, v.stateIndex])).toEqual([
            [0, undefined],
            [0, 0],
            [0, 2],
            [1, undefined]
        ]);
    });

    it('does not leak variants from other components', () => {
        const variants = readVariantsForComponent(FIXTURE, 'ButtonComponent');

        expect(variants.every((v) => v.className === 'ButtonComponent')).toBe(true);
    });

    it('passes an excluded variant through with its reason', () => {
        const variants = readVariantsForComponent(FIXTURE, 'TooltipDirective');

        expect(variants).toHaveLength(1);
        expect(variants[0].status).toBe('excluded');
        expect(variants[0].reason).toContain('hover');
    });

    it('returns an empty list for a component with no results', () => {
        expect(readVariantsForComponent(FIXTURE, 'UnknownComponent')).toEqual([]);
    });

    it('returns an empty list when the report does not exist', () => {
        expect(readVariantsForComponent(MISSING, 'ButtonComponent')).toEqual([]);
    });

    it('preserves a new variant without a baseline', () => {
        const ghost = readVariantsForComponent(FIXTURE, 'ButtonComponent')[1];

        expect(ghost.status).toBe('new');
        expect(ghost.baselinePath).toBeUndefined();
        expect(ghost.currentPath).toBe('vrt/current/ButtonComponent/01-ghost.png');
    });
});

describe('readTotals', () => {
    beforeEach(() => clearReportCache());

    it('reads the totals block', () => {
        expect(readTotals(FIXTURE)).toEqual({
            auditedVariants: 6,
            auditedComponents: 2,
            unchanged: 3,
            changed: 1,
            sizeMismatch: 0,
            new: 1,
            excluded: 1,
            maxDiffRatio: 0.5,
            score: 75
        });
    });

    it('returns null when the report does not exist', () => {
        expect(readTotals(MISSING)).toBeNull();
    });
    it('reports the excluded count when the runner provides one', () => {
        expect(readTotals(FIXTURE)?.excluded).toBe(1);
    });
});

/**
 * A malformed report must degrade the same way as a missing one. These run
 * inside `onComponentScanned`, where the plugin runner rethrows and fails the
 * whole styleguide build.
 */
describe('a malformed report', () => {
    beforeEach(() => clearReportCache());

    it('degrades when byVariant is not an array', () => {
        const file = writeReport('{ "byVariant": { "ButtonComponent": [] } }');

        expect(() => readVariantsForComponent(file, 'ButtonComponent')).not.toThrow();
        expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
    });

    it('degrades when the file is truncated mid-write', () => {
        const file = writeReport('{ "total": { "score": 9');

        expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
        expect(readTotals(file)).toBeNull();
    });

    it('degrades when the JSON root is not an object', () => {
        const file = writeReport('[]');

        expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
        expect(readTotals(file)).toBeNull();
    });

    it('skips null entries instead of dereferencing them', () => {
        const file = writeReport('{ "byVariant": [null, { "className": "ButtonComponent", "variantIndex": 0, "status": "unchanged" }] }');
        const variants = readVariantsForComponent(file, 'ButtonComponent');

        expect(variants).toHaveLength(1);
        expect(variants[0].status).toBe('unchanged');
    });

    it('returns null totals when total is not an object', () => {
        const file = writeReport('{ "total": 99, "byVariant": [] }');

        expect(readTotals(file)).toBeNull();
    });
});
