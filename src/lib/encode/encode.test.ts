import { describe, it, expect } from 'vitest';
import {
	textToBase64,
	base64ToText,
	textToUrl,
	urlToText,
	textToHex,
	hexToText
} from './encode';

describe('base64', () => {
	it('round-trips ASCII and Unicode', () => {
		expect(textToBase64('hello')).toBe('aGVsbG8=');
		expect(base64ToText('aGVsbG8=')).toBe('hello');
		const emoji = 'héllo 👋';
		expect(base64ToText(textToBase64(emoji))).toBe(emoji);
	});
	it('returns null on malformed base64', () => {
		expect(base64ToText('!!!not base64!!!')).toBeNull();
	});
});

describe('url', () => {
	it('percent-encodes and decodes', () => {
		expect(textToUrl('a b&c')).toBe('a%20b%26c');
		expect(urlToText('a%20b%26c')).toBe('a b&c');
	});
	it('returns null on malformed escape', () => {
		expect(urlToText('%')).toBeNull();
	});
});

describe('hex', () => {
	it('round-trips text', () => {
		expect(textToHex('hi')).toBe('6869');
		expect(hexToText('6869')).toBe('hi');
		expect(hexToText('0x6869')).toBe('hi');
	});
	it('returns null on odd length, bad chars, or invalid UTF-8', () => {
		expect(hexToText('abc')).toBeNull();
		expect(hexToText('zz')).toBeNull();
		expect(hexToText('ff')).toBeNull(); // lone 0xff is not valid UTF-8
	});
});
