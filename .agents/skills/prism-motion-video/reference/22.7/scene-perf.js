const { seg, eo, lerp } = kit;
const PERF = { click: 2.2, mark: 3.7 };
kit.scene('perf', {
    init(kit) {
        const v = UI.stage(kit, ['look-dark', 'perf']);
        this.v = v;
        const tab = UI.box(kit, v, v.wins[1], '[data-v=perf-tab]');
        const tx = tab.x + tab.w / 2,
            ty = tab.y + tab.h / 2;
        const b = UI.box(kit, v, v.wins[1], '.perf-block');
        const hi = kit.h('<div class="hi perf-hi"></div>');
        Object.assign(hi.style, { left: b.x - 6 + 'px', top: b.y - 6 + 'px', width: b.w + 12 + 'px', height: b.h + 12 + 'px', opacity: '0' });
        v.cam.append(hi);
        this.hi = hi.style;
        this.cap = UI.caption(kit, 'Bundle size measures **the code you ship.**');
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.4 },
            { t: 1.6, cx: tx + 120, cy: ty + 60, z: 1.6, hold: 1.05 },
            { t: 3.6, cx: b.x + b.w / 2 - 20, cy: 990 - 220 / 1.6, z: 1.6, drift: [0, 0, 0.008] }
        ]);
        const cur = kit.cursor();
        cur.keys = [
            { t: 0.9, at: UI.at(v, tx - 280, ty - 160) },
            { t: 2.0, at: UI.at(v, tx, ty), bow: -0.12 },
            { t: 2.45, at: UI.at(v, tx, ty) },
            { t: 3.2, at: UI.at(v, tx + 90, ty + 120), bow: 0.1 }
        ];
        cur.clicks = [PERF.click];
        cur.visible = (t) => eo(seg(t, 0.8, 1.1)) * (1 - eo(seg(t, 3.1, 3.4)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        v.wins[1].style.opacity = String(eo(seg(t, PERF.click + 0.04, PERF.click + 0.24)));
        const m = eo(seg(t, PERF.mark, PERF.mark + 0.35));
        this.hi.opacity = String(m);
        this.hi.transform = 'scale(' + lerp(1.03, 1, m).toFixed(4) + ')';
        this.cur.render(t);
    }
});
