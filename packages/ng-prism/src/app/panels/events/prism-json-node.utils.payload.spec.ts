import { isEmptyPayload } from './prism-json-node.utils.js';

describe('isEmptyPayload', () => {
    it('treats an output emitted without a value as empty', () => {
        expect(isEmptyPayload(undefined)).toBe(true);
    });

    it.each([null, '', 0, false, [], {}])('keeps %p as a real payload', (value) => {
        expect(isEmptyPayload(value)).toBe(false);
    });
});
