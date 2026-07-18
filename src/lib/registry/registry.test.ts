import { describe, expect, it } from 'vitest';
import { categories, convert, findUnit, searchUnits } from './index';

const close = (a: number, b: number, eps = 1e-6) =>
	expect(Math.abs(a - b) / Math.max(Math.abs(b), 1)).toBeLessThan(eps);

describe('registry golden values', () => {
	it('1 mile = 1609.344 m', () => close(convert(1, 'length', 'mi', 'm'), 1609.344));
	it('100 °C = 212 °F', () => close(convert(100, 'temperature', 'c', 'f'), 212));
	it('1 bigha = 2529.28 m²', () => close(convert(1, 'area', 'bigha', 'm2'), 2529.28));
	it('1 tola = 11.6638 g', () => close(convert(1, 'mass', 'tola', 'g'), 11.6638));
	it('10 L/100km ≈ 23.5215 MPG (reciprocal)', () =>
		close(convert(10, 'fuelEconomy', 'l100km', 'mpg'), 23.5214583, 1e-4));
	it('1 KiB = 1024 B but 1 kB = 1000 B', () => {
		close(convert(1, 'digital', 'kib', 'b'), 1024);
		close(convert(1, 'digital', 'kb', 'b'), 1000);
	});
});

describe('round-trips', () => {
	it('every linear unit round-trips through its base', () => {
		for (const cat of Object.values(categories)) {
			for (const u of cat.units) {
				close(convert(convert(7.3, cat.id, u.id, cat.units[0].id), cat.id, cat.units[0].id, u.id), 7.3, 1e-9);
			}
		}
	});
});

describe('fuel economy zero guard', () => {
	it('0 mpg converts to NaN, not Infinity crash', () => {
		expect(Number.isFinite(convert(0, 'fuelEconomy', 'mpg', 'l100km'))).toBe(false);
	});
});

describe('lookup', () => {
	it('findUnit resolves aliases case-insensitively', () => {
		expect(findUnit('KM')?.unit.id).toBe('km');
		expect(findUnit('kilometre')?.unit.id).toBe('km');
		expect(findUnit('bogus')).toBeNull();
	});
	it('searchUnits returns ranked matches', () => {
		const r = searchUnits('mile');
		expect(r.length).toBeGreaterThan(0);
		expect(r[0].unit.id).toBe('mi');
	});
});
