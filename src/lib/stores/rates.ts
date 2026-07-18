import { writable } from 'svelte/store';

/** true when currency rates came from stale cache or the bundled fallback */
export const ratesStale = writable(false);
