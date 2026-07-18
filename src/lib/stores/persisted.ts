import { writable, type Writable } from 'svelte/store';

const hasStorage = typeof localStorage !== 'undefined';

export function persisted<T>(key: string, initial: T): Writable<T> {
	let start = initial;
	if (hasStorage) {
		try {
			const raw = localStorage.getItem(key);
			if (raw !== null) start = JSON.parse(raw);
		} catch {
			/* corrupted value — use initial */
		}
	}
	const store = writable<T>(start);
	if (hasStorage) {
		store.subscribe((v) => {
			try {
				localStorage.setItem(key, JSON.stringify(v));
			} catch {
				/* storage full/blocked — non-fatal */
			}
		});
	}
	return store;
}
