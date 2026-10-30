const { seg, eo, lerp } = kit;
// Every state, every pixel: the canvas tools open, the declared states Hover, Focus visible and Pressed are clicked one
// after the other, then the Box Model tab, which draws its overlay once the pointer is on the button.
const ST = { tools: 1.7, hover: 2.6, focus: 3.5, pressed: 4.4, box: 5.9, onBtn: 6.6 };
kit.scene('states', {
    init(kit) {
        const v = UI.stage(kit, ['btn', 'st-tools', 'st-hover', 'st-focus', 'st-pressed', 'st-box']);
        this.v = v;
        const tools = UI.box(kit, v, v.wins[0], '[data-v=tools]');
        const b = UI.box(kit, v, v.wins[0], '[data-v=canvas-btn]');
        const chip = (n) => UI.box(kit, v, v.wins[1], '[data-v=chip-' + n + ']');
        const ch = { hover: chip('hover'), focus: chip('focus'), pressed: chip('pressed') };
        const boxTab = UI.box(kit, v, v.wins[5], '[data-v=box-tab]');
        this.pop = v.wins[1].querySelector('[data-popover-open]').style;
        this.pop.transformOrigin = '100% 0';
        this.bm = v.wins[5].querySelector('.prism-bm__box--margin').style;
        this.cap = UI.caption(kit, 'Every state. **Every pixel.**');
        const p = UI.box(kit, v, v.wins[1], '[data-popover-open]');
        const left = b.x - 260,
            right = tools.x + tools.w + 40,
            z = 1920 / (right - left);
        // for the box model: the button with its overlay and the panel's diagram, fitted above the caption
        const d = UI.box(kit, v, v.wins[5], '.prism-bmp__region--margin');
        const x0 = Math.min(b.x, d.x) - 80,
            x1 = Math.max(b.x + b.w, d.x + d.w) + 80,
            y0 = b.y - 60,
            y1 = d.y + d.h + 30;
        const z2 = Math.min(1920 / (x1 - x0), 700 / (y1 - y0));
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.4 },
            { t: 1.5, cx: (left + right) / 2, cy: (p.y + b.y + b.h) / 2 + 40, z: z, hold: 3.5 },
            { t: 5.7, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 + (160 / z2) * 0.5, z: z2, drift: [0, 0, 0.004] }
        ]);
        const at = (r, dx, dy) => UI.at(v, r.x + r.w / 2 + (dx || 0), r.y + r.h / 2 + (dy || 0));
        const cur = kit.cursor();
        cur.keys = [
            { t: 1.0, at: at(b, 120, 90) },
            { t: 1.6, at: at(tools), bow: 0.1 },
            { t: 1.9, at: at(tools) },
            { t: 2.5, at: at(ch.hover), bow: 0.1 },
            { t: 3.4, at: at(ch.focus) },
            { t: 4.3, at: at(ch.pressed) },
            { t: 4.8, at: at(ch.pressed) },
            { t: 5.8, at: at(boxTab), bow: -0.1 },
            { t: 6.1, at: at(boxTab) },
            { t: ST.onBtn, at: at(b, 10, 6), bow: 0.1 }
        ];
        cur.clicks = [ST.tools, ST.hover, ST.focus, ST.pressed, ST.box];
        cur.visible = (t) => eo(seg(t, 0.9, 1.2));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        const keys = ['tools', 'hover', 'focus', 'pressed', 'box'];
        keys.forEach((k, i) => {
            v.wins[i + 1].style.opacity = String(eo(seg(t, ST[k] + 0.04, ST[k] + 0.24)));
        });
        const p = eo(seg(t, ST.tools + 0.04, ST.tools + 0.24));
        this.pop.transform = 'scale(' + lerp(0.96, 1, p).toFixed(4) + ')';
        this.bm.opacity = String(eo(seg(t, ST.onBtn - 0.05, ST.onBtn + 0.15)));
        this.cur.render(t);
    }
});
