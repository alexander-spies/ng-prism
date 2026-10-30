const { seg, eio } = kit;
// The styleguide the decorator produced: the whole window first, then the camera moves onto the sidebar, the variant
// tabs and the button on its canvas. No click: this beat only shows where everything is.
kit.scene('reveal', {
    init(kit) {
        const v = UI.stage(kit, ['btn']);
        this.v = v;
        const b = UI.box(kit, v, v.wins[0], '[data-v=canvas-btn]');
        const s = UI.box(kit, v, v.wins[0], '[data-v=sb-button]');
        // frame from the sidebar's left edge to just right of the button
        const left = s.x,
            right = b.x + b.w + 120,
            z = 1920 / (right - left);
        this.cap = UI.caption(kit, "That's **the styleguide.**");
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.9 },
            { t: 2.4, cx: (left + right) / 2, cy: b.y + b.h / 2 - 60, z: z, drift: [3, 1, 0.008] }
        ]);
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        UI.light(kit, v.wins[0], eio(seg(t, 0.5, 2.8)), 0, 0.9);
    }
});
