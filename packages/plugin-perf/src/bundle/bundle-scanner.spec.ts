import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { gzipSync } from 'zlib';
import { scanBundle } from './bundle-scanner.js';

describe('scanBundle', () => {
    const testDir = join(tmpdir(), 'ng-prism-perf-test-' + Date.now());

    beforeAll(() => {
        mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    function writeFixture(name: string, content: string): string {
        const path = join(testDir, name);

        writeFileSync(path, content, 'utf-8');
        return path;
    }

    it('should calculate source size in bytes', () => {
        const path = writeFixture('size.ts', 'export const x = 42;\n');
        const result = scanBundle(path);

        expect(result.sourceSize).toBe(Buffer.byteLength('export const x = 42;\n', 'utf-8'));
    });

    it('should calculate gzip estimate smaller than source', () => {
        const content = 'export const x = "hello world";\n'.repeat(50);
        const path = writeFixture('gzip.ts', content);
        const result = scanBundle(path);

        expect(result.gzipEstimate).toBeLessThan(result.sourceSize);
        expect(result.gzipEstimate).toBeGreaterThan(0);
    });

    it('should extract import declarations', () => {
        const path = writeFixture(
            'imports.ts',
            `
      import { Component } from '@angular/core';
      import { Observable } from 'rxjs';
      import { map } from 'rxjs/operators';

      export class Foo {}
    `
        );
        const result = scanBundle(path);

        expect(result.directImports).toBe(3);
        expect(result.importList).toEqual(['@angular/core', 'rxjs', 'rxjs/operators']);
    });

    it('should return treeDepth of 1 for files with no relative imports', () => {
        const path = writeFixture(
            'no-rel.ts',
            `
      import { Component } from '@angular/core';
      export class Bar {}
    `
        );
        const result = scanBundle(path);

        expect(result.treeDepth).toBe(1);
    });

    it('should follow relative imports for tree depth', () => {
        writeFixture('child.ts', `export const val = 1;\n`);
        const path = writeFixture(
            'parent.ts',
            `
      import { val } from './child.js';
      export const x = val;
    `
        );
        const result = scanBundle(path);

        expect(result.treeDepth).toBe(2);
    });

    it('should respect maxTreeDepth limit', () => {
        writeFixture('deep-c.ts', `export const c = 3;\n`);
        writeFixture('deep-b.ts', `import { c } from './deep-c.js';\nexport const b = c;\n`);
        const path = writeFixture('deep-a.ts', `import { b } from './deep-b.js';\nexport const a = b;\n`);
        const result = scanBundle(path, 2);

        expect(result.treeDepth).toBe(2);
    });

    it('should handle empty files', () => {
        const path = writeFixture('empty.ts', '');
        const result = scanBundle(path);

        expect(result.sourceSize).toBe(0);
        expect(result.directImports).toBe(0);
        expect(result.importList).toEqual([]);
    });

    it('should handle files with type imports', () => {
        const path = writeFixture(
            'type-imports.ts',
            `
      import type { Type } from '@angular/core';
      export type Foo = Type<unknown>;
    `
        );
        const result = scanBundle(path);

        expect(result.directImports).toBe(1);
        expect(result.importList).toContain('@angular/core');
    });

    describe('shipped source', () => {
        const documented = `import { Component, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';

// ─── Badge ─────────────────────────────────────────────────────

/**
 * A small status label.
 *
 * @example <x-badge label="New" />
 */
@Showcase({
    title: 'Badge',
    category: 'Feedback',
    description: 'A small status label next to a heading or in a table cell.',
    variants: [
        { name: 'Default', inputs: { label: 'New' } },
        { name: 'Success', inputs: { label: 'Done', tone: 'success' } },
        { name: 'Danger', inputs: { label: 'Failed', tone: 'danger' } },
        { name: 'Long label', inputs: { label: 'A label long enough to wrap in a narrow column' } }
    ]
})
@Component({
    selector: 'x-badge',
    template: '<span [class]="tone()">{{ label() }}</span>'
})
export class BadgeComponent {
    /** The text inside the badge. */
    readonly label = input('');

    /**
     * The colour of the badge.
     * Danger is for errors only.
     */
    readonly tone = input<'neutral' | 'success' | 'danger'>('neutral'); // neutral reads best on white
}
`;

        const bare = `import { Component, input } from '@angular/core';
@Component({
    selector: 'x-badge',
    template: '<span [class]="tone()">{{ label() }}</span>'
})
export class BadgeComponent {
    readonly label = input('');
    readonly tone = input<'neutral' | 'success' | 'danger'>('neutral');
}
`;

        it('should measure the source without @Showcase, JSDoc and comments', () => {
            const documentedResult = scanBundle(writeFixture('badge-documented.ts', documented));
            const bareResult = scanBundle(writeFixture('badge-bare.ts', bare));

            expect(documentedResult.sourceSize).toBe(bareResult.sourceSize);
            expect(documentedResult.gzipEstimate).toBe(bareResult.gzipEstimate);
            expect(documentedResult.stripped).toBe(true);
        });

        it('should keep the raw file size and its gzip estimate', () => {
            const result = scanBundle(writeFixture('badge-raw.ts', documented));

            expect(result.rawSourceSize).toBe(Buffer.byteLength(documented, 'utf-8'));
            expect(result.rawGzipEstimate).toBe(gzipSync(Buffer.from(documented)).length);
            expect(result.sourceSize).toBeLessThan(result.rawSourceSize!);
        });

        it('should drop the @ng-prism/core import that only served the showcase', () => {
            const result = scanBundle(writeFixture('badge-imports.ts', documented));

            expect(result.importList).toEqual(['@angular/core']);
            expect(result.directImports).toBe(1);
        });

        it('should only drop comments from a component without a showcase', () => {
            const commented = `import { Component } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';

/** A plain component. */
@Component({ selector: 'x-plain', template: '' })
export class PlainComponent {
    // the overlay service
    readonly overlay = Overlay;
}
`;
            const uncommented = `import { Component } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
@Component({ selector: 'x-plain', template: '' })
export class PlainComponent {
    readonly overlay = Overlay;
}
`;
            const result = scanBundle(writeFixture('plain-commented.ts', commented));

            expect(result.sourceSize).toBe(Buffer.byteLength(uncommented, 'utf-8'));
            expect(result.rawSourceSize).toBe(Buffer.byteLength(commented, 'utf-8'));
            expect(result.importList).toEqual(['@angular/core', '@angular/cdk/overlay']);
            expect(result.stripped).toBe(true);
        });

        it('should fall back to the raw file when stripping the showcase fails', () => {
            // Showcase is referenced outside a decorator, so the strip's leak check throws.
            const leaking = `import { Showcase } from '@ng-prism/core';

/** Kept by the fallback. */
export const decorate = Showcase;
`;
            const result = scanBundle(writeFixture('leaking.ts', leaking));

            expect(result.stripped).toBe(false);
            expect(result.sourceSize).toBe(Buffer.byteLength(leaking, 'utf-8'));
            expect(result.gzipEstimate).toBe(result.rawGzipEstimate);
            expect(result.importList).toEqual(['@ng-prism/core']);
        });
    });

    describe('template and styles', () => {
        it('should measure the files behind templateUrl, styleUrl and styleUrls', () => {
            writeFixture('card.component.html', '<article><ng-content /></article>\n');
            writeFixture('card.component.css', ':host { display: block; }\n');
            writeFixture('card.theme.scss', '$gap: 8px;\n.card { gap: $gap; }\n');
            writeFixture('card-header.component.css', 'header { font-weight: 600; }\n');
            const path = writeFixture(
                'card.component.ts',
                `import { Component } from '@angular/core';

@Component({
    selector: 'x-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.css', './card.theme.scss']
})
export class CardComponent {}

@Component({
    selector: 'x-card-header',
    template: '<header><ng-content /></header>',
    styleUrl: './card-header.component.css'
})
export class CardHeaderComponent {}
`
            );
            const result = scanBundle(path);

            expect(result.templateSize).toBe(Buffer.byteLength('<article><ng-content /></article>\n'));
            expect(result.styleSize).toBe(
                Buffer.byteLength(':host { display: block; }\n') +
                    Buffer.byteLength('$gap: 8px;\n.card { gap: $gap; }\n') +
                    Buffer.byteLength('header { font-weight: 600; }\n')
            );
        });

        it('should not add template and styles to the source size', () => {
            writeFixture('panel.component.html', '<section>' + 'x'.repeat(4000) + '</section>\n');
            const source = `import { Component } from '@angular/core';
@Component({ selector: 'x-panel', templateUrl: './panel.component.html' })
export class PanelComponent {
}
`;
            const result = scanBundle(writeFixture('panel.component.ts', source));

            expect(result.sourceSize).toBe(Buffer.byteLength(source, 'utf-8'));
        });

        it('should report zero for inline templates and styles', () => {
            const path = writeFixture(
                'inline.component.ts',
                `import { Component } from '@angular/core';
@Component({ selector: 'x-inline', template: '<b>hi</b>', styles: [':host { color: red; }'] })
export class InlineComponent {}
`
            );
            const result = scanBundle(path);

            expect(result.templateSize).toBe(0);
            expect(result.styleSize).toBe(0);
        });

        it('should count a missing file as zero', () => {
            const path = writeFixture(
                'missing.component.ts',
                `import { Component } from '@angular/core';
@Component({ selector: 'x-missing', templateUrl: './nowhere.html', styleUrl: './nowhere.css' })
export class MissingComponent {}
`
            );
            const result = scanBundle(path);

            expect(result.templateSize).toBe(0);
            expect(result.styleSize).toBe(0);
        });

        it('should ignore templateUrl outside a @Component decorator', () => {
            writeFixture('other.html', '<p>not a template</p>\n');
            const path = writeFixture('config.ts', `export const config = { templateUrl: './other.html' };\n`);
            const result = scanBundle(path);

            expect(result.templateSize).toBe(0);
        });
    });
});
