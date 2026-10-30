const { seg, eo, ei, eio, lerp } = kit;
// Fully responsive: the desktop styleguide moves aside and the same styleguide comes up on a phone, in its phone layout.
// A tap on ☰ opens the navigation full screen, a tap on Toggle opens that component.
const MOB = { morph: 0.8, tapNav: 2.8, tapItem: 4.3 };
const SCALE = 1,
    BAR = 48,
    PX = 1290,
    PY = 452,
    DX = 640,
    DY = 470,
    DS = 0.46;
kit.scene('mobile', {
    init(kit) {
        kit.css(
            '.mobile-phone{position:absolute;left:' +
                PX +
                'px;top:' +
                PY +
                'px;width:418px;height:872px;margin:-436px 0 0 -209px;border-radius:62px;background:color-mix(in srgb, var(--ground) 90%, var(--second));box-shadow:0 40px 120px rgba(0,0,0,.55), 0 0 0 2px color-mix(in srgb, var(--second) 16%, transparent)}' +
                '.mobile-screen{position:absolute;left:14px;top:14px;width:390px;height:844px;border-radius:48px;overflow:hidden;background:var(--ground)}' +
                '.mobile-page{position:absolute;left:0;top:' +
                BAR +
                'px;width:390px;height:844px}' +
                '.mobile-bar{position:absolute;left:0;right:0;top:0;height:' +
                BAR +
                'px;color:var(--second);font-size:15px;font-weight:600}' +
                '.mobile-time{position:absolute;left:34px;top:15px}' +
                '.mobile-island{position:absolute;left:50%;top:11px;width:104px;height:30px;margin-left:-52px;border-radius:15px;background:color-mix(in srgb, var(--ground) 55%, #000)}' +
                '.mobile-batt{position:absolute;right:30px;top:17px;width:24px;height:12px;border-radius:4px;box-sizing:border-box;border:1.5px solid color-mix(in srgb, var(--second) 70%, transparent)}' +
                '.mobile-batt i{position:absolute;left:2px;top:2px;bottom:2px;width:14px;border-radius:1.5px;background:var(--second)}' +
                '.mobile-tap{position:absolute;left:-29px;top:-29px;width:58px;height:58px;border-radius:50%;box-sizing:border-box;background:color-mix(in srgb, var(--second) 22%, transparent);border:2px solid color-mix(in srgb, var(--second) 70%, transparent)}' +
                '.mobile-ring{position:absolute;left:-29px;top:-29px;width:58px;height:58px;border-radius:50%;box-sizing:border-box;border:2px solid color-mix(in srgb, var(--second) 60%, transparent)}'
        );
        const v = UI.stage(kit, ['look-dark']);
        this.v = v;
        v.cam.style.transformOrigin = '960px 540px';
        const pages = ['ph-btn', 'ph-nav', 'ph-toggle']
            .map((m, i) => '<div class="mobile-page"' + (i ? ' style="opacity:0"' : '') + '>' + kit.module(m + '.html') + '</div>')
            .join('');
        const phone = kit.h(
            '<div class="mobile-phone"><div class="mobile-screen">' +
                pages +
                '<div class="mobile-bar"><span class="mobile-time">9:41</span><span class="mobile-island"></span><span class="mobile-batt"><i></i></span></div></div></div>'
        );
        kit.stage.append(phone);
        phone.style.transform = 'scale(' + SCALE + ')';
        this.phone = phone.style;
        this.pages = [...phone.querySelectorAll('.mobile-page')].map((n) => n.style);
        // where the taps land, measured with the phone at its final size
        const c = (sel) => {
            const r = kit.srect(phone.querySelector(sel));
            return [r.x + r.w / 2, r.y + r.h / 2];
        };
        this.p1 = c('[data-v=nav-toggle]');
        this.pages[1].opacity = '1';
        this.p2 = c('[data-v=nav-toggle-item]');
        this.pages[1].opacity = '0';
        const tap = kit.h('<div class="mobile-tap"></div>'),
            ring = kit.h('<div class="mobile-ring"></div>');
        kit.stage.append(ring);
        kit.stage.append(tap);
        this.tap = tap.style;
        this.ring = ring.style;
        this.cap = UI.caption(kit, 'Fully responsive, **down to your phone.**');
    },
    render(t, kit) {
        const v = this.v;
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        // the desktop window shrinks and moves to the left, the phone comes in beside it: one styleguide, two screens
        const m = eio(seg(t, MOB.morph, MOB.morph + 1.1));
        v.cam.style.transform = 'translate(' + lerp(0, DX - 960, m).toFixed(1) + 'px,' + lerp(0, DY - 540, m).toFixed(1) + 'px) scale(' + lerp(1, DS, m).toFixed(4) + ')';
        const p = eo(seg(t, MOB.morph + 0.3, MOB.morph + 1.2));
        this.phone.opacity = String(p);
        this.phone.transform = 'translateX(' + ((1 - p) * 90).toFixed(1) + 'px) scale(' + (SCALE * lerp(0.94, 1, p)).toFixed(4) + ')';
        // a finger instead of a cursor: it comes in, presses, a ring spreads from the tap
        const taps = [
            [MOB.tapNav, this.p1],
            [MOB.tapItem, this.p2]
        ];
        let x = this.p1[0],
            y = this.p1[1],
            o = 0,
            press = 0,
            ringAge = 9;
        const move = eio(seg(t, MOB.tapNav + 0.35, MOB.tapItem - 0.25));
        x = lerp(this.p1[0], this.p2[0], move);
        y = lerp(this.p1[1], this.p2[1], move);
        o = eo(seg(t, MOB.tapNav - 0.5, MOB.tapNav - 0.25)) * (1 - ei(seg(t, MOB.tapItem + 0.3, MOB.tapItem + 0.55)));
        for (const [at] of taps) {
            const age = t - at;
            if (age >= -0.06 && age < 0.14) press = 1;
            if (age >= 0 && age < ringAge) ringAge = age;
        }
        this.tap.opacity = String(o);
        this.tap.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (press ? 0.82 : 1) + ')';
        const r = seg(ringAge, 0, 0.45);
        this.ring.opacity = String(ringAge < 0.45 ? 0.8 * (1 - r) : 0);
        this.ring.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + lerp(1, 2.1, eo(r)).toFixed(3) + ')';
        // the pages answer the taps: navigation full screen, then the component
        const a = eo(seg(t, MOB.tapNav + 0.04, MOB.tapNav + 0.24)),
            b = eo(seg(t, MOB.tapItem + 0.04, MOB.tapItem + 0.24));
        this.pages[1].opacity = String(a * (1 - b));
        this.pages[1].transform = 'translateX(' + ((1 - a) * -24).toFixed(1) + 'px)';
        this.pages[2].opacity = String(b);
    }
});
