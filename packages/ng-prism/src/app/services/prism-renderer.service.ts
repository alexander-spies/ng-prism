import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_ATTR } from '../../shared/composition.js';
import { activeCase } from '../renderer/composition.js';
import { PrismNavigationService } from './prism-navigation.service.js';

export interface ComputedVariantState {
    values: Record<string, unknown>;
    activeContent: string | Record<string, string> | undefined;
}

export function computeVariantState(
    comp: RuntimeComponent,
    index: number,
    options: { onUnknownInput?: (variantName: string, key: string) => void } = {}
): ComputedVariantState {
    const defaults: Record<string, unknown> = {};

    for (const input of comp.meta.inputs) {
        if (input.defaultValue !== undefined) {
            defaults[input.name] = input.defaultValue;
        }
    }

    const requiredInputNames = new Set(comp.meta.inputs.filter((i) => i.required).map((i) => i.name));

    const reset: Record<string, unknown> = {};

    for (const v of comp.meta.showcaseConfig.variants ?? []) {
        for (const key of Object.keys(v.inputs ?? {})) {
            if (!requiredInputNames.has(key) && !(key in reset)) {
                reset[key] = undefined;
            }
        }
    }

    const variant = comp.meta.showcaseConfig.variants?.[index];
    const variantInputs = variant?.inputs ?? {};
    const validInputNames = new Set(comp.meta.inputs.map((i) => i.name));

    for (const key of Object.keys(variantInputs)) {
        if (!validInputNames.has(key)) {
            options.onUnknownInput?.(variant?.name ?? String(index), key);
        }
    }
    const filteredVariantInputs = Object.fromEntries(Object.entries(variantInputs).filter(([key]) => validInputNames.has(key)));
    const values: Record<string, unknown> = {
        ...reset,
        ...defaults,
        ...filteredVariantInputs
    };

    const hostContent = directiveHostContent(comp, index);

    if (hostContent !== undefined) {
        values['__prismContent__'] = hostContent;
    }

    return {
        values,
        activeContent: projectedContent(comp, index)
    };
}

/**
 * The text `content` the `__PrismHost` of a directive renders through `__prismContent__`, `undefined` for a variant
 * without content, a component, or a composed variant, whose template holds the content and whose wrapper does not
 * declare `__prismContent__`.
 */
function directiveHostContent(comp: RuntimeComponent, index: number): string | undefined {
    const content = comp.meta.showcaseConfig.variants?.[index]?.content;

    if (!comp.meta.componentMeta.isDirective || !content || activeCase(comp, index)) return undefined;
    return typeof content === 'string' ? content : '';
}

/** The `content` the renderer projects into a component, `undefined` for a directive and for a composed variant. */
function projectedContent(comp: RuntimeComponent, index: number): string | Record<string, string> | undefined {
    if (comp.meta.componentMeta.isDirective || activeCase(comp, index)) return undefined;
    return comp.meta.showcaseConfig.variants?.[index]?.content;
}

function valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}

@Injectable({ providedIn: 'root' })
export class PrismRendererService {
    private readonly navigationService = inject(PrismNavigationService);

    readonly activeVariantIndex = signal(0);
    /**
     * Position in `ShowcaseConfig.states` of the component-level state on the
     * canvas, `null` for none. Part of the addressed cell next to the variant:
     * it survives a variant change and goes with the component.
     */
    readonly activeStateIndex = signal<number | null>(null);
    readonly inputValues = signal<Record<string, unknown>>({});
    readonly activeContent = signal<string | Record<string, string> | undefined>(undefined);
    readonly renderedElement = signal<Element | null>(null);
    /**
     * The element of the showcased component or directive in what the canvas
     * renders: in a composition the one the wrapper marks, else the rendered
     * element itself. `null` while nothing is rendered. Since 22.7.0.
     */
    readonly subjectElement = computed<Element | null>(() => {
        const root = this.renderedElement();

        if (!root) return null;
        const selector = `[${COMPOSITION_SUBJECT_ATTR}]`;

        return root.matches(selector) ? root : (root.querySelector(selector) ?? root);
    });

    readonly dirtyInputCount = computed<number>(() => {
        const comp = this.navigationService.activeComponent();

        if (!comp) return 0;
        const { values: expected } = computeVariantState(comp, this.activeVariantIndex());
        const current = this.inputValues();
        const keys = new Set<string>([...Object.keys(expected), ...Object.keys(current)]);
        let count = 0;

        for (const key of keys) {
            if (!valuesEqual(expected[key], current[key])) count++;
        }
        return count;
    });

    /** The component the variant, the state and the inputs belong to, `null` before the first. */
    private _lastClassName: string | null = null;

    constructor() {
        // The variant and the state go with the component in every view, so the reset on a switch follows
        // navigation, not the renderer: the shell mounts `<prism-renderer>` in the Playground only, and the Overview
        // keeps its view when the sidebar picks another component. A root effect, created before the URL service's,
        // so it runs first in the same flush and the URL never sees the previous component's cell on the new one.
        effect(() => {
            const comp = this.navigationService.activeComponent();

            if (comp) untracked(() => this.reconcileForComponent(comp));
        });
    }

    resetForComponent(comp: RuntimeComponent): void {
        this._lastClassName = comp.meta.className;
        this.activeVariantIndex.set(0);
        this.activeStateIndex.set(null);
        this.applyVariant(0, comp);
    }

    /**
     * Brings the variant, the state and the inputs in line with `comp`: a full
     * reset when it is another component than the last one, else the variant
     * and the state clamped to what it still declares and the inputs kept.
     * Runs on every navigation and again when the renderer mounts, which then
     * finds the component current and keeps what an Overview cell or a restore
     * selected.
     */
    reconcileForComponent(comp: RuntimeComponent): void {
        const prev = this._lastClassName;

        this._lastClassName = comp.meta.className;

        if (prev !== null && prev !== comp.meta.className) {
            this.activeVariantIndex.set(0);
            this.activeStateIndex.set(null);
            this.applyVariant(0, comp);
            return;
        }

        const stateIndex = this.activeStateIndex();

        if (stateIndex !== null && stateIndex >= (comp.meta.showcaseConfig.states?.length ?? 0)) this.activeStateIndex.set(null);

        const variants = comp.meta.showcaseConfig.variants ?? [];
        const maxIndex = Math.max(0, variants.length - 1);
        const preservedIndex = Math.min(this.activeVariantIndex(), maxIndex);

        this.activeVariantIndex.set(preservedIndex);

        const defaults: Record<string, unknown> = {};

        for (const input of comp.meta.inputs) {
            if (input.defaultValue !== undefined) {
                defaults[input.name] = input.defaultValue;
            }
        }

        const validKeys = new Set(comp.meta.inputs.map((i) => i.name));
        const currentValues = this.inputValues();
        const preserved: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(currentValues)) {
            if (validKeys.has(key) || key === '__prismContent__') {
                preserved[key] = value;
            }
        }

        const variant = variants[preservedIndex];
        const variantInputs = variant?.inputs ?? {};
        const merged: Record<string, unknown> = { ...defaults, ...variantInputs, ...preserved };
        const hostContent = directiveHostContent(comp, preservedIndex);

        if (hostContent !== undefined && preserved['__prismContent__'] === undefined) {
            merged['__prismContent__'] = hostContent;
        }

        this.inputValues.set(merged);
        this.activeContent.set(projectedContent(comp, preservedIndex));
    }

    selectVariant(index: number): void {
        this.activeVariantIndex.set(index);
        const comp = this.navigationService.activeComponent();

        if (comp) this.applyVariant(index, comp);
    }

    selectState(index: number | null): void {
        this.activeStateIndex.set(index);
    }

    updateInput(name: string, value: unknown): void {
        this.inputValues.update((prev) => ({ ...prev, [name]: value }));
    }

    resetInputsToVariantDefaults(): void {
        const comp = this.navigationService.activeComponent();

        if (!comp) return;
        this.applyVariant(this.activeVariantIndex(), comp);
    }

    private applyVariant(index: number, comp: RuntimeComponent): void {
        const { values, activeContent } = computeVariantState(comp, index, {
            onUnknownInput: (variantName, key) =>
                console.warn(`[ng-prism] Variant "${variantName}" references unknown input "${key}" on ${comp.meta.className}, ignoring.`)
        });

        this.inputValues.set(values);
        this.activeContent.set(activeContent);
    }
}
