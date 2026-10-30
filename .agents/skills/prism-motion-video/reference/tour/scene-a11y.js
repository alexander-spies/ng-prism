const { seg, eo, lerp } = kit;
// Every variant gets an a11y check: the faint Ghost variant, a click on the A11y tab, and its real contrast violation.
const A11Y = { click: 2.1, mark: 3.9 };
kit.scene('a11y', {
    init(kit) {
        const v = UI.stage(kit, ['a11y-before', 'a11y-after']);
        this.v = v;
        const tab = UI.box(kit, v, v.wins[0], '[aria-controls=panel-a11y]');
        const sc = UI.box(kit, v, v.wins[1], 'prism-metric-card');
        const bd = UI.box(kit, v, v.wins[1], '.viol-list .prism-list-row__badge prism-badge');
        const hi = kit.h('<div class="hi a11y-hi"></div>');
        Object.assign(hi.style, { left: bd.x - 3 + 'px', top: bd.y - 5 + 'px', width: bd.w + 6 + 'px', height: bd.h + 10 + 'px', opacity: '0' });
        v.cam.append(hi);
        this.hi = hi.style;
        this.cap = UI.caption(kit, 'Every variant gets **an a11y check.**');
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.4 },
            { t: 1.5, cx: 960, cy: 990 - 216 / 1.25, z: 1.25, hold: 1.4 },
            { t: 3.7, cx: sc.x + 840 / 1.6, cy: 990 - 216 / 1.6, z: 1.6, drift: [2, 0, 0.005] }
        ]);
        const at = (r, dx, dy) => UI.at(v, r.x + r.w / 2 + (dx || 0), r.y + r.h / 2 + (dy || 0));
        const cur = kit.cursor();
        cur.keys = [
            { t: 1.0, at: at(tab, 240, -160) },
            { t: 1.9, at: at(tab), bow: 0.12 },
            { t: 2.4, at: at(tab) },
            { t: 3.2, at: at(tab, 90, 140), bow: -0.1 }
        ];
        cur.clicks = [A11Y.click];
        cur.visible = (t) => eo(seg(t, 0.9, 1.2)) * (1 - eo(seg(t, 3.2, 3.5)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        v.wins[1].style.opacity = String(eo(seg(t, A11Y.click + 0.04, A11Y.click + 0.24)));
        const m = eo(seg(t, A11Y.mark, A11Y.mark + 0.35));
        this.hi.opacity = String(m);
        this.hi.transform = 'scale(' + lerp(1.04, 1, m).toFixed(4) + ')';
        this.cur.render(t);
    }
});
