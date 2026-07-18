import type { Category } from './types';
import { FALLBACK_RATES } from '../currency/fallback';

const u = (
	id: string,
	name: string,
	symbol: string,
	toBase: number,
	aliases: string[] = []
) => ({ id, name, symbol, toBase, aliases });

/**
 * Currency helper: toBase (USD per unit) is seeded from the bundled rate
 * snapshot so the grid shows sane values before injectRates() runs live rates.
 */
const cur = (id: string, name: string, symbol: string, aliases: string[] = []) => {
	const perUsd = FALLBACK_RATES.rates[symbol];
	return u(id, name, symbol, perUsd ? 1 / perUsd : 1, aliases);
};

export const categoryList: Category[] = [
	{
		id: 'length', label: 'Length', group: 'Common',
		units: [
			u('m', 'Meter', 'm', 1, ['meters', 'metre', 'metres']),
			u('km', 'Kilometer', 'km', 1000, ['kilometers', 'kilometre', 'kms']),
			u('cm', 'Centimeter', 'cm', 0.01, ['centimeters', 'centimetre']),
			u('mm', 'Millimeter', 'mm', 0.001, ['millimeters', 'millimetre']),
			u('mi', 'Mile', 'mi', 1609.344, ['miles', 'mile']),
			u('yd', 'Yard', 'yd', 0.9144, ['yards', 'yard']),
			u('ft', 'Foot', 'ft', 0.3048, ['feet', 'foot']),
			u('inch', 'Inch', 'in', 0.0254, ['inches', 'in']),
			u('nmi', 'Nautical mile', 'nmi', 1852, ['nauticalmile']),
			u('gaj', 'Gaj', 'gaj', 0.9144, []),
			u('hath', 'Hath', 'hath', 0.4572, [])
		]
	},
	{
		id: 'area', label: 'Area', group: 'Regional-heavy',
		units: [
			u('m2', 'Square meter', 'm²', 1, ['sqm', 'm^2', 'sq m']),
			u('km2', 'Square kilometer', 'km²', 1e6, ['sqkm', 'km^2']),
			u('ft2', 'Square foot', 'ft²', 0.09290304, ['sqft', 'ft^2', 'sq ft']),
			u('gajsq', 'Gaj (sq yd)', 'gaj²', 0.83612736, ['sqyd', 'yd^2', 'sqgaj']),
			u('acre', 'Acre', 'ac', 4046.8564224, ['acres']),
			u('hectare', 'Hectare', 'ha', 10000, ['hectares', 'ha']),
			u('bigha', 'Bigha', 'bigha', 2529.28, []),
			u('biswa', 'Biswa', 'biswa', 126.464, []),
			u('kanal', 'Kanal', 'kanal', 505.857, []),
			u('marla', 'Marla', 'marla', 25.29285264, []),
			u('guntha', 'Guntha', 'guntha', 101.17, []),
			u('ground', 'Ground', 'ground', 222.967296, []),
			u('cent', 'Cent', 'cent', 40.468564224, [])
		]
	},
	{
		id: 'mass', label: 'Mass', group: 'Common',
		units: [
			u('kg', 'Kilogram', 'kg', 1, ['kilograms', 'kgs', 'kilo']),
			u('g', 'Gram', 'g', 0.001, ['grams', 'gram']),
			u('mg', 'Milligram', 'mg', 1e-6, ['milligrams']),
			u('tonne', 'Metric ton', 't', 1000, ['ton', 'tons', 'tonnes']),
			u('lb', 'Pound', 'lb', 0.45359237, ['pounds', 'lbs', 'pound']),
			u('oz', 'Ounce', 'oz', 0.028349523125, ['ounces', 'ounce']),
			u('carat', 'Carat', 'ct', 0.0002, ['carats']),
			u('tola', 'Tola', 'tola', 0.0116638, ['tolas']),
			u('maund', 'Maund', 'maund', 37.3242, [])
		]
	},
	{
		id: 'temperature', label: 'Temperature', group: 'Common',
		units: [
			{ id: 'c', name: 'Celsius', symbol: '°C', aliases: ['celsius', 'degc', '°c'],
				toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
			{ id: 'f', name: 'Fahrenheit', symbol: '°F', aliases: ['fahrenheit', 'degf', '°f'],
				toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (v) => ((v - 273.15) * 9) / 5 + 32 },
			{ id: 'k', name: 'Kelvin', symbol: 'K', aliases: ['kelvin'],
				toBase: (v) => v, fromBase: (v) => v },
			{ id: 'r', name: 'Rankine', symbol: '°R', aliases: ['rankine'],
				toBase: (v) => (v * 5) / 9, fromBase: (v) => (v * 9) / 5 }
		]
	},
	{
		id: 'volume', label: 'Volume', group: 'Common',
		units: [
			u('l', 'Liter', 'L', 1, ['liters', 'litre', 'litres']),
			u('ml', 'Milliliter', 'mL', 0.001, ['milliliters', 'millilitre']),
			u('m3', 'Cubic meter', 'm³', 1000, ['m^3', 'cbm']),
			u('gal', 'Gallon (US)', 'gal', 3.785411784, ['gallon', 'gallons']),
			u('qt', 'Quart (US)', 'qt', 0.946352946, ['quart', 'quarts']),
			u('pt', 'Pint (US)', 'pt', 0.473176473, ['pint', 'pints']),
			u('floz', 'Fluid ounce', 'fl oz', 0.0295735295625, ['floz', 'fluidounce']),
			u('cup', 'Cup (US)', 'cup', 0.2365882365, ['cups'])
		]
	},
	{
		id: 'time', label: 'Time', group: 'Common',
		units: [
			u('s', 'Second', 's', 1, ['seconds', 'sec', 'secs']),
			u('min', 'Minute', 'min', 60, ['minutes', 'mins']),
			u('hr', 'Hour', 'h', 3600, ['hours', 'hrs', 'h']),
			u('day', 'Day', 'd', 86400, ['days']),
			u('week', 'Week', 'wk', 604800, ['weeks']),
			u('year', 'Year', 'yr', 31556952, ['years', 'yrs'])
		]
	},
	{
		id: 'digital', label: 'Digital storage', group: 'Digital',
		units: [
			u('bit', 'Bit', 'bit', 0.125, ['bits']),
			u('b', 'Byte', 'B', 1, ['bytes']),
			u('kb', 'Kilobyte (1000)', 'kB', 1e3, ['kilobyte', 'kilobytes']),
			u('mb', 'Megabyte (1000²)', 'MB', 1e6, ['megabyte', 'megabytes']),
			u('gb', 'Gigabyte (1000³)', 'GB', 1e9, ['gigabyte', 'gigabytes']),
			u('tb', 'Terabyte (1000⁴)', 'TB', 1e12, ['terabyte', 'terabytes']),
			u('kib', 'Kibibyte (1024)', 'KiB', 1024, ['kibibyte']),
			u('mib', 'Mebibyte (1024²)', 'MiB', 1048576, ['mebibyte']),
			u('gib', 'Gibibyte (1024³)', 'GiB', 1073741824, ['gibibyte']),
			u('tib', 'Tebibyte (1024⁴)', 'TiB', 1099511627776, ['tebibyte'])
		]
	},
	{
		id: 'speed', label: 'Speed', group: 'Common',
		units: [
			u('ms', 'Meter/second', 'm/s', 1, ['m/s', 'mps']),
			u('kmh', 'Kilometer/hour', 'km/h', 0.2777777777777778, ['km/h', 'kmph', 'kph']),
			u('mph', 'Mile/hour', 'mph', 0.44704, ['mi/h']),
			u('knot', 'Knot', 'kn', 0.5144444444444445, ['knots', 'kt']),
			u('fts', 'Foot/second', 'ft/s', 0.3048, ['ft/s', 'fps'])
		]
	},
	{
		id: 'pressure', label: 'Pressure', group: 'Science',
		units: [
			u('pa', 'Pascal', 'Pa', 1, ['pascal', 'pascals']),
			u('kpa', 'Kilopascal', 'kPa', 1000, ['kilopascal']),
			u('bar', 'Bar', 'bar', 1e5, ['bars']),
			u('psi', 'PSI', 'psi', 6894.757293168, []),
			u('atm', 'Atmosphere', 'atm', 101325, ['atmosphere', 'atmospheres']),
			u('mmhg', 'mmHg', 'mmHg', 133.322387415, ['torr'])
		]
	},
	{
		id: 'energy', label: 'Energy', group: 'Science',
		units: [
			u('j', 'Joule', 'J', 1, ['joules', 'joule']),
			u('kj', 'Kilojoule', 'kJ', 1000, ['kilojoules']),
			u('cal', 'Calorie', 'cal', 4.184, ['calories', 'calorie']),
			u('kcal', 'Kilocalorie', 'kcal', 4184, ['kilocalories', 'kcals']),
			u('wh', 'Watt-hour', 'Wh', 3600, ['watthour']),
			u('kwh', 'Kilowatt-hour', 'kWh', 3.6e6, ['kilowatthour', 'unit']),
			u('btu', 'BTU', 'BTU', 1055.05585262, ['btus'])
		]
	},
	{
		id: 'power', label: 'Power', group: 'Science',
		units: [
			u('w', 'Watt', 'W', 1, ['watts', 'watt']),
			u('kw', 'Kilowatt', 'kW', 1000, ['kilowatts', 'kilowatt']),
			u('mw', 'Megawatt', 'MW', 1e6, ['megawatts']),
			u('hp', 'Horsepower', 'hp', 745.69987158227, ['horsepower'])
		]
	},
	{
		id: 'frequency', label: 'Frequency', group: 'Science',
		units: [
			u('hz', 'Hertz', 'Hz', 1, ['hertz']),
			u('khz', 'Kilohertz', 'kHz', 1e3, ['kilohertz']),
			u('mhz', 'Megahertz', 'MHz', 1e6, ['megahertz']),
			u('ghz', 'Gigahertz', 'GHz', 1e9, ['gigahertz'])
		]
	},
	{
		id: 'angle', label: 'Angle', group: 'Science',
		units: [
			u('deg', 'Degree', '°', 1, ['degrees', 'degree']),
			u('rad', 'Radian', 'rad', 57.29577951308232, ['radians', 'radian']),
			u('grad', 'Gradian', 'gon', 0.9, ['gradians', 'gon']),
			u('arcmin', 'Arcminute', '′', 1 / 60, ['arcminutes']),
			u('arcsec', 'Arcsecond', '″', 1 / 3600, ['arcseconds'])
		]
	},
	{
		id: 'dataRate', label: 'Data rate', group: 'Digital',
		units: [
			u('bps', 'Bit/second', 'bit/s', 1, ['bit/s']),
			u('kbps', 'Kilobit/s', 'kbit/s', 1e3, ['kbit/s']),
			u('mbps', 'Megabit/s', 'Mbit/s', 1e6, ['mbit/s']),
			u('gbps', 'Gigabit/s', 'Gbit/s', 1e9, ['gbit/s']),
			u('mbyps', 'Megabyte/s', 'MB/s', 8e6, ['mb/s'])
		]
	},
	{
		id: 'fuelEconomy', label: 'Fuel economy', group: 'Common', registryOnly: true,
		units: [
			{ id: 'l100km', name: 'L/100km', symbol: 'L/100km', aliases: ['l/100km'],
				toBase: (v) => v, fromBase: (v) => v },
			{ id: 'mpg', name: 'MPG (US)', symbol: 'mpg', aliases: ['mpgus'],
				toBase: (v) => 235.214583 / v, fromBase: (v) => 235.214583 / v },
			{ id: 'kml', name: 'km/L', symbol: 'km/L', aliases: ['km/l', 'kmpl'],
				toBase: (v) => 100 / v, fromBase: (v) => 100 / v }
		]
	},
	{
		id: 'currency', label: 'Currency', group: 'Common',
		// NOT registryOnly: currencies are linear and get registered as real mathjs
		// units by injectRates, so they work in expressions (e.g. 12*3411 inr to usd).
		// toBase = USD per unit; seeded from FALLBACK_RATES, refreshed by injectRates.
		units: [
			cur('usd', 'US Dollar', 'USD', ['$', 'dollar', 'dollars']),
			cur('inr', 'Indian Rupee', 'INR', ['₹', 'rupee', 'rupees', 'rs']),
			cur('eur', 'Euro', 'EUR', ['€', 'euro', 'euros']),
			cur('gbp', 'British Pound', 'GBP', ['£', 'pound sterling']),
			cur('jpy', 'Japanese Yen', 'JPY', ['¥', 'yen']),
			cur('aed', 'UAE Dirham', 'AED', ['dirham']),
			cur('cad', 'Canadian Dollar', 'CAD', []),
			cur('aud', 'Australian Dollar', 'AUD', []),
			cur('cny', 'Chinese Yuan', 'CNY', ['yuan', 'rmb']),
			cur('chf', 'Swiss Franc', 'CHF', ['franc']),
			cur('sgd', 'Singapore Dollar', 'SGD', []),
			cur('hkd', 'Hong Kong Dollar', 'HKD', []),
			cur('nzd', 'New Zealand Dollar', 'NZD', []),
			cur('krw', 'South Korean Won', 'KRW', ['won']),
			cur('brl', 'Brazilian Real', 'BRL', ['real']),
			cur('zar', 'South African Rand', 'ZAR', ['rand']),
			cur('rub', 'Russian Ruble', 'RUB', ['ruble', 'rouble']),
			cur('mxn', 'Mexican Peso', 'MXN', ['peso']),
			cur('try', 'Turkish Lira', 'TRY', ['lira']),
			cur('sek', 'Swedish Krona', 'SEK', ['krona']),
			cur('nok', 'Norwegian Krone', 'NOK', ['krone']),
			cur('dkk', 'Danish Krone', 'DKK', []),
			cur('pln', 'Polish Zloty', 'PLN', ['zloty']),
			cur('thb', 'Thai Baht', 'THB', ['baht']),
			cur('idr', 'Indonesian Rupiah', 'IDR', ['rupiah']),
			cur('myr', 'Malaysian Ringgit', 'MYR', ['ringgit']),
			cur('php', 'Philippine Peso', 'PHP', []),
			cur('sar', 'Saudi Riyal', 'SAR', ['riyal']),
			cur('pkr', 'Pakistani Rupee', 'PKR', []),
			cur('bdt', 'Bangladeshi Taka', 'BDT', ['taka']),
			cur('npr', 'Nepalese Rupee', 'NPR', []),
			cur('lkr', 'Sri Lankan Rupee', 'LKR', []),
			cur('egp', 'Egyptian Pound', 'EGP', []),
			cur('ils', 'Israeli Shekel', 'ILS', ['shekel']),
			cur('twd', 'Taiwan Dollar', 'TWD', [])
		]
	}
];
