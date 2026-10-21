import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';

export type NavigationItem =
    | { kind: 'component'; data: RuntimeComponent }
    | { kind: 'service'; data: RuntimeService }
    | { kind: 'pipe'; data: RuntimePipe }
    | { kind: 'page'; data: StyleguidePage };
