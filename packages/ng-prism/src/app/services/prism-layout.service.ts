import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ng-prism-layout';

/** Bounds and default of the sidebar width, shared by the service, the resizer and the shell's CSS fallback. */
export const SIDEBAR_WIDTH = { min: 200, max: 360, default: 280 } as const;

/** Bounds and default of the addon panel height. */
export const PANEL_HEIGHT = { min: 200, max: 560, default: 300 } as const;

const clamp = (bounds: { min: number; max: number }, px: number) => Math.max(bounds.min, Math.min(bounds.max, px));

@Injectable({ providedIn: 'root' })
export class PrismLayoutService {
    readonly sidebarVisible = signal(true);
    readonly addonsVisible = signal(true);
    readonly toolbarVisible = signal(true);
    readonly addonsOrientation = signal<'bottom' | 'right'>('bottom');
    readonly sidebarWidth = signal<number>(SIDEBAR_WIDTH.default);
    readonly panelHeight = signal<number>(PANEL_HEIGHT.default);
    readonly panelWidth = signal(320);

    constructor() {
        this.loadFromStorage();
    }

    toggleSidebar(): void {
        this.sidebarVisible.update((v) => !v);
        this.saveToStorage();
    }

    toggleAddons(): void {
        this.addonsVisible.update((v) => !v);
        this.saveToStorage();
    }

    toggleToolbar(): void {
        this.toolbarVisible.update((v) => !v);
        this.saveToStorage();
    }

    toggleOrientation(): void {
        this.addonsOrientation.update((v) => (v === 'bottom' ? 'right' : 'bottom'));
        this.saveToStorage();
    }

    setSidebarWidth(px: number): void {
        this.sidebarWidth.set(clamp(SIDEBAR_WIDTH, px));
        this.saveToStorage();
    }

    setPanelHeight(px: number): void {
        this.panelHeight.set(clamp(PANEL_HEIGHT, px));
        this.saveToStorage();
    }

    setPanelWidth(px: number): void {
        this.panelWidth.set(Math.max(200, Math.min(600, px)));
        this.saveToStorage();
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) return;
            const d = JSON.parse(raw) as Record<string, unknown>;

            if (typeof d['sidebarVisible'] === 'boolean') this.sidebarVisible.set(d['sidebarVisible']);
            if (typeof d['addonsVisible'] === 'boolean') this.addonsVisible.set(d['addonsVisible']);
            if (typeof d['toolbarVisible'] === 'boolean') this.toolbarVisible.set(d['toolbarVisible']);
            if (d['addonsOrientation'] === 'bottom' || d['addonsOrientation'] === 'right') {
                this.addonsOrientation.set(d['addonsOrientation']);
            }
            if (typeof d['sidebarWidth'] === 'number') this.sidebarWidth.set(clamp(SIDEBAR_WIDTH, d['sidebarWidth']));
            if (typeof d['panelHeight'] === 'number') this.panelHeight.set(clamp(PANEL_HEIGHT, d['panelHeight']));
            if (typeof d['panelWidth'] === 'number') this.panelWidth.set(Math.max(200, Math.min(600, d['panelWidth'])));
        } catch {
            // Malformed JSON or no storage access: keep the field defaults.
        }
    }

    private saveToStorage(): void {
        const data = {
            sidebarVisible: this.sidebarVisible(),
            addonsVisible: this.addonsVisible(),
            toolbarVisible: this.toolbarVisible(),
            addonsOrientation: this.addonsOrientation(),
            sidebarWidth: this.sidebarWidth(),
            panelHeight: this.panelHeight(),
            panelWidth: this.panelWidth()
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Storage full or blocked: the layout still applies for this session.
        }
    }
}
