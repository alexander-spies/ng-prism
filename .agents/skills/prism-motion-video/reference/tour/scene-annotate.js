const { seg, eo, eio, lerp } = kit;
// test-workspace/projects/video-lib/src/lib/button/button.component.ts, lines 4 to 26, verbatim. The first TYPED lines
// (the @Showcase block) type themselves in above @Component; the lines below move down as each new line opens.
const SRC = [
    '@Showcase({',
    "    title: 'Button',",
    "    category: 'Inputs',",
    '    variants: [',
    "        { name: 'Primary', inputs: { label: 'Save' } },",
    "        { name: 'Ghost', inputs: { label: 'Save', variant: 'ghost' } }",
    '    ],',
    '    states: [',
    "        { name: 'Hover', pseudo: { hover: '.btn' } },",
    "        { name: 'Focus visible', pseudo: { 'focus-visible': '.btn' } },",
    "        { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } }",
    '    ]',
    '})',
    '@Component({',
    "    selector: 'ui-button',",
    "    templateUrl: './button.component.html',",
    "    styleUrl: './button.component.css'",
    '})',
    'export class ButtonComponent {',
    "    readonly label = input('Button');",
    "    readonly variant = input<'primary' | 'ghost'>('primary');",
    '    readonly clicked = output<void>();',
    '}'
];
const TYPED = 13,
    LH = 28,
    T0 = 1.4,
    TYPE_SECONDS = 4.5;
const hl = (s) =>
    s
        .split(/('[^']*')/)
        .map((p, i) =>
            i % 2
                ? '<span class="annotate-s">' + kit.esc(p) + '</span>'
                : kit
                      .esc(p)
                      .replace(/@(Showcase|Component)/, '<span class="annotate-d">@$1</span>')
                      .replace(/(\w+)(?=:)/g, '<span class="annotate-k">$1</span>')
        )
        .join('');
const indent = (l) => l.length - l.trimStart().length;
kit.scene('annotate', {
    init(kit) {
        kit.css(
            '.annotate-card{position:absolute;left:50%;width:880px;margin-left:-440px;padding:22px 34px 26px;box-sizing:border-box;border-radius:18px;background:color-mix(in srgb, var(--ground) 86%, var(--indigo));box-shadow:0 40px 100px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, var(--second) 12%, transparent)}' +
                '.annotate-file{margin:0 0 14px;font-size:16px;color:color-mix(in srgb, var(--second) 55%, var(--ground))}' +
                '.annotate-code{position:relative;font-size:19px;line-height:28px;font-weight:500;color:#cbd5e1}' +
                '.annotate-ln{position:relative;display:block;white-space:pre;overflow:hidden;height:28px}' +
                '.annotate-in{display:block;white-space:pre;overflow:hidden}' +
                '.annotate-s{color:#86efac}.annotate-k{color:#67e8f9}.annotate-d{color:#e879f9}' +
                '.annotate-band{position:absolute;left:-14px;right:-14px;top:0;border-radius:10px;background:color-mix(in srgb, var(--main) 14%, transparent)}' +
                '.annotate-caret{position:absolute;width:2px;height:22px;background:var(--second)}'
        );
        kit.stage.append(kit.h('<div class="ground"></div>'));
        const card = kit.h(
            '<div class="annotate-card mono"><p class="annotate-file">button.component.ts</p><div class="annotate-code"><div class="annotate-band"></div>' +
                SRC.map((l) => '<span class="annotate-ln"><span class="annotate-in">' + hl(l) + '</span></span>').join('') +
                '<span class="annotate-caret"></span></div></div>'
        );
        kit.stage.append(card);
        this.card = card.style;
        const probe = kit.h('<span style="position:absolute;visibility:hidden;white-space:pre">' + '0'.repeat(40) + '</span>');
        card.querySelector('.annotate-code').append(probe);
        this.cw = probe.offsetWidth / 40;
        probe.remove();
        // the final card is centred a little above the caption; it grows downwards from there as lines open
        const finalH = card.offsetHeight;
        card.style.top = Math.round(500 - finalH / 2) + 'px';
        const lines = [...card.querySelectorAll('.annotate-ln')];
        this.lines = lines.map((n) => n.style);
        this.inner = lines.map((n) => n.firstChild.style);
        this.band = card.querySelector('.annotate-band').style;
        this.caret = card.querySelector('.annotate-caret').style;
        // one typist over the block, without the indentation, an Enter between lines
        const typed = SRC.slice(0, TYPED);
        const text = typed.map((l) => l.trimStart()).join('\n');
        this.typist = kit.typist(text, T0, text.length / TYPE_SECONDS);
        let s = 0;
        this.starts = typed.map((l, i) => {
            const at = s;
            s += l.trimStart().length + 1;
            return at;
        });
        this.cap = UI.caption(kit, 'Annotate the **component itself.**');
    },
    render(t, kit) {
        UI.showCap(kit, this.cap, t, 0.15);
        const c = eo(seg(t, 0.05, 0.5));
        this.card.opacity = String(c);
        this.card.transform = 'translateY(' + ((1 - c) * 18).toFixed(2) + 'px) scale(' + (1 + 0.012 * seg(t, 0, 10)).toFixed(4) + ')';
        const n = this.typist.count(t),
            times = this.typist.times;
        let caretLine = -1,
            caretCol = 0,
            y = 0;
        for (let i = 0; i < SRC.length; i++) {
            let h = LH,
                w = null;
            if (i < TYPED) {
                const s = this.starts[i],
                    open = i === 0 ? T0 : times[s - 1];
                h = n >= s || (i === 0 && t >= T0) ? LH * eo(seg(t, open, open + 0.08)) : 0;
                const k = Math.max(0, Math.min(SRC[i].trimStart().length, n - s));
                w = (indent(SRC[i]) + k) * this.cw;
                if (h > 0) {
                    caretLine = i;
                    caretCol = indent(SRC[i]) + k;
                }
            }
            this.lines[i].height = h.toFixed(2) + 'px';
            this.inner[i].width = w === null ? 'auto' : w.toFixed(1) + 'px';
            if (i === caretLine) this.caretY = y;
            y += h;
        }
        const typing = t >= T0 - 0.2 && t < this.typist.end + 0.1;
        this.caret.left = (caretCol * this.cw + 1).toFixed(1) + 'px';
        this.caret.top = ((this.caretY || 0) + 3).toFixed(1) + 'px';
        this.caret.opacity = t < 1.0 || t > this.typist.end + 1.2 ? '0' : typing ? '1' : String(Math.floor(t / 0.53) % 2);
        // once typed, the block stays marked long enough to read
        const b = eo(seg(t, this.typist.end + 0.3, this.typist.end + 0.7));
        this.band.height = (TYPED * LH).toFixed(1) + 'px';
        this.band.opacity = String(b);
    }
});
