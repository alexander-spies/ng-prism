import { Injectable } from '@angular/core';
import { Showcase } from './showcase.js';

@Showcase({ title: 'Legacy page', renderPage: 'LegacyPage' })
@Injectable({ providedIn: 'root' })
export class LegacyPageService {}
