import type { InputMeta, OutputMeta } from '../plugin/plugin.types.js';
import { modelChangeOutput, publicOutputNames } from './model-outputs.js';

function input(name: string, extra: Partial<InputMeta> = {}): InputMeta {
    return { name, type: 'string', required: false, ...extra };
}

function output(name: string, extra: Partial<OutputMeta> = {}): OutputMeta {
    return { name, ...extra };
}

describe('modelChangeOutput', () => {
    it('appends Change to the name a template binds', () => {
        expect(modelChangeOutput('value')).toBe('valueChange');
    });
});

describe('publicOutputNames', () => {
    it('lists the outputs by alias or name, then a change output per model input', () => {
        const names = publicOutputNames({
            inputs: [input('value', { model: true }), input('label'), input('checked', { alias: 'on', model: true })],
            outputs: [output('opened'), output('closed', { alias: 'dismissed' })]
        });

        expect(names).toEqual(['opened', 'dismissed', 'valueChange', 'onChange']);
    });

    it('is empty for a component without outputs and model inputs', () => {
        expect(publicOutputNames({ inputs: [input('label')], outputs: [] })).toEqual([]);
    });
});
