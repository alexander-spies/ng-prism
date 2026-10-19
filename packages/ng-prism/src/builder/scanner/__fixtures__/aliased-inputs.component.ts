/* eslint-disable @angular-eslint/no-input-rename, @angular-eslint/no-output-rename -- aliases are what this fixture is about */
import { Component, EventEmitter, Input, input, model, Output, output } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Aliased' })
@Component({
    selector: 'my-aliased',
    standalone: true,
    template: `<span>{{ size() }}</span>`
})
export class AliasedInputsComponent {
    readonly size = input('md', { alias: 'buttonSize' });
    readonly label = input.required<string>({ alias: 'text' });
    readonly count = model(0, { alias: 'value' });
    readonly plain = input(false);
    readonly sameName = input('', { alias: 'sameName' });
    @Input('legacyName') legacy = '';
    @Input({ alias: 'legacyObject' }) legacyObj = 0;
    readonly closed = output<void>({ alias: 'dismissed' });
    @Output('legacyChange') legacyEmitter = new EventEmitter<string>();
    readonly opened = output<void>();
}
