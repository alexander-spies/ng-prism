const { seg, eo } = kit;
// API pages, straight from your JSDoc: on the Form Field (test-lib), a click on API opens the page the JSDoc plugin
// generates from the component's own comments: description, usage, examples, inputs.
const API = { click: 2.2 };
kit.scene('api', {
    init(kit) {
        const v = UI.stage(kit, ['api-before', 'api-after']);
        this.v = v;
        const seg2 = UI.box(kit, v, v.wins[0], '[data-v=api-seg]');
        this.cap = UI.caption(kit, 'API pages, **straight from your JSDoc.**');
        const right = 240 + 1440;
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.4 },
            { t: 1.5, cx: right - 480, cy: 90 + 270, z: 2, hold: 1.3 },
            { t: 4.0, cx: 1100, cy: 180 + 540 / 1.4 - 10, z: 1.4, drift: [0, 3, 0.004] }
        ]);
        const at = (r, dx, dy) => UI.at(v, r.x + r.w / 2 + (dx || 0), r.y + r.h / 2 + (dy || 0));
        const cur = kit.cursor();
        cur.keys = [
            { t: 1.0, at: at(seg2, -260, 220) },
            { t: 2.0, at: at(seg2), bow: -0.12 },
            { t: 2.5, at: at(seg2) },
            { t: 3.2, at: at(seg2, -120, 160), bow: 0.1 }
        ];
        cur.clicks = [API.click];
        cur.visible = (t) => eo(seg(t, 0.9, 1.2)) * (1 - eo(seg(t, 3.2, 3.5)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        v.wins[1].style.opacity = String(eo(seg(t, API.click + 0.04, API.click + 0.24)));
        this.cur.render(t);
    }
});
