import { Component, input, model, OnInit, output } from '@angular/core';
import { Showcase } from './showcase.js';
import { type FixtureInternal, FixtureSize, type FixtureTab, type FixtureVariant } from './tab.model.js';

/**
 * Tabs for the fixture, see {@link FixtureTab}.
 *
 * @since 2.0.0
 * @version 2.1.0
 * @see FixtureTab
 */
@Showcase({ title: 'Tabs' })
@Component({ selector: 'fx-tabs', template: '' })
export class FixtureTabsComponent implements OnInit {
    variant = input<FixtureVariant>('filled');
    // eslint-disable-next-line @angular-eslint/no-input-rename -- an alias is what the API reaches a type by
    items = input.required<FixtureTab[]>({ alias: 'tabs' });
    size = input(FixtureSize.M);
    active = model<string>('');
    // The change event of an aliased model is named by the alias, not the member.
    expanded = model(false, { alias: 'open' });
    hidden = input<FixtureInternal | null>(null);
    selected = output<FixtureTab>();
    closed = output();

    /**
     * Moves focus to a tab.
     *
     * @param tab The tab to focus
     */
    focusTab(tab: FixtureTab): void {}

    reset(): void {}

    /** @internal */
    internalThing(): void {}

    /** Runs once. */
    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method -- a hook is left out of the methods, documented or not
    ngOnInit(): void {}
}
