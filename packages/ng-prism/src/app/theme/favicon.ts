import { BRAND_MARK_SQUARE_VIEWBOX, brandMarkSvg } from '../shared/brand-mark.js';

/** The brand mark as the styleguide's favicon, set at runtime by `PrismThemeService`. */
export const FAVICON_SVG_DATA_URI = `data:image/svg+xml,${encodeURIComponent(brandMarkSvg('fav-', BRAND_MARK_SQUARE_VIEWBOX))}`;
