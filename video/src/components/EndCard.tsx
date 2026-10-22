import { Gradient, Img, Layout, Node, Rect, Txt, type NodeProps } from '@revideo/2d';
import { all, easeOutCubic, type ThreadGenerator } from '@revideo/core';
import { FONT_MONO, GRADIENT_STOPS, TEXT } from '../brand.ts';
import { brandGradient } from './brand-paint.ts';
import { Lockup } from './Lockup.tsx';

export interface EndCardProps extends NodeProps {
    /** URL of the styleguide still for the window on the right. */
    still: string;
    /** The command on the pill, e.g. `ng add @ng-prism/core`. */
    command: string;
    width?: number;
    height?: number;
}

/** The closing frame in the look of the README cover: brand on the left, the app in a tilted window on the right. */
export class EndCard extends Node {
    private readonly text: Layout;
    private readonly window: Rect;

    public constructor({ still, command, width = 1920, height = 1080, ...props }: EndCardProps) {
        super(props);
        const windowWidth = width * 0.62;
        this.window = new Rect({
            x: width * 0.36,
            y: height * 0.02,
            width: windowWidth,
            height: (windowWidth * 9) / 16,
            radius: 22,
            clip: true,
            lineWidth: 4,
            stroke: new Gradient({
                type: 'linear',
                from: [-windowWidth / 2, -windowWidth / 4],
                to: [windowWidth / 2, windowWidth / 4],
                stops: [GRADIENT_STOPS[0], GRADIENT_STOPS[2], GRADIENT_STOPS[3]].map(([, color], index) => ({ offset: index / 2, color }))
            }),
            shadowColor: 'rgba(36, 75, 255, 0.55)',
            shadowBlur: 90,
            skew: [0, -7],
            scale: [0.94, 1],
            opacity: 0,
            children: [<Img src={still} width={windowWidth} height={(windowWidth * 9) / 16} />]
        });
        this.add(this.window);
        this.text = (
            <Layout layout direction="column" alignItems="start" gap={30} x={-width * 0.24} opacity={0}>
                <Lockup size={104} />
                <Rect layout padding={[16, 30]} radius={999} fill="#0d1424" lineWidth={2.5} stroke={brandGradient(command.length * 22)}>
                    <Txt text={command} fontFamily={FONT_MONO} fontWeight={500} fontSize={34} fill={TEXT.primary} />
                </Rect>
                <Txt text="github.com/ng-prism/ng-prism" fontFamily={FONT_MONO} fontSize={26} fill={TEXT.muted} />
            </Layout>
        ) as Layout;
        this.add(this.text);
    }

    public *show(seconds = 0.6): ThreadGenerator {
        this.window.position.x(this.window.position.x() + 80);
        yield* all(
            this.text.opacity(1, seconds, easeOutCubic),
            this.window.opacity(1, seconds, easeOutCubic),
            this.window.position.x(this.window.position.x() - 80, seconds * 1.4, easeOutCubic)
        );
    }
}
