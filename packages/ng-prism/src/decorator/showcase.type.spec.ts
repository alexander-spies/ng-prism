/**
 * Type-level smoke tests for the generic `@Showcase<T>` decorator and
 * `InputsOf<T>` helper. Most assertions are compile-time only. Jest just
 * confirms the file loads (which means it type-checked through SWC).
 */
import { InjectionToken, input, model, output } from '@angular/core';
import type { InputsOf } from './index.js';
import { Showcase } from './index.js';

class FixtureComponent {
    readonly variant = input<'primary' | 'secondary' | 'danger'>('primary');
    readonly label = input('Button');
    readonly disabled = input(false);
    readonly title = input.required<string>();
    readonly tabIndex = input<number | null>(null);
    readonly value = model<string>('');
    readonly clicked = output<void>();
    readonly valueChange = output<string>();
}

type FixtureInputs = InputsOf<FixtureComponent>;

type AssertExtends<A, B> = A extends B ? true : false;
type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// (a) Valid keys + values compile.
const okPrimary: AssertExtends<{ variant: 'primary' }, Partial<FixtureInputs>> = true;
const okLabel: AssertExtends<{ label: string }, Partial<FixtureInputs>> = true;
const okRequiredTitle: AssertExtends<{ title: string }, Partial<FixtureInputs>> = true;
const okModel: AssertExtends<{ value: string }, Partial<FixtureInputs>> = true;
const okNullableTabIndex: AssertExtends<{ tabIndex: null }, Partial<FixtureInputs>> = true;

void okPrimary;
void okLabel;
void okRequiredTitle;
void okModel;
void okNullableTabIndex;

// (b) Wrong values fail.
@Showcase<FixtureComponent>({
    title: 'Fixture',
    variants: [
        // @ts-expect-error: 'nope' is not assignable to 'primary' | 'secondary' | 'danger'
        { name: 'BadVariantValue', inputs: { variant: 'nope' } },
        // @ts-expect-error: label expects string, not number
        { name: 'BadLabelType', inputs: { label: 42 } },
        // @ts-expect-error: disabled expects boolean
        { name: 'BadDisabledType', inputs: { disabled: 'yes' } }
    ]
})
class BadValuesUsage {}
void BadValuesUsage;

// (c) Unknown keys fail.
@Showcase<FixtureComponent>({
    title: 'Fixture',
    variants: [
        // @ts-expect-error: 'unknownKey' is not a known input on FixtureComponent
        { name: 'UnknownKey', inputs: { unknownKey: 1 } }
    ]
})
class UnknownKeyUsage {}
void UnknownKeyUsage;

// (d) `output()` properties are NOT allowed in `inputs`.
@Showcase<FixtureComponent>({
    title: 'Fixture',
    variants: [
        // @ts-expect-error: 'clicked' is an output(), not an input
        { name: 'OutputAsInput', inputs: { clicked: () => undefined } },
        // @ts-expect-error: 'valueChange' is an output(), not an input
        { name: 'OutputAsInput2', inputs: { valueChange: 'foo' } }
    ]
})
class OutputUsage {}
void OutputUsage;

// (d2) `output()` properties are filtered out of `InputsOf<T>` entirely.
type OutputKeysAbsent = AssertEqual<Extract<keyof InputsOf<FixtureComponent>, 'clicked' | 'valueChange'>, never>;
const outputsFilteredOut: OutputKeysAbsent = true;

void outputsFilteredOut;

// (d3) The exact key set is the signal-input set.
type InputKeysEqual = AssertEqual<keyof InputsOf<FixtureComponent>, 'variant' | 'label' | 'disabled' | 'title' | 'tabIndex' | 'value'>;
const inputKeysMatch: InputKeysEqual = true;

void inputKeysMatch;

// (e) Calls without the generic type param still compile (backward compat):
// arbitrary keys and values are accepted, matching the pre-generic behaviour.
@Showcase({
    title: 'NoGeneric',
    variants: [
        {
            name: 'Anything',
            inputs: { anyKey: 1, other: 'string', nested: { x: 1 } }
        }
    ]
})
class NoGenericUsage {}
void NoGenericUsage;

const untypedInputs: Partial<InputsOf<unknown>> = {
    anyKey: 1,
    other: 'string',
    nested: { x: 1 }
};

void untypedInputs;

// (f) Component states: a list of { name, pseudo }, and `false` as the variant's opt-out.
@Showcase<FixtureComponent>({
    title: 'States',
    states: [{ name: 'Hover', pseudo: { hover: '.btn' } }],
    variants: [{ name: 'A', states: false }]
})
class StatesUsage {}
void StatesUsage;

@Showcase<FixtureComponent>({
    title: 'States',
    variants: [
        // @ts-expect-error: a variant can only opt out of states, with false
        { name: 'B', states: true }
    ]
})
class BadVariantStatesUsage {}
void BadVariantStatesUsage;

// (g) A service's `setup` is a lazy list of functions and tokens, never called by ng-prism.
const FIXTURE_TOKEN = new InjectionToken<string>('FIXTURE');

function provideFixture(): never[] {
    return [];
}

@Showcase({ title: 'S', setup: () => [provideFixture, FIXTURE_TOKEN] })
class SetupUsage {}
void SetupUsage;

@Showcase({
    title: 'S',
    // @ts-expect-error: setup is a function returning the list, not the list itself
    setup: [provideFixture]
})
class BadSetupUsage {}
void BadSetupUsage;

// (h) Compositions: a host template, a template and a host template per variant, and the imports they need.
@Showcase<FixtureComponent>({
    title: 'Composition',
    host: { template: '<lib-frame><lib-fixture /></lib-frame>' },
    imports: [{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' }],
    variants: [{ name: 'a', template: '<input libInput />', host: { template: '<lib-frame><lib-fixture /></lib-frame>' } }]
})
class CompositionUsage {}
void CompositionUsage;

@Showcase<FixtureComponent>({
    title: 'Composition',
    // @ts-expect-error: an import names the class and its module, both as strings
    imports: [{ name: 'CdkTextareaAutosize' }],
    variants: [
        // @ts-expect-error: a variant host is a { template }, not a host string
        { name: 'b', host: '<lib-frame>' },
        // @ts-expect-error: a variant template is a string
        { name: 'c', template: 42 }
    ]
})
class BadCompositionUsage {}
void BadCompositionUsage;

describe('@Showcase<T> typed variant inputs', () => {
    it('loads without runtime errors (all checks are compile-time)', () => {
        expect(true).toBe(true);
    });
});
