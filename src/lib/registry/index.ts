import { categoryList } from './data';
import type { Category, Unit, NonLinearUnit } from './types';

export const categories: Record<string, Category> = Object.fromEntries(
	categoryList.map((c) => [c.id, c])
);
export { categoryList };
export type { Category, Unit };

function isNonLinear(u: Unit): u is NonLinearUnit {
	return typeof u.toBase === 'function';
}

function toBase(u: Unit, v: number): number {
	return isNonLinear(u) ? u.toBase(v) : v * u.toBase;
}
function fromBase(u: Unit, v: number): number {
	return isNonLinear(u) ? u.fromBase(v) : v / u.toBase;
}

export function convert(value: number, categoryId: string, fromId: string, toId: string): number {
	const cat = categories[categoryId];
	const from = cat.units.find((x) => x.id === fromId)!;
	const to = cat.units.find((x) => x.id === toId)!;
	return fromBase(to, toBase(from, value));
}

export interface UnitRef { category: Category; unit: Unit }

/** Exact match on id, symbol, name, or alias — case-insensitive. */
export function findUnit(token: string): UnitRef | null {
	const q = token.trim().toLowerCase();
	if (!q) return null;
	for (const category of categoryList) {
		for (const unit of category.units) {
			if (
				unit.id === q ||
				unit.symbol.toLowerCase() === q ||
				unit.name.toLowerCase() === q ||
				unit.aliases.some((a) => a.toLowerCase() === q)
			)
				return { category, unit };
		}
	}
	return null;
}

/** Ranked substring search over names/symbols/aliases for the suggestions dropdown. */
export function searchUnits(query: string, limit = 6): UnitRef[] {
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];
	const scored: { ref: UnitRef; score: number }[] = [];
	for (const category of categoryList) {
		for (const unit of category.units) {
			const hay = [unit.name, unit.symbol, unit.id, ...unit.aliases].map((s) => s.toLowerCase());
			let score = 0;
			if (hay.some((h) => h === q)) score = 3;
			else if (hay.some((h) => h.startsWith(q))) score = 2;
			else if (hay.some((h) => h.includes(q))) score = 1;
			if (score) scored.push({ ref: { category, unit }, score });
		}
	}
	return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.ref);
}
