import { describe, expect, it } from 'vitest';
import { pushEntry, type HistoryEntry } from './history';

const e = (q: string): HistoryEntry => ({ query: q, result: 'r', ts: 1 });

describe('pushEntry', () => {
	it('prepends newest first', () => {
		const out = pushEntry([e('a')], e('b'));
		expect(out.map((x) => x.query)).toEqual(['b', 'a']);
	});
	it('dedupes consecutive identical queries', () => {
		const out = pushEntry([e('a')], e('a'));
		expect(out).toHaveLength(1);
	});
	it('caps at 50', () => {
		const list = Array.from({ length: 50 }, (_, i) => e(String(i)));
		const out = pushEntry(list, e('new'));
		expect(out).toHaveLength(50);
		expect(out[0].query).toBe('new');
	});
});
