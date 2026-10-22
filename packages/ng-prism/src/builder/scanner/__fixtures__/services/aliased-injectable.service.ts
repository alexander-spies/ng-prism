import { Injectable as Service } from '@angular/core';
import { Showcase } from './showcase.js';

/** `Service` here is Angular's `Injectable` under another name. */
@Showcase({ title: 'Aliased injectable' })
@Service({ providedIn: 'root' })
export class AliasedInjectableService {}
