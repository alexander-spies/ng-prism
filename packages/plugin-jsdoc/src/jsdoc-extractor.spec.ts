import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractJsDocData } from './jsdoc-extractor.js';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/documented-button.ts');

describe('extractJsDocData', () => {
    it('should return null for a non-existent class name', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'NonExistentComponent');

        expect(result).toBeNull();
    });

    it('should extract the class description', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classDescription).toBe('Primary action button component.');
    });

    it('should extract @deprecated tag as string when message is present', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classTags.deprecated).toBe('Use PrimaryButtonComponent instead.');
    });

    it('should extract @since tag', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classTags.since).toBe('1.0.0');
    });

    it('should extract @version tag', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classTags.version).toBe('1.0.0');
    });

    it('should extract @see tag', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classTags.see).toEqual(['PrimaryButtonComponent']);
    });

    it('should extract @example tag', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.classTags.example).toBeDefined();
        expect(result?.classTags.example?.length).toBeGreaterThan(0);
    });

    it('should extract member tags for variant input', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.memberTags['variant']).toBeDefined();
        expect(result?.memberTags['variant'].deprecated).toBe('Prefer using semantic tokens');
        expect(result?.memberTags['variant'].since).toBe('1.1.0');
    });

    it('should not include member tags for members without JSDoc tags', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');

        expect(result?.memberTags['clicked']).toBeUndefined();
        expect(result?.memberTags['label']).toBeUndefined();
    });

    it('should return empty classTags for a class without tags', () => {
        const result = extractJsDocData(FIXTURE_PATH, 'UndocumentedButtonComponent');

        expect(result).not.toBeNull();
        expect(result?.classTags).toEqual({});
        expect(result?.classDescription).toBeUndefined();
        expect(result?.memberTags).toEqual({});
    });
});

describe('extractJsDocData with base classes', () => {
    const INPUT_PATH = path.join(__dirname, '__fixtures__/documented-input.ts');
    const baseClasses = [{ className: 'DocumentedField', filePath: path.join(__dirname, '__fixtures__/documented-field.ts') }];

    it('reads the tags of an inherited member from the base class', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.memberTags['placeholder']).toEqual({ deprecated: 'Use the label instead.', since: '2.0.0' });
    });

    it('lets a documented redeclaration win over the base class, tags or not', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.memberTags['label']).toBeUndefined();
    });

    // As TypeScript and the scanner do with the description.
    it('keeps the tags of the base class for a redeclaration without JSDoc of its own', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.memberTags['size']).toEqual({ since: '1.2.0' });
    });

    it('does not let a static member hide an inherited one', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.memberTags['tone']).toEqual({ since: '1.3.0' });
    });

    it('lists the documented public methods of the base class, overridden ones without JSDoc included', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.methods.map((method) => method.name)).toEqual(['focus', 'open']);
    });

    it('keeps the class description and tags of the class itself', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent', baseClasses);

        expect(result?.classDescription).toBe('Text input built on the shared field.');
    });

    it('reads the class alone without base classes', () => {
        const result = extractJsDocData(INPUT_PATH, 'DocumentedInputComponent');

        expect(result?.memberTags).toEqual({});
        expect(result?.methods).toEqual([]);
    });
});

describe('extractJsDocData with accessors', () => {
    it('reads the tags of a setter whose getter has none', () => {
        const result = extractJsDocData(path.join(__dirname, '__fixtures__/documented-field.ts'), 'AccessorField');

        expect(result?.memberTags['value']).toEqual({ since: '3.0.0' });
    });
});

describe('extractJsDocData across calls', () => {
    const source = (description: string) => `/** ${description} */\nexport class CachedComponent {}\n`;
    let dir: string;
    let file: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'jsdoc-extractor-'));
        file = path.join(dir, 'cached.component.ts');
    });

    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    // Set by hand on both writes: a time read back with stat and written again can lose its fraction of a millisecond.
    const written = new Date(2026, 0, 1);

    it('does not read a file again while its size and modification time stay the same', () => {
        writeFileSync(file, source('First text.'));
        utimesSync(file, written, written);

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('First text.');

        // Same length and the old modification time: only a new read could see the new text.
        writeFileSync(file, source('Other text.'));
        utimesSync(file, written, written);

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('First text.');
    });

    it('reads a file again once it has changed', () => {
        writeFileSync(file, source('First text.'));

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('First text.');

        writeFileSync(file, source('A longer second text.'));

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('A longer second text.');
    });

    it('reads a file again when only its modification time has changed', () => {
        writeFileSync(file, source('First text.'));
        utimesSync(file, written, written);

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('First text.');

        writeFileSync(file, source('Other text.'));
        const later = new Date(written.getTime() + 2000);

        utimesSync(file, later, later);

        expect(extractJsDocData(file, 'CachedComponent')?.classDescription).toBe('Other text.');
    });
});
