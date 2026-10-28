import type { AxeResults } from 'axe-core';
import { calculateScore, runCoreAudit } from './a11y-audit.service.js';

const mockResults: AxeResults = {
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    testEngine: { name: 'axe-core', version: '4.0.0' },
    testRunner: { name: 'axe' },
    testEnvironment: { userAgent: '', windowWidth: 0, windowHeight: 0, orientationAngle: 0, orientationType: '' },
    timestamp: '',
    url: '',
    toolOptions: {}
};

jest.mock('axe-core', () => ({
    __esModule: true,
    default: { run: jest.fn() }
}));

describe('calculateScore', () => {
    it('returns 100 with no violations', () => {
        const result = calculateScore({ ...mockResults, violations: [], passes: [] });

        expect(result.score).toBe(100);
    });

    it('deducts 25 per critical violation', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [{ id: 'v', impact: 'critical', description: '', nodes: [], tags: [], help: '', helpUrl: '' }]
        });

        expect(result.score).toBe(75);
    });

    it('deducts 10 per serious violation', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [{ id: 'v', impact: 'serious', description: '', nodes: [], tags: [], help: '', helpUrl: '' }]
        });

        expect(result.score).toBe(90);
    });

    it('deducts 5 per moderate violation', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [{ id: 'v', impact: 'moderate', description: '', nodes: [], tags: [], help: '', helpUrl: '' }]
        });

        expect(result.score).toBe(95);
    });

    it('deducts 1 per minor violation', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [{ id: 'v', impact: 'minor', description: '', nodes: [], tags: [], help: '', helpUrl: '' }]
        });

        expect(result.score).toBe(99);
    });

    it('clamps score to 0 with many violations', () => {
        const criticals = Array.from({ length: 10 }, (_, i) => ({
            id: `v${i}`,
            impact: 'critical' as const,
            description: '',
            nodes: [],
            tags: [],
            help: '',
            helpUrl: ''
        }));
        const result = calculateScore({ ...mockResults, violations: criticals });

        expect(result.score).toBe(0);
    });

    it('sums mixed impact violations', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [
                { id: 'a', impact: 'critical', description: '', nodes: [], tags: [], help: '', helpUrl: '' },
                { id: 'b', impact: 'moderate', description: '', nodes: [], tags: [], help: '', helpUrl: '' }
            ]
        });

        expect(result.score).toBe(70);
    });

    it('counts passes and incomplete correctly', () => {
        const result = calculateScore({
            ...mockResults,
            violations: [],
            passes: [
                { id: 'p1', impact: null, description: '', nodes: [], tags: [], help: '', helpUrl: '' },
                { id: 'p2', impact: null, description: '', nodes: [], tags: [], help: '', helpUrl: '' }
            ],
            incomplete: [{ id: 'i1', impact: null, description: '', nodes: [], tags: [], help: '', helpUrl: '' }]
        });

        expect(result.passes).toBe(2);
        expect(result.incomplete).toBe(1);
    });
});

describe('runCoreAudit', () => {
    // Outside a canvas stage: the node environment has no DOM, and an audit there skips the hiding.
    const mockElement = { closest: () => null } as unknown as Element;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls axe-core with the element', async () => {
        const axe = (await import('axe-core')).default;

        (axe.run as jest.Mock).mockResolvedValue(mockResults);

        await runCoreAudit(mockElement);

        expect(axe.run).toHaveBeenCalledWith(mockElement, {});
    });

    it('passes rules config to axe-core', async () => {
        const axe = (await import('axe-core')).default;

        (axe.run as jest.Mock).mockResolvedValue(mockResults);

        await runCoreAudit(mockElement, {
            rules: { 'color-contrast': { enabled: false } }
        });

        expect(axe.run).toHaveBeenCalledWith(mockElement, {
            rules: { 'color-contrast': { enabled: false } }
        });
    });

    it('propagates axe-core errors', async () => {
        const axe = (await import('axe-core')).default;

        (axe.run as jest.Mock).mockRejectedValueOnce(new Error('axe failed'));

        await expect(runCoreAudit(mockElement)).rejects.toThrow('axe failed');
    });
});
