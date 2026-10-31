import { Component, Directive, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function makeDefault(): string {
    return 'computed';
}

@Showcase({
    title: 'Frame',
    imports: [{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' }, { name: 'Broken', from: 42 }, 'LibIcon', { name: '', from: '@angular/cdk/a11y' }],
    variants: [
        { name: 'Input', template: '<input libInput />' },
        { name: 'Framed', host: { template: '<lib-frame><lib-thing /></lib-frame>' } },
        { name: 'Both', content: 'Text', template: '<input libInput />' },
        { name: 'Bad host', host: '<lib-frame>' },
        { name: 'Bad template', content: 'Kept', template: 42 },
        { name: 'No template', host: { template: 42 } }
    ]
})
@Component({
    selector: 'lib-frame',
    standalone: true,
    template: '<ng-content />'
})
export class FrameComponent {
    readonly computedDefault = input(makeDefault());
    readonly plain = input<string>();
    readonly label = input('Label');
}

@Directive()
abstract class UnreadableBase {
    readonly size = input(makeDefault());
    readonly tone = input(makeDefault());
}

@Showcase({ title: 'Reinitialized' })
@Component({
    selector: 'lib-reinitialized',
    standalone: true,
    template: ''
})
export class ReinitializedComponent extends UnreadableBase {
    // Angular keeps the inherited input, but the component starts out with this value.
    override size = 'm';
}

function makeImport(): Record<string, unknown> {
    return { name: 'Made', from: 'lib' };
}

function makeVariant(): Record<string, unknown> {
    return { name: 'Made' };
}

// The evaluator drops the elements it cannot read, so the evaluated positions are not the source ones.
@Showcase({
    title: 'Gap',
    imports: [makeImport(), { name: 'Listed', from: 'lib' }, 5],
    variants: [makeVariant(), { name: 'After gap', content: 'Text', template: '<input libInput />' }]
})
@Component({
    selector: 'lib-gap',
    standalone: true,
    template: ''
})
export class GapComponent {}
