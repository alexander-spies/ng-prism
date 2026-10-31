import { Component } from '@angular/core';
import { Showcase } from './showcase.js';

@Showcase({ title: 'Setup on component', setup: () => [] })
@Component({ selector: 'setup-on-component', standalone: true, template: '' })
export class SetupOnComponent {}
