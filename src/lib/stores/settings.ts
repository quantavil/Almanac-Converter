import { persisted } from './persisted';
import type { Notation } from '../format';

export const activeCategory = persisted<string>('almanac.category.v1', 'length');
export const notation = persisted<Notation>('almanac.notation.v1', 'auto');
