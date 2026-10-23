import { Component } from '@angular/core';

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
