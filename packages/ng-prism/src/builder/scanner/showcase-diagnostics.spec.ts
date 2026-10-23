import ts from 'typescript';
import { describeShowcaseIssue } from './showcase-diagnostics.js';

function configOf(source: string): ts.Expression {
    const file = ts.createSourceFile('showcase.ts', `const config = ${source};`, ts.ScriptTarget.ES2022, true);
    const [statement] = file.statements;

    return (statement as ts.VariableStatement).declarationList.declarations[0].initializer!;
}

describe('describeShowcaseIssue', () => {
    const config = configOf(`{
    title: 'Frame',
    imports: [{ name: 'A', from: 'a' }, 'B'],
    variants: [
        { name: 'Plain' },
        { name: 'Both', content: 'x', template: '<input />' }
    ]
}`);

    it('names the component, the path and the text, and points at the property it is about', () => {
        expect(describeShowcaseIssue('FrameComponent', config, ['variants', 1, 'content'], 'set together with template')).toBe(
            'FrameComponent › variants[1] "Both" › content — set together with template (showcase.ts:6:25)'
        );
    });

    it('points at an element of a list', () => {
        expect(describeShowcaseIssue('FrameComponent', config, ['imports', 1], 'expected { name, from }')).toBe(
            'FrameComponent › imports[1] — expected { name, from } (showcase.ts:3:41)'
        );
    });

    it('points at the whole config when the literal does not have the node', () => {
        expect(describeShowcaseIssue('FrameComponent', config, ['host'], 'no host')).toBe('FrameComponent › host — no host (showcase.ts:1:16)');
        expect(describeShowcaseIssue('FrameComponent', config, ['variants', 5, 'content'], 'no variant')).toBe(
            'FrameComponent › variants[5] › content — no variant (showcase.ts:1:16)'
        );
    });

    it('points at the whole config when it is not a literal, as with a constant', () => {
        const file = ts.createSourceFile('showcase.ts', `const config = shared;`, ts.ScriptTarget.ES2022, true);
        const shared = (file.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;

        expect(describeShowcaseIssue('FrameComponent', shared, ['imports', 0], 'expected { name, from }')).toBe(
            'FrameComponent › imports[0] — expected { name, from } (showcase.ts:1:16)'
        );
    });
});
