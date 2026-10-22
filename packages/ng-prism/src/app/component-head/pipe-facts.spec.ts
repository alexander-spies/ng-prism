import { pipeFacts } from './pipe-facts.js';

describe('pipeFacts', () => {
    it('says a pure pipe is pure, followed by its import path', () => {
        expect(pipeFacts(true, '@lib/text')).toEqual(['Pure', '@lib/text']);
    });

    it('says an impure pipe is impure, followed by its import path', () => {
        expect(pipeFacts(false, '@lib/text')).toEqual(['Impure', '@lib/text']);
    });

    it('leaves out the purity when the scanner could not read it', () => {
        expect(pipeFacts(undefined, '@lib/text')).toEqual(['@lib/text']);
    });

    it('leaves out the import path when the scanner found none', () => {
        expect(pipeFacts(true, undefined)).toEqual(['Pure']);
    });

    it('has no facts when the scanner found neither', () => {
        expect(pipeFacts(undefined, undefined)).toEqual([]);
    });
});
