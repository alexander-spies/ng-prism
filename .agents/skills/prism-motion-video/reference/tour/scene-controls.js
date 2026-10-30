const { seg, eo, lerp } = kit;
// Change inputs, see it live: the label is typed into its control and the button on the canvas follows each key; the
// variant switches to ghost; a click on the button shows up in the Events tab.
const LABEL = 'Ship it';
const CTL = { focus: 1.9, type: 2.15, ghost: 4.4, press: 5.9, mark: 6.3 };
kit.scene('controls', {
    init(kit) {
        const v = UI.stage(kit, ['btn', 'ctl-label', 'ctl-ghost', 'ctl-clicked']);
        this.v = v;
        const w0 = v.wins[0];
        this.input = w0.querySelector('[data-v=label]');
        this.btn = w0.querySelector('[data-v=canvas-btn]');
        const inp = UI.box(kit, v, w0, '[data-v=label]');
        const pill = UI.box(kit, v, w0, '[data-v=ctl-ghost]');
        const b = UI.box(kit, v, w0, '[data-v=canvas-btn]');
        const ev = UI.box(kit, v, v.wins[3], '[aria-controls=panel-events]');
        const hi = kit.h('<div class="hi controls-hi"></div>');
        Object.assign(hi.style, { left: ev.x - 4 + 'px', top: ev.y + 2 + 'px', width: ev.w + 8 + 'px', height: ev.h - 4 + 'px', opacity: '0' });
        v.cam.append(hi);
        this.hi = hi.style;
        this.typed = kit.typist(LABEL, CTL.type, 8);
        this.cap = UI.caption(kit, 'Change inputs. **See it live.**');
        // the button on its canvas at the top, the controls row below it, both large enough to read
        const z = 1.35,
            cy = b.y + b.h / 2 + (540 - 200) / z;
        v.c.set([
            { t: 0, cx: 960, cy: 540, z: 1, hold: 0.4 },
            { t: 1.5, cx: (inp.x + pill.x + pill.w) / 2, cy: cy, z: z, drift: [0, 0, 0.004] }
        ]);
        const at = (r, dx, dy) => UI.at(v, r.x + r.w / 2 + (dx || 0), r.y + r.h / 2 + (dy || 0));
        const cur = kit.cursor();
        cur.keys = [
            { t: 1.0, at: at(inp, 260, 160) },
            { t: 1.8, at: at(inp, 30), bow: 0.1 },
            { t: 3.6, at: at(inp, 30) },
            { t: 4.3, at: at(pill), bow: -0.1 },
            { t: 4.8, at: at(pill) },
            { t: 5.8, at: at(b), bow: 0.12 },
            { t: 6.6, at: at(b, 120, 80), bow: 0.1 }
        ];
        cur.clicks = [CTL.focus, CTL.ghost, CTL.press];
        cur.visible = (t) => eo(seg(t, 0.9, 1.2)) * (1 - eo(seg(t, 7.0, 7.3)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        // each key lands in the control and on the canvas at once; the first replaces the old label
        const n = this.typed.count(t),
            label = n > 0 ? LABEL.slice(0, n) : 'Save';
        this.input.value = label;
        this.btn.textContent = label;
        const done = this.typed.end + 0.15;
        v.wins[1].style.opacity = String(eo(seg(t, done, done + 0.2)));
        v.wins[2].style.opacity = String(eo(seg(t, CTL.ghost + 0.04, CTL.ghost + 0.24)));
        v.wins[3].style.opacity = String(eo(seg(t, CTL.press + 0.04, CTL.press + 0.24)));
        const m = eo(seg(t, CTL.mark, CTL.mark + 0.35));
        this.hi.opacity = String(m);
        this.hi.transform = 'scale(' + lerp(1.04, 1, m).toFixed(4) + ')';
        this.cur.render(t);
    }
});
