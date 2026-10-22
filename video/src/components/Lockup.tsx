import { Img, Layout, Txt, type LayoutProps } from '@revideo/2d';
import symbol from '../../../docs/assets/brand/ng-prism-symbol.svg';
import { FONT_SANS } from '../brand.ts';
import { brandGradient } from './brand-paint.ts';

export interface LockupProps extends LayoutProps {
    /** Cap height of the wordmark in px. */
    size?: number;
}

/** The prism symbol and the "ng-prism" wordmark in the brand gradient, as in docs/assets/brand/cover.html. */
export function Lockup({ size = 96, ...props }: LockupProps) {
    return (
        <Layout layout direction="row" alignItems="center" gap={size * 0.22} {...props}>
            <Img src={symbol} height={size * 0.96} shadowColor="rgba(7, 139, 250, 0.5)" shadowBlur={size * 0.28} />
            <Txt text="ng-prism" fontFamily={FONT_SANS} fontWeight={800} fontSize={size} letterSpacing={-size * 0.045} fill={brandGradient(size * 4.2)} />
        </Layout>
    );
}
