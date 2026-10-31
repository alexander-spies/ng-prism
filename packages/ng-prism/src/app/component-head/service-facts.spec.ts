import { serviceFacts } from './service-facts.js';

describe('serviceFacts', () => {
    it('says a root-provided service needs no setup, followed by its import path', () => {
        expect(serviceFacts('auto', '@lib/toast')).toEqual(['Provided automatically', '@lib/toast']);
    });

    it('says a manual service needs a providers entry, followed by its import path', () => {
        expect(serviceFacts('manual', '@lib/toast')).toEqual(['Needs a providers entry', '@lib/toast']);
    });

    it('leaves out the import path when the scanner found none', () => {
        expect(serviceFacts('auto', undefined)).toEqual(['Provided automatically']);
    });
});
