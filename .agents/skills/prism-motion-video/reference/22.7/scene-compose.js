const { seg, eo, eio, lerp } = kit;
// test-workspace/projects/video-lib/src/lib/field/field.component.ts, lines 4 to 14, verbatim
const SRC = [
    '@Showcase({',
    "    title: 'Field',",
    "    category: 'Inputs',",
    '    variants: [',
    '        {',
    "            name: 'E-Mail',",
    "            inputs: { label: 'E-Mail' },",
    '            template: \'<input uiInput placeholder="you@example.com" />\'',
    '        }',
    '    ]',
    '})'
];
const TYPED = 7,
    INDENT = 12;
const hl = (s) =>
    s
        .split(/('[^']*')/)
        .map((p, i) =>
            i % 2
                ? '<span class="compose-s">' + kit.esc(p) + '</span>'
                : kit
                      .esc(p)
                      .replace(/@Showcase/, '<span class="compose-d">@Showcase</span>')
                      .replace(/(\w+)(?=:)/g, '<span class="compose-k">$1</span>')
        )
        .join('');
kit.scene('compose', {
    init(kit) {
        kit.css(
            '.compose-veil{position:absolute;inset:0;background:linear-gradient(90deg, color-mix(in srgb, var(--ground) 97%, transparent) 0%, color-mix(in srgb, var(--ground) 90%, transparent) 44%, transparent 60%)}' +
                '.compose-card{position:absolute;left:84px;top:250px;width:832px;padding:22px 30px 26px;box-sizing:border-box;border-radius:16px;background:color-mix(in srgb, var(--ground) 86%, var(--indigo));box-shadow:0 30px 80px rgba(0,0,0,.45), 0 0 0 1px color-mix(in srgb, var(--second) 12%, transparent)}' +
                '.compose-file{margin:0 0 14px;font-size:15px;color:color-mix(in srgb, var(--second) 55%, var(--ground))}' +
                '.compose-code{position:relative;font-size:18px;line-height:28px;font-weight:500;color:#cbd5e1}' +
                '.compose-ln{display:block;white-space:pre;overflow:hidden;height:28px}' +
                '.compose-s{color:#86efac}.compose-k{color:#67e8f9}.compose-d{color:#e879f9}' +
                '.compose-caret{position:absolute;width:2px;height:22px;background:var(--second)}'
        );
        const v = UI.stage(kit, ['compose']);
        this.v = v;
        kit.stage.append(kit.h('<div class="compose-veil"></div>'));
        const card = kit.h(
            '<div class="compose-card mono"><p class="compose-file">field.component.ts</p><div class="compose-code">' +
                SRC.map((l) => '<span class="compose-ln">' + hl(l) + '</span>').join('') +
                '<span class="compose-caret"></span></div></div>'
        );
        kit.stage.append(card);
        this.card = card.style;
        const lines = card.querySelectorAll('.compose-ln');
        this.line = lines[TYPED].style;
        this.caret = card.querySelector('.compose-caret').style;
        const probe = kit.h('<span style="position:absolute;visibility:hidden;white-space:pre">' + '0'.repeat(40) + '</span>');
        card.querySelector('.compose-code').append(probe);
        this.cw = probe.offsetWidth / 40;
        probe.remove();
        this.typed = kit.typist(SRC[TYPED].slice(INDENT), 1.6, 34);
        const f = UI.box(kit, v, v.wins[0], '.ui-field');
        this.field = v.wins[0].querySelector('.ui-field').style;
        const fx = f.x + f.w / 2,
            fy = f.y + f.h / 2;
        v.c.set([
            { t: 0, cx: fx - 430 / 1.5, cy: fy + 70 / 1.5, z: 1.5, hold: 3.55 },
            { t: 4.8, cx: fx - 430 / 2.3, cy: fy + 70 / 2.3, z: 2.3, drift: [0, 0, 0.01] }
        ]);
        this.cap = UI.caption(kit, 'Compose real templates. **Compiled, not mocked.**');
    },
    render(t, kit) {
        const v = this.v;
        v.c.apply(t);
        UI.open(kit, v, t);
        UI.showCap(kit, this.cap, t, 0.15);
        const c = eo(seg(t, 0.1, 0.5));
        this.card.opacity = String(c);
        this.card.transform = 'translateX(' + ((1 - c) * -24).toFixed(2) + 'px)';
        const n = INDENT + this.typed.count(t);
        this.line.width = (n * this.cw).toFixed(1) + 'px';
        this.caret.left = (n * this.cw + 1).toFixed(1) + 'px';
        this.caret.top = TYPED * 28 + 3 + 'px';
        const typing = t >= 1.4 && t < this.typed.end + 0.05;
        this.caret.opacity = t < 1.2 || t > 4.2 ? '0' : typing ? '1' : String(Math.floor(t / 0.53) % 2);
        const r = eo(seg(t, 3.45, 3.85));
        this.field.opacity = String(r);
        this.field.transform = 'translateY(' + ((1 - r) * 8).toFixed(2) + 'px)';
    }
});
