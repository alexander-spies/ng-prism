import ts from 'typescript';
import type { ScannedComponent } from '../../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT } from '../../../shared/composition.js';

const SLOT = COMPOSITION_SUBJECT_SLOT;

/** A component showcased with four variants that share three compositions, as the scan sets it for `frame.showcase.ts`. */
export const FRAME: ScannedComponent = {
    className: 'FormFieldComponent',
    filePath: 'src/lib/form-field/form-field.component.ts',
    showcaseConfig: {
        title: 'Form field',
        variants: [
            { name: 'Default', inputs: { label: 'E-Mail' }, template: '<input libInput type="email" />' },
            { name: 'With icon', inputs: { label: 'Search' }, template: '<lib-icon libPrefix /><input libInput />' },
            { name: 'Note', inputs: { label: 'Note' }, template: '<textarea libInput></textarea>' },
            { name: 'Again', inputs: { label: 'Again' }, template: '<input libInput type="email" />' }
        ]
    },
    inputs: [{ name: 'label', type: 'string', defaultValue: '', required: false }],
    outputs: [{ name: 'cleared' }],
    componentMeta: { selector: 'lib-form-field', standalone: true, isDirective: false },
    composition: {
        variantCases: [0, 1, 2, 0],
        cases: [
            {
                template: `<lib-form-field${SLOT}><input libInput type="email" /></lib-form-field>`,
                unbound: [],
                origin: 'variants[0] "Default", variants[3] "Again" (src/lib/form-field/form-field.showcase.ts:20:9)'
            },
            {
                template: `<lib-form-field${SLOT}><lib-icon libPrefix /><input libInput /></lib-form-field>`,
                unbound: [],
                origin: 'variants[1] "With icon" (src/lib/form-field/form-field.showcase.ts:21:9)'
            },
            {
                template: `<lib-form-field${SLOT}><textarea libInput></textarea></lib-form-field>`,
                unbound: [],
                origin: 'variants[2] "Note" (src/lib/form-field/form-field.showcase.ts:22:9)'
            }
        ],
        imports: [
            { name: 'InputDirective', from: 'my-lib' },
            { name: 'IconComponent', from: 'my-lib/icon' }
        ]
    }
};

/** The template literal of the first `template:` property in `code`, as the compiler reads it: the escapes resolved. `undefined` when there is none or it is not a plain literal. */
export function extractTemplate(code: string): string | undefined {
    let found: string | undefined;
    const visit = (node: ts.Node): void => {
        if (found !== undefined) return;
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'template' && ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
            found = node.initializer.text;
            return;
        }
        ts.forEachChild(node, visit);
    };

    visit(ts.createSourceFile('prism-manifest.ts', code, ts.ScriptTarget.ES2022, true));
    return found;
}

/** A value that stands for any import: callable, with every property the same, so that decorators and `input()` calls in the generated code run. */
function stub(): unknown {
    const value: unknown = new Proxy(() => undefined, { apply: () => value, get: () => value });

    return value;
}

/** The manifest module run with its imports stubbed: `PRISM_RUNTIME_MANIFEST`, as the styleguide reads it. */
export function evaluateManifest(code: string): {
    components: { type: unknown; composition?: unknown; meta: ScannedComponent; parts?: { meta: ScannedComponent }[] }[];
} {
    const { outputText } = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
    });
    const exports: Record<string, unknown> = {};

    new Function('exports', 'require', outputText)(exports, () => new Proxy({}, { get: () => stub() }));
    return exports['PRISM_RUNTIME_MANIFEST'] as ReturnType<typeof evaluateManifest>;
}

/** The `meta` of the `index`th component of the manifest in `code`. */
export function manifestMeta(code: string, index = 0): ScannedComponent {
    return evaluateManifest(code).components[index].meta;
}
