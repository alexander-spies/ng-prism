import { TestBed } from '@angular/core/testing';
import type { Variant } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPseudoStateService, withOverride } from './prism-pseudo-state.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

function makeComponent(variants: Variant[], className = 'ButtonComponent'): RuntimeComponent {
    return {
        type: class {} as unknown as RuntimeComponent['type'],
        meta: {
            className,
            filePath: '',
            showcaseConfig: { title: 'Button', variants },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'lib-button', standalone: true, isDirective: false }
        }
    };
}

const FOCUSED = { 'focus-visible': '.btn' } as const;

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

    it('gives each rendered component its own marker', () => {
        const { service } = setUp();

        expect(service.createMarker()).not.toBe(service.createMarker());
    });
});

describe('withOverride', () => {
    it('returns the declared object itself while nothing is toggled', () => {
        // The renderer holds back `data-prism-rendered` until the marker reports
        // exactly the states object it was given; a copy would never match.
        expect(withOverride(FOCUSED, {})).toBe(FOCUSED);
        expect(withOverride(null, {})).toBeNull();
    });

    it('returns null once every state is switched off', () => {
        expect(withOverride(FOCUSED, { 'focus-visible': false })).toBeNull();
    });

    it('keeps the declared target of a state switched on that the variant already forces', () => {
        expect(withOverride(FOCUSED, { 'focus-visible': true })).toEqual(FOCUSED);
    });
});
