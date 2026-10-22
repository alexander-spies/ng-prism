import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';

const R = 20;

@Component({
    selector: 'prism-canvas-rulers',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The gutter width reaches the stylesheet as a custom property instead of
    // being written there a second time. R sizes the ruler canvases in paintH and
    // paintV, so a literal in the CSS would be a copy that has to be kept in step.
    host: { '[style.--prism-ruler-size]': 'rulerSize' },
    templateUrl: './prism-canvas-rulers.component.html',
    styleUrl: './prism-canvas-rulers.component.css'
})
export class PrismCanvasRulersComponent {
    protected readonly rulerSize = `${R}px`;

    protected readonly canvas = inject(PrismCanvasService);
    private readonly themeService = inject(PrismThemeService);

    private readonly rulerTop = viewChild<ElementRef<HTMLCanvasElement>>('rulerTop');
    private readonly rulerLeft = viewChild<ElementRef<HTMLCanvasElement>>('rulerLeft');

    private ro: ResizeObserver | null = null;

    constructor() {
        effect(() => {
            const show = this.canvas.rulers();
            const zoom = this.canvas.zoom();

            this.themeService.theme();

            if (!show) {
                this.ro?.disconnect();
                this.ro = null;
                return;
            }

            requestAnimationFrame(() => {
                this.paint(zoom);
                this.observeResize();
            });
        });
    }

    private observeResize(): void {
        if (this.ro) return;
        const wrap = this.rulerTop()?.nativeElement?.parentElement;

        if (!wrap) return;
        this.ro = new ResizeObserver(() => this.paint(this.canvas.zoom()));
        this.ro.observe(wrap);
    }

    private paint(zoom: number): void {
        this.paintH(zoom);
        this.paintV(zoom);
    }

    private paintH(zoom: number): void {
        const el = this.rulerTop()?.nativeElement;

        if (!el) return;

        const wrap = el.parentElement!;
        const w = wrap.clientWidth - R;
        const h = R;

        if (w <= 0) return;

        const dpr = devicePixelRatio;

        el.width = w * dpr;
        el.height = h * dpr;
        el.style.width = w + 'px';
        el.style.height = h + 'px';

        const ctx = el.getContext('2d')!;

        ctx.scale(dpr, dpr);

        const cs = getComputedStyle(document.documentElement);
        const bg = cs.getPropertyValue('--prism-bg').trim() || '#080d19';
        const fg = cs.getPropertyValue('--prism-text-muted').trim() || '#94a3b8';
        const border = cs.getPropertyValue('--prism-border').trim() || 'rgba(255,255,255,0.08)';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h - 0.5);
        ctx.lineTo(w, h - 0.5);
        ctx.stroke();

        const step = stepFor(zoom);
        const pxStep = step * zoom;

        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.lineWidth = 0.5;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        let logical = 0;

        for (let x = 0; x < w; x += pxStep, logical += step) {
            const xr = Math.round(x) + 0.5;
            const major = logical % (step * 5) === 0;

            ctx.beginPath();
            ctx.moveTo(xr, h);
            ctx.lineTo(xr, h - (major ? 12 : 6));
            ctx.stroke();

            if (major) {
                ctx.fillText(String(logical), xr + 2, 2);
            }
        }
    }

    private paintV(zoom: number): void {
        const el = this.rulerLeft()?.nativeElement;

        if (!el) return;

        const wrap = el.parentElement!;
        const w = R;
        const h = wrap.clientHeight - R;

        if (h <= 0) return;

        const dpr = devicePixelRatio;

        el.width = w * dpr;
        el.height = h * dpr;
        el.style.width = w + 'px';
        el.style.height = h + 'px';

        const ctx = el.getContext('2d')!;

        ctx.scale(dpr, dpr);

        const cs = getComputedStyle(document.documentElement);
        const bg = cs.getPropertyValue('--prism-bg').trim() || '#080d19';
        const fg = cs.getPropertyValue('--prism-text-muted').trim() || '#94a3b8';
        const border = cs.getPropertyValue('--prism-border').trim() || 'rgba(255,255,255,0.08)';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w - 0.5, 0);
        ctx.lineTo(w - 0.5, h);
        ctx.stroke();

        const step = stepFor(zoom);
        const pxStep = step * zoom;

        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.lineWidth = 0.5;
        ctx.font = '9px monospace';

        let logical = 0;

        for (let y = 0; y < h; y += pxStep, logical += step) {
            const yr = Math.round(y) + 0.5;
            const major = logical % (step * 5) === 0;

            ctx.beginPath();
            ctx.moveTo(w, yr);
            ctx.lineTo(w - (major ? 12 : 6), yr);
            ctx.stroke();

            if (major) {
                ctx.save();
                ctx.translate(9, yr + 2);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(String(logical), 0, 0);
                ctx.restore();
            }
        }
    }
}

function stepFor(zoom: number): number {
    if (zoom >= 2) return 10;
    if (zoom >= 1) return 20;
    return 50;
}
