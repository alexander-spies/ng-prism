import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { buildInputBindings, PRISM_CONTENT_INPUT } from './input-bindings.js';

function makeComp(
    overrides: Partial<{
        inputs: RuntimeComponent['meta']['inputs'];
        isDirective: boolean;
    }> = {}
): RuntimeComponent {
    return {
        type: class {} as any,
        meta: {
            className: 'Comp',
            filePath: '/test.ts',
            showcaseConfig: { title: 'Test' },
            inputs: overrides.inputs ?? [],
            outputs: [],
            componentMeta: {
                selector: 'test',
                standalone: true,
                isDirective: overrides.isDirective ?? false
            }
        }
    };
}

describe('buildInputBindings', () => {
    it('maps every declared input of a component to the name setInput takes', () => {
        const comp = makeComp({
            inputs: [
                { name: 'label', type: 'string', required: false },
                { name: 'size', alias: 'buttonSize', type: 'string', required: false }
            ]
        });

        const bindings = buildInputBindings(comp);

        expect([...bindings]).toEqual([
            ['label', 'label'],
            ['size', 'buttonSize']
        ]);
    });

    it('keeps member names for a directive, whose generated host declares the inputs under them', () => {
        const comp = makeComp({
            isDirective: true,
            inputs: [{ name: 'tooltipText', alias: 'libTooltip', type: 'string', required: false }]
        });

        const bindings = buildInputBindings(comp);

        expect(bindings.get('tooltipText')).toBe('tooltipText');
        expect(bindings.get(PRISM_CONTENT_INPUT)).toBe(PRISM_CONTENT_INPUT);
    });

    it('does not add __prismContent__ for non-directive components', () => {
        const comp = makeComp({ isDirective: false });

        expect(buildInputBindings(comp).has(PRISM_CONTENT_INPUT)).toBe(false);
    });
});
