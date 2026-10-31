import { Service } from './fake-di.js';
import { Showcase } from './showcase.js';

@Showcase({ title: 'TypeDI' })
@Service()
export class TypeDiService {}
