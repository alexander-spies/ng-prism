import { TestBed } from '@angular/core/testing';
import type { ShowcaseState, Variant } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPseudoStateService, splitLayers } from './prism-pseudo-state.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

function makeComponent(variants: Variant[], className = 'ButtonComponent', states?: ShowcaseState[]): RuntimeComponent {
    return {
        type: class {} as unknown as RuntimeComponent['type'],
        meta: {
            className,
            filePath: '',
            showcaseConfig: { title: 'Button', variants, ...(states && { states }) },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'lib-button', standalone: true, isDirective: false }
        }
    };
}

const FOCUSED = { 'focus-visible': '.btn' } as const;
const HOVERED: ShowcaseState = { name: 'Hovered', pseudo: { hover: '.btn' } };

function setSearch(search: string): void {
    window.history.replaceState({}, '', `/${search}`);
}

function setUp() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [{ provide: PRISM_MANIFEST, useValue: { components: [], pages: [] } }]
    });
    const nav = TestBed.inject(PrismNavigationService);
    const renderer = TestBed.inject(PrismRendererService);
    const manifest = TestBed.inject(PrismManifestService);
    const service = TestBed.inject(PrismPseudoStateService);
    const activate = (comp: RuntimeComponent, index = 0) => {
        manifest.updateManifest({ components: [comp], pages: [] });
        nav.activeItem.set({ kind: 'component', data: comp });
        renderer.activeVariantIndex.set(index);
        TestBed.flushEffects();
    };

    return { service, renderer, activate };
}

describe('PrismPseudoStateService', () => {
    afterEach(() => {
        setSearch('');
        document.documentElement.removeAttribute('data-prism-capture');
        document.getElementById('ng-prism-capture-styles')?.remove();
    });

    it('reads the pseudo states of the active variant', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }, { name: 'Focused', pseudo: FOCUSED }]), 1);
        expect(service.declared()).toEqual(FOCUSED);
        expect(service.effective()).toBe(service.declared());
    });

    it('forces nothing for a variant without pseudo states', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }]));
        expect(service.effective()).toBeNull();
    });

    it('switches a state on for the whole component from the tools menu', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }]));
        service.toggle('hover');
        expect(service.effective()).toEqual({ hover: true });
        expect(service.isForced('hover')).toBe(true);
        expect(service.isDeclared('hover')).toBe(false);
    });

    it('switches a declared state off, and back on to the target the variant declares', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }]));
        service.toggle('focus-visible');
        expect(service.effective()).toBeNull();

        service.toggle('focus-visible');
        expect(service.override()).toEqual({});
        expect(service.effective()).toEqual(FOCUSED);
    });

    it('adds a toggled state to what the variant declares', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }]));
        service.toggle('hover');
        expect(service.effective()).toEqual({ hover: true, 'focus-visible': '.btn' });
    });

    it('drops the toggles when the variant changes', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'A' }, { name: 'B' }]));
        service.toggle('active');
        renderer.activeVariantIndex.set(1);
        TestBed.flushEffects();
        expect(service.override()).toEqual({});
        expect(service.effective()).toBeNull();
    });

    it('drops the toggles when the component changes', () => {
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'A' }]));
        service.toggle('active');
        activate(makeComponent([{ name: 'A' }], 'OtherComponent'));
        expect(service.override()).toEqual({});
    });

    it('ignores the toggles in capture mode, so session state never shapes a baseline', () => {
        setSearch('?capture=1');
        const { service, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }]));
        service.toggle('hover');
        expect(service.effective()).toBe(service.declared());
    });

    it('reads the active state', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [HOVERED]));
        expect(service.activeState()).toBeNull();
        expect(service.layers()).toEqual({ base: null, state: null });

        renderer.selectState(0);
        expect(service.activeState()).toBe(HOVERED);
        expect(service.layers().state).toBe(HOVERED.pseudo);
        expect(service.layers().base).toBeNull();
        expect(service.effective()).toBeNull();
    });

    it('keeps a state slot the scanner could not evaluate as an active state with an empty layer', () => {
        const { service, renderer, activate } = setUp();
        const unusable: ShowcaseState = { name: 'Broken', pseudo: {} };

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [unusable]));
        renderer.selectState(0);
        expect(service.activeState()).toBe(unusable);
        expect(service.layers().state).toBe(unusable.pseudo);
    });

    it('reports states: false for an opted-out variant', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }, { name: 'Alone', states: false, pseudo: FOCUSED }], 'ButtonComponent', [HOVERED]), 1);
        expect(service.stateExclusion()).toBeNull();

        renderer.selectState(0);
        expect(service.stateExclusion()).toBe('states: false');
        expect(service.activeState()).toBe(HOVERED);
        expect(service.layers()).toEqual({ base: FOCUSED, state: null });

        renderer.activeVariantIndex.set(0);
        expect(service.stateExclusion()).toBeNull();
        expect(service.layers().state).toBe(HOVERED.pseudo);
    });

    it("counts the active state's pseudo-classes as declared", () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }], 'ButtonComponent', [HOVERED]));
        expect(service.isDeclared('hover')).toBe(false);
        expect(service.isDeclared('focus-visible')).toBe(true);

        renderer.selectState(0);
        expect(service.isDeclared('hover')).toBe(true);
        expect(service.isDeclared('active')).toBe(false);
    });

    it('counts a state class as forced only while the state fits the canvas', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        expect(service.canvasFit()).toBeNull();
        expect(service.isForced('hover')).toBe(false);

        service.canvasFit.set({ fits: true });
        expect(service.isForced('hover')).toBe(true);

        service.canvasFit.set({ fits: false, reason: '.btn matches nothing' });
        expect(service.isForced('hover')).toBe(false);
    });

    it("stops counting the active state's pseudo-classes as declared while it does not fit", () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        service.canvasFit.set({ fits: false, reason: '.btn matches nothing' });
        expect(service.isDeclared('hover')).toBe(false);
        expect(service.isDeclared('focus-visible')).toBe(true);

        service.canvasFit.set({ fits: true });
        expect(service.isDeclared('hover')).toBe(true);
    });

    it('a toggle on a class only the unfitting active state declares forces it', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        TestBed.flushEffects();
        service.canvasFit.set({ fits: false, reason: '.btn matches nothing' });
        service.toggle('hover');
        expect(service.layers().base).toEqual({ hover: true });
        expect(service.layers().state).toEqual(HOVERED.pseudo);
        expect(service.isForced('hover')).toBe(true);

        service.toggle('hover');
        expect(service.override()).toEqual({});
        expect(service.isForced('hover')).toBe(false);
    });

    it('switches a state class off from the tools menu', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        TestBed.flushEffects();
        service.canvasFit.set({ fits: true });
        service.toggle('hover');
        expect(service.override()).toEqual({ hover: false });
        expect(service.isForced('hover')).toBe(false);
        expect(service.layers().state).toBeNull();

        service.toggle('hover');
        expect(service.override()).toEqual({});
        expect(service.layers().state).toBe(HOVERED.pseudo);
    });

    it('keeps the active state across a variant change', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'A' }, { name: 'B' }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        renderer.activeVariantIndex.set(1);
        TestBed.flushEffects();
        expect(service.activeState()).toBe(HOVERED);
    });

    it('resets the toggles when the active state changes', () => {
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Plain' }], 'ButtonComponent', [HOVERED, { name: 'Pressed', pseudo: { active: true } }]));
        service.toggle('focus');
        expect(service.override()).toEqual({ focus: true });

        renderer.selectState(0);
        TestBed.flushEffects();
        expect(service.override()).toEqual({});

        service.toggle('focus');
        renderer.selectState(1);
        TestBed.flushEffects();
        expect(service.override()).toEqual({});

        service.toggle('focus');
        renderer.selectState(null);
        TestBed.flushEffects();
        expect(service.override()).toEqual({});
    });

    it('applies the state layer in capture mode but ignores the toggles', () => {
        setSearch('?capture=1');
        const { service, renderer, activate } = setUp();

        activate(makeComponent([{ name: 'Focused', pseudo: FOCUSED }], 'ButtonComponent', [HOVERED]));
        renderer.selectState(0);
        TestBed.flushEffects();
        service.toggle('active');
        service.toggle('focus-visible');
        expect(service.override()).not.toEqual({});
        expect(service.layers().base).toBe(FOCUSED);
        expect(service.layers().state).toBe(HOVERED.pseudo);
        expect(service.effective()).toBe(FOCUSED);
    });

    it('gives each rendered component its own marker', () => {
        const { service } = setUp();

        expect(service.createMarker()).not.toBe(service.createMarker());
    });
});

describe('splitLayers', () => {
    it('returns the same objects while nothing is toggled', () => {
        // The renderer holds back `data-prism-rendered` until the marker reports
        // exactly the states objects it was given; a copy would never match.
        const layers = splitLayers(FOCUSED, HOVERED.pseudo, {});

        expect(layers.base).toBe(FOCUSED);
        expect(layers.state).toBe(HOVERED.pseudo);
        expect(splitLayers(null, null, {})).toEqual({ base: null, state: null });
    });

    it('returns null for the base once every variant state is switched off', () => {
        expect(splitLayers(FOCUSED, null, { 'focus-visible': false })).toEqual({ base: null, state: null });
    });

    it("toggling a state's pseudo-class off removes it from the state layer", () => {
        const pseudo = { hover: '.btn', active: true } as const;

        expect(splitLayers(null, pseudo, { hover: false })).toEqual({ base: null, state: { active: true } });
    });

    it('returns null for the state layer once every class of the state is toggled off', () => {
        // A deliberate toggle must not reach the marker as a state that forces nothing.
        expect(splitLayers(null, HOVERED.pseudo, { hover: false })).toEqual({ base: null, state: null });
        expect(splitLayers(null, { hover: '.a', active: true }, { hover: false, active: false })).toEqual({ base: null, state: null });
    });

    it('keeps a declared empty state as the same object while nothing is toggled', () => {
        // A slot the scanner could not evaluate: the marker has to see it, to report that it forces no state.
        const unusable = {};

        expect(splitLayers(null, unusable, {}).state).toBe(unusable);
    });

    it('keeps a declared empty state as an empty layer when an unrelated class is toggled', () => {
        expect(splitLayers(null, {}, { hover: true })).toEqual({ base: { hover: true }, state: {} });
    });

    it('switching a class off drops it from both layers', () => {
        const layers = splitLayers({ hover: '.a', focus: true }, { hover: '.b' }, { hover: false });

        expect(layers).toEqual({ base: { focus: true }, state: null });
    });

    it('toggling on a class the variant declares keeps the variant target', () => {
        expect(splitLayers(FOCUSED, null, { 'focus-visible': true })).toEqual({ base: FOCUSED, state: null });
    });

    it("toggling on a class the state declares keeps the state's target", () => {
        expect(splitLayers(null, HOVERED.pseudo, { hover: true })).toEqual({ base: null, state: HOVERED.pseudo });
    });

    it('toggling on a class an unfitting state declares forces it on the whole component in base', () => {
        expect(splitLayers(null, HOVERED.pseudo, { hover: true }, false)).toEqual({ base: { hover: true }, state: HOVERED.pseudo });
    });

    it('toggling on a class the variant declares keeps its target even when the state does not fit', () => {
        expect(splitLayers({ hover: '.a' }, HOVERED.pseudo, { hover: true }, false)).toEqual({ base: { hover: '.a' }, state: HOVERED.pseudo });
    });

    it('switching a class off drops it from both layers whether or not the state fits', () => {
        expect(splitLayers({ hover: '.a' }, HOVERED.pseudo, { hover: false }, false)).toEqual({ base: null, state: null });
    });

    it('toggling on an undeclared class forces it on the whole component in base', () => {
        expect(splitLayers(FOCUSED, HOVERED.pseudo, { active: true })).toEqual({
            base: { ...FOCUSED, active: true },
            state: HOVERED.pseudo
        });
        expect(splitLayers(null, null, { active: true })).toEqual({ base: { active: true }, state: null });
    });

    it('adds no state layer while no state is active', () => {
        expect(splitLayers(null, null, { hover: true, focus: false }).state).toBeNull();
    });
});
