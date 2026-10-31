import { parseTemplate } from '@angular/compiler';

/** What Angular's template parser rejects in `template`, as messages. An empty list means the AOT compiler takes it. */
export function templateErrors(template: string): string[] {
    return (parseTemplate(template, 'prism-host.html').errors ?? []).map((error) => error.msg);
}
