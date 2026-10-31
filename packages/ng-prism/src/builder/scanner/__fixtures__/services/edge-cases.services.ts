import { Directive, Injectable, NgModule, Service } from '@angular/core';
import { Showcase } from './showcase.js';

const PROVIDED_IN = 'any';
const SHARED = { variants: [{ name: 'Default' }] };
const OPT_OUT = { autoProvided: false };
let flag = false;

flag = !flag;

@NgModule({})
class ToastModule {}

@Showcase({ title: 'Constant provision' })
@Injectable({ providedIn: PROVIDED_IN })
export class ConstantProvidedService {}

@Showcase({ title: 'Module provision' })
@Injectable({ providedIn: ToastModule })
export class ModuleProvidedService {}

@Showcase({ title: 'Opt out by constant' })
@Service(OPT_OUT)
export class ConstantOptOutService {}

@Showcase({ title: 'Opt out by variable' })
@Service({ autoProvided: flag })
export class VariableOptOutService {}

@Showcase({ title: 'Factory' })
@Service({ factory: () => ({}) })
export class FactoryService {}

@Showcase({ title: 'Spread field', ...SHARED })
@Injectable({ providedIn: 'root' })
export class SpreadFieldService {}

@Showcase({ title: 'Imports', imports: [{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' }] })
@Injectable({ providedIn: 'root' })
export class ImportsService {}

@Showcase({ title: 'Field by constant', variants: SHARED.variants, bg: 'dark' })
@Injectable({ providedIn: 'root' })
export class LiteralFieldsService {}

@Showcase({ title: 'Field it cannot read', bg: flag ? 'dark' : 'light', setup: () => [] })
@Injectable({ providedIn: 'root' })
export class UnreadableFieldService {}

@Showcase({ title: 'Bare' })
@Injectable()
export class BareShowcaseService {}

@Showcase({ title: 'Directive and injectable' })
@Directive({ selector: '[edge]', standalone: true })
@Injectable({ providedIn: 'root' })
export class DirectiveService {}

export { AliasedInjectableService } from './aliased-injectable.service.js';
export { NamespaceInjectableService, NamespaceServiceService } from './namespace-import.service.js';
