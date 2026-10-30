const { seg, eo, eio, lerp } = kit;
// Clicks and the reveal, in scene seconds; the score reads the same numbers.
const LOOK = { on: 2.55, off: 5.0, wipe: 0.7 };
kit.scene('look', {
    init(kit) {
        const v = UI.stage(kit, ['look-dark', 'look-light']);
        this.v = v;
        this.light = v.wins[1];
        this.light.style.opacity = '1';
        const b = UI.box(kit, v, v.wins[0], '[data-v=theme]');
        this.bx = b.x + b.w / 2;
        this.by = b.y + b.h / 2;
        this.lx = this.bx - 240;
        this.ly = this.by - 90;
        this.cap = UI.caption(kit, 'A new look. **Dark and light.**');
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.5 },
            { t: 1.9, cx: 960, cy: 540, z: 1.15, drift: [0, 0, 0.004] }
        ]);
        const cur = kit.cursor();
        const at = (x, y) => UI.at(v, x, y);
        cur.keys = [
            { t: 1.2, at: at(1190, 640) },
            { t: 2.4, at: at(this.bx, this.by), bow: 0.12 },
            { t: 2.75, at: at(this.bx, this.by) },
            { t: 3.5, at: at(this.bx - 70, this.by + 74), bow: 0.1 },
            { t: 4.4, at: at(this.bx - 70, this.by + 74) },
            { t: 4.85, at: at(this.bx, this.by), bow: -0.1 }
        ];
        cur.clicks = [LOOK.on, LOOK.off];
        cur.visible = (t) => eo(seg(t, 1.1, 1.4)) * (1 - eo(seg(t, 6.3, 6.6)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        const p = eio(seg(t, 0.4, 2.6));
        const up = eo(seg(t, 0.3, 0.9)),
            down = eio(seg(t, 0.9, 2.2));
        for (const w of v.wins) UI.light(kit, w, p, 0.9 * up * (1 - down), lerp(0.9, 1.08, up) + 0.12 * down);
        const r = 1680 * eio(seg(t, LOOK.on + 0.05, LOOK.on + 0.05 + LOOK.wipe)) * (1 - eio(seg(t, LOOK.off + 0.05, LOOK.off + 0.05 + LOOK.wipe)));
        this.light.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + this.lx.toFixed(1) + 'px ' + this.ly.toFixed(1) + 'px)';
        this.cur.render(t);
    }
});
