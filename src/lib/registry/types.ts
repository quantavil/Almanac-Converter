export interface Unit {
	id: string;
	name: string;
	symbol: string;
	aliases: string[];
	/** number: multiply value by this to get base units. functions: non-linear. */
	toBase: number | ((v: number) => number);
	fromBase?: (v: number) => number; // required when toBase is a function
}

export interface Category {
	id: string;
	label: string;
	group: 'Common' | 'Science' | 'Digital' | 'Regional-heavy';
	/** true = engine must not send these to mathjs (reciprocal/currency handled locally) */
	registryOnly?: boolean;
	units: Unit[];
}
