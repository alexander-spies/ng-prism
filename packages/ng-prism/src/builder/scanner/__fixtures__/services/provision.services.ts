import { Injectable, Service } from '@angular/core';
import { Showcase } from './showcase.js';

/** A `let`, which the scan does not read, and reassigned so that it stays one. */
let someVariable: 'root' | 'platform' = 'root';

someVariable = 'platform';

@Showcase({ title: 'Auto' })
@Service()
export class AutoService {}

@Showcase({ title: 'Opt out' })
@Service({ autoProvided: false })
export class OptOutService {}

@Showcase({ title: 'Root' })
@Injectable({ providedIn: 'root' })
export class RootService {}

@Showcase({ title: 'Platform' })
@Injectable({ providedIn: 'platform' })
export class PlatformService {}

@Showcase({ title: 'Manual' })
@Injectable()
export class ManualService {}

@Showcase({ title: 'Dynamic' })
@Injectable({ providedIn: someVariable })
export class DynamicService {}
