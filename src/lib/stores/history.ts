import { persisted } from './persisted';

export interface HistoryEntry {
	query: string;
	result: string;
	ts: number;
}

export function pushEntry(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
	if (list[0]?.query === entry.query) return list;
	return [entry, ...list].slice(0, 50);
}

export const history = persisted<HistoryEntry[]>('almanac.history.v1', []);

export function recordHistory(query: string, result: string): void {
	history.update((list) => pushEntry(list, { query, result, ts: Date.now() }));
}

export function clearHistory(): void {
	history.set([]);
}
