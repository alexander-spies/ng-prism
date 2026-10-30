const { seg, eo, lerp } = kit;
// test-workspace/projects/test-lib/src/lib/components/form-field/form-field.component.ts, lines 64 to 73,
// verbatim but for the 12 spaces of indentation every line shares
const SRC = [
    'meta: {',
    '    a11y: {',
    '        accept: [',
    '            {',
    "                rule: 'color-contrast',",
    "                reason: 'The hint grey (#6b7280) reaches 4.47:1 on the light ground, a hair under the 4.5:1 WCAG AA asks of small text. Kept as the demo of an accepted violation.'",
    '            }',
    '        ]',
    '    }',
    '}'
];
const RULE = 4,
    REASON = 5,
    INDENT = 16,
    LH = 28;
const A11Y = { type: 1.4, click: 4.1, mark: 5.3 };
const hl = (s) =>
    s
        .split(/('[^']*')/)
        .map((p, i) => (i % 2 ? '<span class="a11y-s">' + kit.esc(p) + '</span>' : kit.esc(p).replace(/(\w+)(?=:)/g, '<span class="a11y-k">$1</span>')))
        .join('');
kit.scene('a11y', {
    init(kit) {
        kit.css(
            '.a11y-veil{position:absolute;inset:0;background:linear-gradient(90deg, color-mix(in srgb, var(--ground) 97%, transparent) 0%, color-mix(in srgb, var(--ground) 90%, transparent) 30%, transparent 42%)}' +
                '.a11y-card{position:absolute;left:84px;top:262px;width:700px;padding:22px 30px 26px;box-sizing:border-box;border-radius:16px;overflow:hidden;background:color-mix(in srgb, var(--ground) 86%, var(--indigo));box-shadow:0 30px 80px rgba(0,0,0,.45), 0 0 0 1px color-mix(in srgb, var(--second) 12%, transparent)}' +
                '.a11y-file{margin:0 0 14px;font-size:15px;color:color-mix(in srgb, var(--second) 55%, var(--ground))}' +
                '.a11y-code{position:relative;overflow:hidden;font-size:18px;line-height:28px;font-weight:500;color:#cbd5e1}' +
                '.a11y-ln{display:block;white-space:pre;overflow:hidden;height:28px}' +
                '.a11y-s{color:#86efac}.a11y-k{color:#67e8f9}' +
                '.a11y-fade{position:absolute;right:0;top:0;bottom:0;width:110px;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--ground) 86%, var(--indigo)))}' +
                '.a11y-caret{position:absolute;width:2px;height:22px;background:var(--second)}'
        );
        const v = UI.stage(kit, ['a11y-before', 'a11y-after']);
        this.v = v;
        const card = kit.h(
            '<div class="a11y-card mono"><p class="a11y-file">form-field.component.ts</p><div class="a11y-code">' +
                SRC.map((l) => '<span class="a11y-ln">' + hl(l) + '</span>').join('') +
                '<span class="a11y-caret"></span><span class="a11y-fade"></span></div></div>'
        );
        kit.stage.append(card);
        this.card = card.style;
        const lines = card.querySelectorAll('.a11y-ln');
        this.rule = lines[RULE].style;
        this.reason = lines[REASON].style;
        this.caret = card.querySelector('.a11y-caret').style;
        const code = card.querySelector('.a11y-code');
        const probe = kit.h('<span style="position:absolute;visibility:hidden;white-space:pre">' + '0'.repeat(40) + '</span>');
        code.append(probe);
        this.cw = probe.offsetWidth / 40;
        probe.remove();
        const shown = Math.floor(code.offsetWidth / this.cw) - INDENT - 2;
        this.t1 = kit.typist(SRC[RULE].slice(INDENT), A11Y.type, 34);
        this.t2 = kit.typist(SRC[REASON].slice(INDENT, INDENT + shown), this.t1.end + 0.2, 40);
        const tab = UI.box(kit, v, v.wins[0], '[data-v=a11y-tab]');
        const tx = tab.x + tab.w / 2,
            ty = tab.y + tab.h / 2;
        const f = UI.box(kit, v, v.wins[1], '.viol-fold');
        // the highlight goes round the row's Accepted badge
        const b = UI.box(kit, v, v.wins[1], '.viol-fold .prism-list-row__badge prism-badge');
        const hi = kit.h('<div class="hi a11y-hi"></div>');
        Object.assign(hi.style, { left: b.x - 3 + 'px', top: b.y - 5 + 'px', width: b.w + 6 + 'px', height: b.h + 10 + 'px', opacity: '0' });
        v.cam.append(hi);
        this.hi = hi.style;
        const cy = f.y + f.h / 2;
        v.c.set([
            { t: 0, cx: f.x + 120 / 1.6, cy: 990 - 216 / 1.6, z: 1.6, hold: 4.5 },
            { t: 5.4, cx: f.x + 120 / 1.75, cy: 990 - 216 / 1.75, z: 1.75, drift: [2, 0, 0.005] }
        ]);
        this.cap = UI.caption(kit, "Accepted violations show, **but don't count.**");
        const cur = kit.cursor();
        cur.keys = [
            { t: 3.0, at: UI.at(v, tx + 240, ty - 140) },
            { t: 3.9, at: UI.at(v, tx, ty), bow: 0.12 },
            { t: 4.3, at: UI.at(v, tx, ty) },
            { t: 4.9, at: UI.at(v, tx + 70, ty + 150), bow: -0.1 }
        ];
        cur.clicks = [A11Y.click];
        cur.visible = (t) => eo(seg(t, 2.9, 3.2)) * (1 - eo(seg(t, 5.0, 5.3)));
        this.cur = cur;
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        const k = eo(seg(t, 0.1, 0.5));
        this.card.opacity = String(k);
        this.card.transform = 'translateX(' + ((1 - k) * -24).toFixed(2) + 'px)';
        const n1 = INDENT + this.t1.count(t);
        const n2 = t < this.t2.end ? INDENT + this.t2.count(t) : SRC[REASON].length;
        this.rule.width = (n1 * this.cw).toFixed(1) + 'px';
        this.reason.width = (n2 * this.cw).toFixed(1) + 'px';
        const onRule = t < this.t1.end + 0.1;
        const n = onRule ? n1 : INDENT + this.t2.count(t);
        this.caret.left = (n * this.cw + 1).toFixed(1) + 'px';
        this.caret.top = (onRule ? RULE : REASON) * LH + 3 + 'px';
        const typing = (t >= A11Y.type - 0.2 && t < this.t1.end + 0.05) || (t >= this.t2.times[0] - 0.05 && t < this.t2.end + 0.05);
        this.caret.opacity = t < 1.2 || t > 3.9 ? '0' : typing ? '1' : String(Math.floor(t / 0.53) % 2);
        v.wins[1].style.opacity = String(eo(seg(t, A11Y.click + 0.04, A11Y.click + 0.24)));
        const m = eo(seg(t, A11Y.mark, A11Y.mark + 0.35));
        this.hi.opacity = String(m);
        this.hi.transform = 'scale(' + lerp(1.03, 1, m).toFixed(4) + ')';
        this.cur.render(t);
    }
});
