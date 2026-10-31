import { Component, Directive, EventEmitter, Input, Output } from '@angular/core';
import { Showcase } from './showcase.js';
import type { FixtureBadge, FixtureTab } from './tab.model.js';

/** A base class of decorator inputs, to read a type parameter through `@Input()`. */
@Directive()
export abstract class FixtureLegacyBase<T> {
    @Input() current?: T;
}

/**
 * The decorator form of inputs and outputs, which `input()` and `output()` replaced.
 * The types are written as `Array<T>`, which the checker prints as `T[]`: the API shows what the author wrote.
 */
@Showcase({ title: 'Legacy List' })
@Component({ selector: 'fx-legacy-list', template: '' })
export class FixtureLegacyListComponent extends FixtureLegacyBase<FixtureTab> {
    @Input() items: Array<FixtureTab> = [];
    @Output() picked = new EventEmitter<Array<FixtureTab>>();
    @Output() badgeChange: EventEmitter<Array<FixtureBadge>> = new EventEmitter();
}
