import { escapeTemplateLiteral } from './template-literal.js';

describe('escapeTemplateLiteral', () => {
    it('escapes backslash, backtick and ${', () => {
        expect(escapeTemplateLiteral('a`b${c}\\d')).toBe('a\\`b\\${c}\\\\d');
    });

    it('leaves a lone $ and a lone { alone', () => {
        expect(escapeTemplateLiteral('{{ a }} $5 {b}')).toBe('{{ a }} $5 {b}');
    });

    it('reads back as the original text in a template literal', () => {
        const text = 'a`b${c}\\d`${`';

        expect(new Function(`return \`${escapeTemplateLiteral(text)}\`;`)()).toBe(text);
    });
});
