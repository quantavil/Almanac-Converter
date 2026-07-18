import { writable } from 'svelte/store';
import type { RatesInfo } from '../currency/currency';

export const ratesInfo = writable<RatesInfo | null>(null);
