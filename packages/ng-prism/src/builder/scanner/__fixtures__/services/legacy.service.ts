import { Injectable } from '@angular/core';
import { Showcase } from './showcase.js';

@Showcase({ title: 'Legacy page', renderPage: 'LegacyPage' })
@Injectable({ providedIn: 'root' })
export class LegacyPageService {}

@Showcase({ title: 'Legacy page with setup', renderPage: 'LegacyPage', setup: () => [] })
@Injectable({ providedIn: 'root' })
export class LegacySetupService {}
