import * as ng from '@angular/core';
import { Showcase } from './showcase.js';

/** Angular's decorators reached through a namespace import. */
@Showcase({ title: 'Namespace injectable' })
@ng.Injectable({ providedIn: 'root' })
export class NamespaceInjectableService {}

@Showcase({ title: 'Namespace service' })
@ng.Service()
export class NamespaceServiceService {}
