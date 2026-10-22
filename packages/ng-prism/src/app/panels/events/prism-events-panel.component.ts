import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { RuntimeComponent } from '../../../plugin/plugin.types.js';
import { PrismEventLogService } from '../../services/prism-event-log.service.js';
import { PrismJsonNodeComponent } from './prism-json-node.component.js';
import { isEmptyPayload } from './prism-json-node.utils.js';

@Component({
    selector: 'prism-events-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismJsonNodeComponent],
    templateUrl: './prism-events-panel.component.html',
    styleUrl: './prism-events-panel.component.css'
})
export class PrismEventsPanelComponent {
    protected readonly eventLogService = inject(PrismEventLogService);

    readonly activeComponent = input<RuntimeComponent | null>(null);

    protected readonly isEmptyPayload = isEmptyPayload;

    protected formatTime(ts: number): string {
        const d = new Date(ts);

        return d.toLocaleTimeString('en-US', {
            hour12: false,
            fractionalSecondDigits: 3
        });
    }

    protected padIdx(n: number): string {
        return String(n).padStart(3, '0');
    }
}
