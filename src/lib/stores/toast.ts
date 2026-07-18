import { writable } from 'svelte/store';

export const toast = writable<string | null>(null);
let timer: ReturnType<typeof setTimeout>;

export function showToast(msg: string): void {
	toast.set(msg);
	clearTimeout(timer);
	timer = setTimeout(() => toast.set(null), 2000);
}
