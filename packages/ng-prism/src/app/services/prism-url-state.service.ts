import { effect, inject, Injectable, Injector } from '@angular/core';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

const PARAM_COMPONENT = 'component';
const PARAM_SERVICE = 'service';
const PARAM_PIPE = 'pipe';
const PARAM_PAGE = 'page';
const PARAM_VARIANT = 'variant';
const PARAM_STATE = 'state';
const PARAM_VIEW = 'view';
const DEFAULT_VIEW = 'renderer';
const PARAM_PANEL = 'panel';
const DEFAULT_PANEL = 'controls';

/** The index a `variant` parameter addresses in a list of `count` variants, `0` for anything that is not one. */
function parseVariantIndex(param: string | null, count: number): number {
    if (param === null) return 0;
    const index = parseInt(param, 10);

    return !Number.isNaN(index) && index >= 0 && index < count ? index : 0;
}

/** The index a `state` parameter addresses in a list of `count` states, `null` for anything that is not one. */
function parseStateIndex(param: string | null, count: number): number | null {
    if (param === null || !/^\d+$/.test(param)) return null;
    const index = Number(param);

    return index < count ? index : null;
}

/**
 * What a URL addresses, `null` for nothing. The same precedence as the restore,
 * prefixed per kind so a component, a service and a pipe of one name still differ.
 */
function navKey(params: URLSearchParams): string | null {
    const component = params.get(PARAM_COMPONENT);
    const service = params.get(PARAM_SERVICE);
    const pipe = params.get(PARAM_PIPE);
    const page = params.get(PARAM_PAGE);

    if (component !== null) return `${PARAM_COMPONENT}:${component}`;
    if (service !== null) return `${PARAM_SERVICE}:${service}`;
    if (pipe !== null) return `${PARAM_PIPE}:${pipe}`;
    if (page !== null) return `${PARAM_PAGE}:${page}`;
    return null;
}

@Injectable({ providedIn: 'root' })
export class PrismUrlStateService {
    private readonly manifestService = inject(PrismManifestService);
    private readonly navigationService = inject(PrismNavigationService);
    private readonly rendererService = inject(PrismRendererService);
    private readonly panelService = inject(PrismPanelService);
    private readonly config = inject(PRISM_CONFIG);
    private readonly injector = inject(Injector);

    private suppressSync = false;

    init(): void {
        if (this.config.urlState === false) return;

        this.restoreFromUrl();

        effect(
            () => {
                const item = this.navigationService.activeItem();
                const variantIndex = this.rendererService.activeVariantIndex();
                const stateIndex = this.rendererService.activeStateIndex();
                const viewId = this.panelService.activeViewId();
                const panelId = this.panelService.activePanelId();

                if (this.suppressSync) return;
                this.writeToUrl(item, variantIndex, stateIndex, viewId, panelId);
            },
            { injector: this.injector }
        );

        window.addEventListener('popstate', () => this.restoreFromUrl());
    }

    private restoreFromUrl(): void {
        const params = new URLSearchParams(window.location.search);
        const componentClassName = params.get(PARAM_COMPONENT);
        const serviceClassName = params.get(PARAM_SERVICE);
        const pipeClassName = params.get(PARAM_PIPE);
        const pageTitle = params.get(PARAM_PAGE);
        const variantParam = params.get(PARAM_VARIANT);
        const stateParam = params.get(PARAM_STATE);
        const viewId = params.get(PARAM_VIEW);
        const panelId = params.get(PARAM_PANEL);

        let stateIndex: number | null = null;

        this.suppressSync = true;
        try {
            if (componentClassName) {
                const comp = this.manifestService.components().find((c) => c.meta.className === componentClassName);

                if (comp) {
                    const previousClassName = this.navigationService.activeComponent()?.meta.className;

                    this.navigationService.select(comp);
                    // Switching to another component resets the variant and the state
                    // once `PrismRendererService` follows the navigation, after this
                    // restore. Starting the component here makes it the current one
                    // before the indexes below are set, so that reset, and the renderer
                    // mounting it, keep them (a popstate between components). Not for
                    // the component already on screen: a popstate that addresses it (a
                    // hash link inside it fires one) must keep the control overrides.
                    if (previousClassName !== comp.meta.className) {
                        this.rendererService.resetForComponent(comp);
                    }

                    const variantIndex = parseVariantIndex(variantParam, comp.meta.showcaseConfig.variants?.length ?? 1);

                    if (variantIndex !== this.rendererService.activeVariantIndex()) {
                        this.rendererService.selectVariant(variantIndex);
                    }
                    stateIndex = parseStateIndex(stateParam, comp.meta.showcaseConfig.states?.length ?? 0);
                }
            } else if (serviceClassName) {
                const service = this.manifestService.services().find((s) => s.meta.className === serviceClassName);

                if (service) {
                    this.navigationService.selectService(service);
                }
            } else if (pipeClassName) {
                const pipe = this.manifestService.pipes().find((p) => p.meta.className === pipeClassName);

                if (pipe) {
                    this.navigationService.selectPipe(pipe);
                }
            } else if (pageTitle) {
                const page = this.manifestService.pages().find((p) => p.title === pageTitle);

                if (page) {
                    this.navigationService.selectPage(page);
                }
            }

            // After the variant, which clears the state: a screenshot runner addresses each cell this way.
            this.rendererService.selectState(stateIndex);

            if (viewId) {
                this.panelService.activeViewId.set(viewId);
            }
            if (panelId) {
                this.panelService.activePanelId.set(panelId);
            }
        } finally {
            this.suppressSync = false;
        }
    }

    private writeToUrl(item: NavigationItem | null, variantIndex: number, stateIndex: number | null, viewId: string, panelId: string): void {
        // Built from scratch, never from the current search string: parameters the
        // app does not own must not survive a navigation. `?capture=1` relies on
        // this; the "capture flag" specs pin the guarantee.
        const params = new URLSearchParams();

        if (item?.kind === 'component') {
            params.set(PARAM_COMPONENT, item.data.meta.className);
            if (variantIndex > 0) {
                params.set(PARAM_VARIANT, String(variantIndex));
            }
            if (stateIndex !== null) {
                params.set(PARAM_STATE, String(stateIndex));
            }
        } else if (item?.kind === 'service') {
            params.set(PARAM_SERVICE, item.data.meta.className);
        } else if (item?.kind === 'pipe') {
            params.set(PARAM_PIPE, item.data.meta.className);
        } else if (item?.kind === 'page') {
            params.set(PARAM_PAGE, item.data.title);
        }

        if (viewId && viewId !== DEFAULT_VIEW) {
            params.set(PARAM_VIEW, viewId);
        }
        if (panelId && panelId !== DEFAULT_PANEL) {
            params.set(PARAM_PANEL, panelId);
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

        if (newUrl === window.location.pathname + window.location.search) return;

        if (navKey(new URLSearchParams(window.location.search)) !== navKey(params)) {
            window.history.pushState(null, '', newUrl);
        } else {
            window.history.replaceState(null, '', newUrl);
        }
    }
}
