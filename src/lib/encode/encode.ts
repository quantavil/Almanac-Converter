// Text encodings: Base64, URL percent-encoding, and hex. All Unicode-safe via
// TextEncoder/TextDecoder so emoji and non-Latin text round-trip correctly.
// Encoders return a string; decoders return null on malformed input.

export function textToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

export function base64ToText(b64: string): string | null {
	try {
		const binary = atob(b64.trim());
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	} catch {
		return null;
	}
}

export function textToUrl(text: string): string {
	return encodeURIComponent(text);
}

export function urlToText(s: string): string | null {
	try {
		return decodeURIComponent(s.trim());
	} catch {
		return null;
	}
}

export function textToHex(text: string): string {
	const bytes = new TextEncoder().encode(text);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToText(hex: string): string | null {
	const clean = hex.trim().replace(/\s+/g, '').replace(/^0x/i, '');
	if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) return null;
	const bytes = new Uint8Array(clean.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	}
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}
