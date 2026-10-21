import ts from 'typescript';
import { isDocumented, isInternal, readDescription, readDocTags, readParamDescriptions } from './doc-tags.js';

/** The class `Subject` of a source text, parsed with parent nodes so that JSDoc resolves. */
function parseClass(source: string): ts.ClassDeclaration {
    const sourceFile = ts.createSourceFile('subject.ts', source, ts.ScriptTarget.ES2022, true);
    const decl = sourceFile.statements.find(ts.isClassDeclaration);

    if (!decl) throw new Error('no class in the source');
    return decl;
}

describe('doc tags', () => {
    describe('readDocTags', () => {
        it('reads @default as written', () => {
            const decl = parseClass(`/** @default 'bottom-right' */ class Subject {}`);

            expect(readDocTags(decl).default).toBe("'bottom-right'");
        });

        it('reads @since', () => {
            const decl = parseClass(`/** @since 1.2.0 */ class Subject {}`);

            expect(readDocTags(decl).since).toBe('1.2.0');
        });

        it('collects every @example', () => {
            const decl = parseClass(['/**', ' * @example one()', ' * @example two()', ' */', 'class Subject {}'].join('\n'));

            expect(readDocTags(decl).example).toEqual(['one()', 'two()']);
        });

        it('keeps the fence and the line breaks of an @example', () => {
            const decl = parseClass(['/**', ' * @example', ' * ```typescript', ' * const x = 1;', ' * ```', ' */', 'class Subject {}'].join('\n'));

            expect(readDocTags(decl).example).toEqual(['```typescript\nconst x = 1;\n```']);
        });

        it('reads @deprecated with and without a reason', () => {
            expect(readDocTags(parseClass(`/** @deprecated Use other(). */ class Subject {}`)).deprecated).toBe('Use other().');
            expect(readDocTags(parseClass(`/** @deprecated */ class Subject {}`)).deprecated).toBe(true);
        });

        it('collects @see references, by name or as written', () => {
            const decl = parseClass(['/**', ' * @see ToastRef', ' * @see https://example.com/toast', ' */', 'class Subject {}'].join('\n'));

            expect(readDocTags(decl).see).toEqual(['ToastRef', 'https://example.com/toast']);
        });

        it('reads a {@link} in @see as its target', () => {
            const decl = parseClass(['/**', ' * @see {@link ToastRef.dismiss}', ' * @see {@link https://example.com/toast Docs}', ' */', 'class Subject {}'].join('\n'));

            expect(readDocTags(decl).see).toEqual(['ToastRef.dismiss', 'https://example.com/toast']);
        });

        it('returns no keys for a node without tags', () => {
            expect(readDocTags(parseClass(`/** Just a description. */ class Subject {}`))).toEqual({});
            expect(readDocTags(parseClass(`class Subject {}`))).toEqual({});
        });

        it('ignores a comment that is not directly above the node', () => {
            const decl = parseClass(['/** @since 9.9.9 */', '', '', 'class Subject {}'].join('\n'));

            expect(readDocTags(decl)).toEqual({});
        });
    });

    describe('isInternal', () => {
        it('is true for @internal', () => {
            expect(isInternal(parseClass(`/** @internal */ class Subject {}`))).toBe(true);
        });

        it('is false without it', () => {
            expect(isInternal(parseClass(`/** Public. */ class Subject {}`))).toBe(false);
            expect(isInternal(parseClass(`class Subject {}`))).toBe(false);
        });
    });

    describe('readParamDescriptions', () => {
        it('reads @param with and without the TSDoc dash', () => {
            const decl = parseClass(
                [
                    'class Subject {',
                    '  /**',
                    '   * @param first - With a dash.',
                    '   * @param second Without.',
                    '   */',
                    '  run(first: string, second: string) {}',
                    '}'
                ].join('\n')
            );
            const method = decl.members[0];

            expect([...readParamDescriptions(method)]).toEqual([
                ['first', 'With a dash.'],
                ['second', 'Without.']
            ]);
        });
    });

    describe('isDocumented', () => {
        it('is true for a block of tags only, false for none or for a ruler', () => {
            expect(isDocumented(parseClass(`/** @since 1.0.0 */ class Subject {}`))).toBe(true);
            expect(isDocumented(parseClass(`class Subject {}`))).toBe(false);
            expect(isDocumented(parseClass(`/** ======== */ class Subject {}`))).toBe(false);
        });
    });

    describe('readDescription', () => {
        it('keeps the markdown of the comment', () => {
            const decl = parseClass(['/**', ' * Shows messages.', ' *', ' * - first', ' * - second', ' *', ' * @since 1.0.0', ' */', 'class Subject {}'].join('\n'));

            expect(readDescription(decl)).toBe('Shows messages.\n\n- first\n- second');
        });

        it('is undefined without a comment text', () => {
            expect(readDescription(parseClass(`/** @since 1.0.0 */ class Subject {}`))).toBeUndefined();
            expect(readDescription(parseClass(`class Subject {}`))).toBeUndefined();
        });

        it('takes the last block of several', () => {
            const decl = parseClass(['/** First. */', '/** Second. */', 'class Subject {}'].join('\n'));

            expect(readDescription(decl)).toBe('Second.');
        });

        it('ignores a decorative comment', () => {
            expect(readDescription(parseClass(`/** ======== */ class Subject {}`))).toBeUndefined();
        });

        it('keeps a {@link} in the text', () => {
            expect(readDescription(parseClass(`/** See {@link ToastRef} for more. */ class Subject {}`))).toBe('See {@link ToastRef} for more.');
        });
    });
});
