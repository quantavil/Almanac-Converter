interface BaseUnit {
	id: string;
	name: string;
	symbol: string;
	aliases: string[];
}

export interface LinearUnit extends BaseUnit {
	toBase: number;
	fromBase?: never;
}

export interface NonLinearUnit extends BaseUnit {
	toBase: (v: number) => number;
	fromBase: (v: number) => number;
}

export type Unit = LinearUnit | NonLinearUnit;


export interface Category {
	id: string;
	label: string;
	group: 'Common' | 'Science' | 'Digital' | 'Regional-heavy';
	/** true = engine must not send these to mathjs (reciprocal/currency handled locally) */
	registryOnly?: boolean;
	units: Unit[];
}
