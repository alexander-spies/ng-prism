import { stripShowcaseDecorators } from './showcase-strip.transformer.js';

describe('stripShowcaseDecorators', () => {
    describe('lowered call form', () => {
        it('should remove Showcase call and its import', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                "import { Component } from '@angular/core';",
                'class MyComponent {}',
                "Showcase({ title: 'Test', category: 'Demo' })(MyComponent);"
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('class MyComponent');
            expect(result).toContain('@angular/core');
        });
    });

    describe('__decorate form: Showcase only', () => {
        it('should remove entire __decorate statement when only Showcase remains', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class MyComponent {}',
                "MyComponent = __decorate([Showcase({ title: 'Test' })], MyComponent);"
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('__decorate');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('class MyComponent');
        });
    });

    describe('__decorate form: mixed decorators', () => {
        it('should remove only Showcase from __decorate array', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class MyComponent {}',
                "MyComponent = __decorate([Showcase({ title: 'Test' }), OtherDecorator()], MyComponent);"
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('__decorate');
            expect(result).toContain('OtherDecorator');
            expect(result).toContain('class MyComponent');
        });
    });

    describe('native decorator form', () => {
        it('should remove @Showcase but keep @Component', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                "import { Component } from '@angular/core';",
                "@Showcase({ title: 'Test' })",
                "@Component({ selector: 'my-comp' })",
                'class MyComponent {}'
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('@Component');
            expect(result).toContain('class MyComponent');
        });
    });

    describe('import cleanup: sole import', () => {
        it('should remove entire import statement when Showcase is the only specifier', () => {
            const input = ["import { Showcase } from '@ng-prism/core';", "Showcase({ title: 'Test' })(MyComponent);", 'class MyComponent {}'].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('import');
            expect(result).not.toContain('@ng-prism/core');
        });
    });

    describe('import cleanup: partial', () => {
        it('should remove only Showcase specifier when other imports remain', () => {
            const input = [
                "import { Showcase, defineConfig } from '@ng-prism/core';",
                "Showcase({ title: 'Test' })(MyComponent);",
                'class MyComponent {}',
                'const c = defineConfig({ plugins: [] });'
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).toContain('defineConfig');
            expect(result).toContain('@ng-prism/core');
        });
    });

    describe('aliased import', () => {
        it('should handle import { Showcase as S } and track local name', () => {
            const input = ["import { Showcase as S } from '@ng-prism/core';", "S({ title: 'Test' })(MyComponent);", 'class MyComponent {}'].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).not.toContain(' S(');
            expect(result).toContain('class MyComponent');
        });
    });

    describe('no-op: file without Showcase', () => {
        it('should return source unchanged when no Showcase import exists', () => {
            const input = ["import { Component } from '@angular/core';", "@Component({ selector: 'my-comp' })", 'class MyComponent {}'].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).toBe(input);
        });
    });

    describe('idempotency', () => {
        it('should produce identical output when run twice', () => {
            const input = ["import { Showcase } from '@ng-prism/core';", "Showcase({ title: 'Test' })(MyComponent);", 'class MyComponent {}'].join('\n');

            const first = stripShowcaseDecorators(input);
            const second = stripShowcaseDecorators(first);

            expect(second).toBe(first);
        });
    });

    describe('subpath import', () => {
        it('should recognize import from ng-prism subpath', () => {
            const input = ["import { Showcase } from '@ng-prism/core/decorator';", "Showcase({ title: 'Test' })(MyComponent);", 'class MyComponent {}'].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
        });
    });

    describe('service class with a lazy setup', () => {
        it('strips @Showcase with a lazy setup from a service class', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                "import { Injectable } from '@angular/core';",
                "import { provideToast } from './provide-toast.js';",
                "@Showcase({ title: 'Toast Service', setup: () => [provideToast] })",
                "@Injectable({ providedIn: 'root' })",
                'class ToastService {}'
            ].join('\n');

            const result = stripShowcaseDecorators(input, 'toast.service.ts');

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain("@Injectable({ providedIn: 'root' })");
            expect(result).toContain('class ToastService');
            // The setup function goes with the decorator; its import stays, as every other import does.
            expect(result).not.toContain('setup');
            expect(result).toContain("import { provideToast } from './provide-toast.js';");
        });

        it('strips the lowered form of the same service', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                "import { provideToast } from './provide-toast.js';",
                'class ToastService {}',
                "ToastService = __decorate([Showcase({ title: 'Toast Service', setup: () => [provideToast] }), Injectable({ providedIn: 'root' })], ToastService);"
            ].join('\n');

            const result = stripShowcaseDecorators(input, 'toast.service.js');

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('setup');
            expect(result).toContain('Injectable({ providedIn:');
        });
    });

    describe('audit: fail-loud on dangling references', () => {
        it('throws when a bare reference to Showcase remains after stripping', () => {
            const input = ["import { Showcase } from '@ng-prism/core';", 'class MyComponent {}', 'const meta = Showcase;'].join('\n');

            expect(() => stripShowcaseDecorators(input, 'icon.ts')).toThrow(/Showcase/);
            expect(() => stripShowcaseDecorators(input, 'icon.ts')).toThrow(/icon\.ts/);
        });

        it('throws when an unrecognized decorator emit form leaves Showcase referenced', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class IconComponent {}',
                "IconComponent = __esDecorate(null, [Showcase({ title: 'Icon' })], null, IconComponent);"
            ].join('\n');

            expect(() => stripShowcaseDecorators(input, 'icon.ts')).toThrow(/Showcase/);
        });

        it('includes line number in error message', () => {
            const input = ["import { Showcase } from '@ng-prism/core';", '', 'class MyComponent {}', 'const x = Showcase;'].join('\n');

            expect(() => stripShowcaseDecorators(input, 'test.ts')).toThrow(/test\.ts:\d+/);
        });

        it('detects leaks via aliased local name', () => {
            const input = ["import { Showcase as S } from '@ng-prism/core';", 'class MyComponent {}', 'const x = S;'].join('\n');

            expect(() => stripShowcaseDecorators(input)).toThrow(/S\b/);
        });

        it('does not throw on legitimate complete strips', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class MyComponent {}',
                "MyComponent = __decorate([Showcase({ title: 'Test' })], MyComponent);"
            ].join('\n');

            expect(() => stripShowcaseDecorators(input)).not.toThrow();
        });
    });

    describe('__decorate form: chained self-alias assignment', () => {
        it('should remove entire statement when only Showcase remains in chained assignment', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class IconComponent {}',
                "IconComponent = IconComponent_1 = __decorate([Showcase({ title: 'Icon', variants: [] })], IconComponent);",
                'var IconComponent_1;',
                'export { IconComponent };'
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('__decorate');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('class IconComponent');
        });

        it('should preserve chain when other decorators remain in chained assignment', () => {
            const input = [
                "import { Showcase } from '@ng-prism/core';",
                'class IconComponent {}',
                "IconComponent = IconComponent_1 = __decorate([Showcase({ title: 'Icon' }), OtherDecorator()], IconComponent);"
            ].join('\n');

            const result = stripShowcaseDecorators(input);

            expect(result).not.toContain('Showcase');
            expect(result).not.toContain('@ng-prism/core');
            expect(result).toContain('__decorate');
            expect(result).toContain('OtherDecorator');
            expect(result).toContain('IconComponent = IconComponent_1');
            expect(result).toContain('class IconComponent');
        });
    });
});
