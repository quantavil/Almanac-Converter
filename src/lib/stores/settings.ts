import { persisted } from './persisted';
export const activeCategory = persisted<string>('almanac.category.v1', 'length');
