import { InjectionToken } from '@angular/core';
import type { PerfPluginOptions } from './perf.types.js';

/** @deprecated Deprecated since 22.6.0, removed in 23.0.0. It has never had an effect: nothing reads it. Nothing provides it either. */
export const PERF_PLUGIN_CONFIG = new InjectionToken<PerfPluginOptions>('PERF_PLUGIN_CONFIG');
