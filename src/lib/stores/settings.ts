import { persisted } from './persisted';
import type { Notation } from '../format';

export type Theme = 'auto' | 'light' | 'dark';

export const activeCategory = persisted<string>('almanac.category.v1', 'length');
export const notation = persisted<Notation>('almanac.notation.v1', 'auto');
/** significant digits shown across grid, result card, and siblings */
export const precision = persisted<number>('almanac.precision.v1', 6);
export const theme = persisted<Theme>('almanac.theme.v1', 'auto');
/** pinned unit ids per category, shown first in the grid */
export const pinned = persisted<Record<string, string[]>>('almanac.pinned.v1', {});
