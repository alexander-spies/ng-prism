import ts from 'typescript';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { generateRuntimeManifest } from './runtime-manifest.generator.js';

const BUTTON: ScannedComponent = {
    className: 'ButtonComponent',
    filePath: 'src/lib/button/button.component.ts',
    showcaseConfig: {
        title: 'Button',
        category: 'Inputs',
        variants: [{ name: 'Primary', inputs: { variant: 'primary', label: 'Click me' } }]
    },
    inputs: [
        {
            name: 'variant',
            type: 'union',
            values: ['primary', 'secondary'],
            defaultValue: 'primary',
            required: false
        },
        { name: 'label', type: 'string', defaultValue: 'Button', required: false }
    ],
    outputs: [{ name: 'clicked', doc: 'Click event' }],
    componentMeta: {
        selector: 'my-button',
        standalone: true,
        isDirective: false
    }
};

const CARD: ScannedComponent = {
    className: 'CardComponent',
    filePath: 'src/lib/card/card.component.ts',
    showcaseConfig: { title: 'Card', category: 'Layout' },
    inputs: [{ name: 'title', type: 'string', defaultValue: '', required: false }],
    outputs: [],
    componentMeta: { selector: 'my-card', standalone: true, isDirective: false }
};

const HIGHLIGHT: ScannedComponent = {
    className: 'HighlightDirective',
    filePath: 'src/lib/highlight/highlight.directive.ts',
    showcaseConfig: {
        title: 'Highlight',
        category: 'Utility',
        host: '<span class="demo-text">',
        variants: [
            {
                name: 'Yellow',
                inputs: { highlightColor: 'yellow' },
                content: 'Hover me'
            }
        ]
    },
    inputs: [
        {
            name: 'highlightColor',
            type: 'string',
            defaultValue: 'yellow',
            required: false
        }
    ],
    outputs: [{ name: 'highlighted' }],
    componentMeta: {
        selector: '[appHighlight]',
        standalone: true,
        isDirective: true
    }
};

const TOOLTIP_WITH_HOST_COMPONENT: ScannedComponent = {
    className: 'TooltipDirective',
    filePath: 'src/lib/tooltip/tooltip.directive.ts',
    showcaseConfig: {
        title: 'Tooltip',
        host: {
            selector: 'my-button',
            import: { name: 'ButtonComponent', from: 'my-lib' },
            inputs: { label: 'Click me' }
        }
    },
    inputs: [{ name: 'tooltipText', type: 'string', required: false }],
    outputs: [],
    componentMeta: {
        selector: '[appTooltip]',
        standalone: true,
        isDirective: true
    }
};

const THEMED_DIRECTIVE: ScannedComponent = {
    className: 'ThemedDirective',
    filePath: 'src/lib/themed/themed.directive.ts',
    showcaseConfig: {
        title: 'Themed',
        host: '<div>'
    },
    inputs: [
        {
            name: 'theme',
            type: 'union',
            values: ['light', 'dark'],
            defaultValue: 'light',
            required: false
        },
        { name: 'size', type: 'number', defaultValue: 16, required: false },
        { name: 'label', type: 'string', required: true }
    ],
    outputs: [],
    componentMeta: {
        selector: '[appThemed]',
        standalone: true,
        isDirective: true
    }
};

describe('generateRuntimeManifest', () => {
    it('should generate the type import from @ng-prism/core/plugin', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain("import type { RuntimeManifest } from '@ng-prism/core/plugin';");
    });

    it('should generate named imports from the library', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON, CARD],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain("import { ButtonComponent, CardComponent } from 'my-lib';");
    });

    it('should export PRISM_RUNTIME_MANIFEST with RuntimeManifest type', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('export const PRISM_RUNTIME_MANIFEST: RuntimeManifest');
    });

    it('should reference the component class as type (not a string)', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('type: ButtonComponent,');
        expect(source).not.toContain('type: "ButtonComponent"');
    });

    it('should serialize meta with className, filePath, inputs, outputs, componentMeta', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('className: "ButtonComponent"');
        expect(source).toContain('filePath: "src/lib/button/button.component.ts"');
        expect(source).toContain('selector: "my-button"');
        expect(source).toContain('name: "variant"');
        expect(source).toContain('name: "clicked"');
    });

    it('quotes keys that are not identifiers, so that the manifest still parses', () => {
        const slotted: ScannedComponent = {
            ...CARD,
            showcaseConfig: {
                title: 'Card',
                variants: [{ name: 'Slots', content: { '[card-header]': '<h3>Title</h3>' }, inputs: { 'aria-label': 'Close' } }]
            }
        };
        const source = generateRuntimeManifest({ components: [slotted], libraryImportPath: 'my-lib' });
        const { diagnostics } = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ES2022 } });

        expect(diagnostics!.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
        expect(source).toContain('"[card-header]": "<h3>Title</h3>"');
        expect(source).toContain('"aria-label": "Close"');
        expect(source).toContain('name: "Slots"');
    });

    it('should handle empty components array', () => {
        const source = generateRuntimeManifest({
            components: [],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('components: [');
        expect(source).not.toContain('type:');
        expect(source).not.toContain('import {');
    });

    it('should include the auto-generated comment', () => {
        const source = generateRuntimeManifest({
            components: [],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('// AUTO-GENERATED by ng-prism');
    });

    it('should serialize manifest-level meta into the runtime export', () => {
        const source = generateRuntimeManifest({
            components: [],
            libraryImportPath: 'my-lib',
            meta: {
                coverage: {
                    total: { score: 87, found: true },
                    thresholds: { lines: 80 }
                }
            }
        });

        expect(source).toContain('meta:');
        expect(source).toContain('"coverage"');
        expect(source).toContain('"score": 87');
    });

    it('should omit meta when empty', () => {
        const source = generateRuntimeManifest({
            components: [],
            libraryImportPath: 'my-lib',
            meta: {}
        });

        expect(source).not.toContain('meta:');
    });

    it('should use the provided libraryImportPath for the import', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: '@my-org/components'
        });

        expect(source).toContain("from '@my-org/components'");
    });

    it('should generate grouped imports when components have different importPaths', () => {
        const pill: ScannedComponent = {
            ...BUTTON,
            className: 'PillComponent',
            importPath: 'sgui-lib/atoms/pill'
        };
        const tooltip: ScannedComponent = {
            ...CARD,
            className: 'TooltipComponent',
            importPath: 'sgui-lib/overlay/tooltip'
        };

        const source = generateRuntimeManifest({
            components: [pill, tooltip],
            libraryImportPath: 'sgui-lib'
        });

        expect(source).toContain("import { PillComponent } from 'sgui-lib/atoms/pill';");
        expect(source).toContain("import { TooltipComponent } from 'sgui-lib/overlay/tooltip';");
        expect(source).not.toContain("from 'sgui-lib';");
    });

    it('should group multiple components from the same importPath', () => {
        const pill: ScannedComponent = {
            ...BUTTON,
            className: 'PillComponent',
            importPath: 'sgui-lib/atoms/pill'
        };
        const pillModel: ScannedComponent = {
            ...CARD,
            className: 'PillModelComponent',
            importPath: 'sgui-lib/atoms/pill'
        };

        const source = generateRuntimeManifest({
            components: [pill, pillModel],
            libraryImportPath: 'sgui-lib'
        });

        expect(source).toContain("import { PillComponent, PillModelComponent } from 'sgui-lib/atoms/pill';");
    });

    it('should fall back to libraryImportPath when component has no importPath', () => {
        const withPath: ScannedComponent = {
            ...BUTTON,
            className: 'PillComponent',
            importPath: 'sgui-lib/atoms/pill'
        };
        const withoutPath: ScannedComponent = { ...CARD };

        const source = generateRuntimeManifest({
            components: [withPath, withoutPath],
            libraryImportPath: 'sgui-lib'
        });

        expect(source).toContain("import { PillComponent } from 'sgui-lib/atoms/pill';");
        expect(source).toContain("import { CardComponent } from 'sgui-lib';");
    });
});

describe('directive wrapper generation', () => {
    it('should generate a wrapper component class for directives with string host', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('class HighlightDirective__PrismHost');
        expect(source).toContain('@Component');
        expect(source).toContain('imports: [HighlightDirective]');
    });

    it('should generate template with host element and directive selector', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('appHighlight');
        expect(source).toContain('<span');
        expect(source).toContain('class="demo-text"');
    });

    it('should generate input bindings in the template for each directive input', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('[highlightColor]="highlightColor()"');
    });

    it('should generate output bindings in the template for each directive output', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('(highlighted)="highlighted.emit($event)"');
    });

    it('binds aliased directive inputs and outputs by their public names, keeping the wrapper members', () => {
        const aliased: ScannedComponent = {
            ...HIGHLIGHT,
            inputs: [{ name: 'highlightColor', alias: 'appHighlightColor', type: 'string', defaultValue: 'yellow', required: false }],
            outputs: [{ name: 'highlighted', alias: 'appHighlighted' }]
        };

        const source = generateRuntimeManifest({ components: [aliased], libraryImportPath: 'my-lib' });

        expect(source).toContain('[appHighlightColor]="highlightColor()"');
        expect(source).toContain('(appHighlighted)="highlighted.emit($event)"');
        expect(source).toContain('highlightColor = input(');
        expect(source).not.toContain('[highlightColor]=');
    });

    it('should generate signal input declarations on the wrapper class', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('highlightColor = input');
    });

    it('should generate __prismContent__ input on the wrapper class', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('__prismContent__ = input("")');
    });

    it('should reference the wrapper class as type in the manifest entry', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('type: HighlightDirective__PrismHost,');
        expect(source).not.toContain('type: HighlightDirective,');
    });

    it('should generate wrapper with Angular component import for object host', () => {
        const source = generateRuntimeManifest({
            components: [TOOLTIP_WITH_HOST_COMPONENT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('imports: [TooltipDirective, ButtonComponent]');
        expect(source).toContain("ButtonComponent } from 'my-lib';");
        expect(source).toContain('<my-button');
        expect(source).toContain('appTooltip');
        expect(source).toContain('label="Click me"');
    });

    it('should generate both components and directive wrappers in the same manifest', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON, HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('type: ButtonComponent,');
        expect(source).toContain('type: HighlightDirective__PrismHost,');
        expect(source).toContain('class HighlightDirective__PrismHost');
    });

    it('should import Component, input, output from @angular/core for wrapper classes', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain("import { Component, input, output } from '@angular/core';");
    });

    it('should not generate Angular imports when there are no directives', () => {
        const source = generateRuntimeManifest({
            components: [BUTTON],
            libraryImportPath: 'my-lib'
        });

        expect(source).not.toContain("from '@angular/core'");
    });

    it('should serialize isDirective in componentMeta', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('isDirective: true');
    });

    it('should serialize host in showcaseConfig', () => {
        const source = generateRuntimeManifest({
            components: [HIGHLIGHT],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('host:');
    });

    it('should generate typed input for union types', () => {
        const source = generateRuntimeManifest({
            components: [THEMED_DIRECTIVE],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain("theme = input<'light' | 'dark'>(\"light\")");
    });

    it('should generate input.required with type annotation for required inputs', () => {
        const source = generateRuntimeManifest({
            components: [THEMED_DIRECTIVE],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('label = input.required<string>()');
    });

    it('should keep simple types without explicit annotation', () => {
        const source = generateRuntimeManifest({
            components: [THEMED_DIRECTIVE],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('size = input(16)');
    });

    it('should generate type annotation for union inputs', () => {
        const directive: ScannedComponent = {
            ...HIGHLIGHT,
            inputs: [
                {
                    name: 'theme',
                    type: 'union',
                    values: ['light', 'dark'],
                    defaultValue: 'light',
                    required: false
                }
            ]
        };
        const source = generateRuntimeManifest({
            components: [directive],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain("theme = input<'light' | 'dark'>(\"light\")");
    });

    it('should not generate type annotation for simple string inputs', () => {
        const directive: ScannedComponent = {
            ...HIGHLIGHT,
            inputs: [
                {
                    name: 'label',
                    type: 'string',
                    defaultValue: 'Hello',
                    required: false
                }
            ]
        };
        const source = generateRuntimeManifest({
            components: [directive],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('label = input("Hello")');
        expect(source).not.toContain('input<');
    });

    it('should skip non-bindable inputs (object/unknown without default)', () => {
        const directive: ScannedComponent = {
            ...HIGHLIGHT,
            inputs: [
                {
                    name: 'highlightColor',
                    type: 'string',
                    defaultValue: 'yellow',
                    required: false
                },
                {
                    name: 'contentTemplate',
                    type: 'object',
                    rawType: 'TemplateRef<any>',
                    required: false
                },
                { name: 'config', type: 'unknown', required: false }
            ]
        };
        const source = generateRuntimeManifest({
            components: [directive],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('highlightColor = input');
        expect(source).not.toContain('contentTemplate = input');
        expect(source).not.toContain('[contentTemplate]');
        expect(source).not.toContain('config = input');
        expect(source).not.toContain('[config]');
    });

    it('should default __prismContent__ from host-string text content', () => {
        const directive: ScannedComponent = {
            ...HIGHLIGHT,
            showcaseConfig: {
                ...HIGHLIGHT.showcaseConfig,
                host: '<button class="demo">Hover me</button>'
            }
        };
        const source = generateRuntimeManifest({
            components: [directive],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('<button');
        expect(source).toContain('class="demo"');
        expect(source).toContain('__prismContent__ = input("Hover me")');
    });

    it('should include object inputs that have a default value', () => {
        const directive: ScannedComponent = {
            ...HIGHLIGHT,
            inputs: [
                {
                    name: 'offset',
                    type: 'object',
                    rawType: 'TooltipOffset',
                    defaultValue: { x: 0, y: 0 },
                    required: false
                }
            ]
        };
        const source = generateRuntimeManifest({
            components: [directive],
            libraryImportPath: 'my-lib'
        });

        expect(source).toContain('offset = input');
    });
});
