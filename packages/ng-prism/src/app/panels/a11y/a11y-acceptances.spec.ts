import type { Result } from 'axe-core';
import type { ShowcaseMeta } from '../../../decorator/showcase.types.js';
import { partitionViolations, resolveAcceptances } from './a11y-acceptances.js';

function violation(id: string): Result {
    return { id, impact: 'serious', nodes: [], description: '', help: `${id} help`, helpUrl: '', tags: [] };
}

const contrast = { rule: 'color-contrast', reason: 'The placeholder is muted by design.' };
const label = { rule: 'label', reason: 'Labelled by the frame.' };

describe('resolveAcceptances', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    it("unites the component's acceptances with the variant's, the component's first", () => {
        expect(resolveAcceptances({ a11y: { accept: [contrast] } }, { a11y: { accept: [label] } })).toEqual([contrast, label]);
    });

    it('takes either level alone, and nothing from neither', () => {
        expect(resolveAcceptances(undefined, { a11y: { accept: [label] } })).toEqual([label]);
        expect(resolveAcceptances({ a11y: { accept: [contrast] } }, undefined)).toEqual([contrast]);
        expect(resolveAcceptances({ figma: 'x' }, {})).toEqual([]);
    });

    it('drops an entry without a rule or a reason, and warns about it once', () => {
        const broken = { a11y: { accept: [{ rule: 'label' }, { rule: ' ', reason: 'r' }, null, contrast] } } as unknown as ShowcaseMeta;

        expect(resolveAcceptances(broken, undefined)).toEqual([contrast]);
        expect(resolveAcceptances(broken, undefined)).toEqual([contrast]);

        expect(warn).toHaveBeenCalledTimes(3);
        expect(warn.mock.calls.every(([message]) => String(message).startsWith('[ng-prism]'))).toBe(true);
    });

    it('drops an accept that is not a list, and warns about it once', () => {
        const broken = { a11y: { accept: 'color-contrast' } } as unknown as ShowcaseMeta;

        expect(resolveAcceptances(broken, broken)).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
    });
});

describe('partitionViolations', () => {
    it('sets an accepted violation apart, with its reason', () => {
        const { counted, accepted } = partitionViolations([violation('color-contrast'), violation('label')], [contrast]);

        expect(counted.map((v) => v.id)).toEqual(['label']);
        expect(accepted).toEqual([{ ...violation('color-contrast'), reason: contrast.reason }]);
    });

    it('joins the reasons of two acceptances of one rule', () => {
        const { accepted } = partitionViolations([violation('color-contrast')], [contrast, { rule: 'color-contrast', reason: 'And the hint.' }]);

        expect(accepted[0].reason).toBe(`${contrast.reason} · And the hint.`);
    });

    it('counts everything without acceptances', () => {
        const { counted, accepted } = partitionViolations([violation('label')], []);

        expect(counted.map((v) => v.id)).toEqual(['label']);
        expect(accepted).toEqual([]);
    });
});
