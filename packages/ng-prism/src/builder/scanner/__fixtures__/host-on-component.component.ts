import { Component, Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Host on component', host: '<div style="width: 180px;">' })
@Component({ selector: 'lib-host-on', standalone: true, template: '' })
export class HostOnComponent {}

@Showcase({ title: 'Object host on component', host: { selector: 'lib-host', import: { name: 'LibHost', from: 'lib' } } })
@Component({ selector: 'lib-object-host', standalone: true, template: '' })
export class ObjectHostComponent {}

@Showcase({ title: 'Host template on component', host: { template: '<lib-frame><lib-template-host /></lib-frame>' } })
@Component({ selector: 'lib-template-host', standalone: true, template: '' })
export class TemplateHostComponent {}

@Showcase({ title: 'Host template that is no string', host: { template: 42 } })
@Directive({ selector: '[libNoStringHost]', standalone: true })
export class NoStringHostDirective {}

@Showcase({
    title: 'Import names',
    imports: [
        { name: '@angular/cdk/text-field', from: 'CdkTextareaAutosize' },
        { name: 'Cdk.TextareaAutosize', from: '@angular/cdk/text-field' },
        { name: 'default', from: 'lib' },
        { name: 'QuotedDirective', from: "it's" }
    ]
})
@Component({ selector: 'lib-import-names', standalone: true, template: '' })
export class ImportNamesComponent {}

@Showcase({ title: 'Object host that names a module as its class', host: { selector: 'lib-frame', import: { name: 'lib-frame', from: 'lib' } } })
@Directive({ selector: '[libHostImport]', standalone: true })
export class HostImportDirective {}
