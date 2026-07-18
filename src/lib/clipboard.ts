/**
 * Safely copies text to the clipboard, falling back to a textarea element
 * if the modern navigator.clipboard API is unavailable (e.g. in insecure HTTP contexts).
 */
export async function copyText(text: string): Promise<boolean> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			// fallback if the promise rejects
		}
	}

	// Fallback implementation for insecure contexts / older browsers
	const textArea = document.createElement('textarea');
	textArea.value = text;
	// Prevent scrolling to bottom in some browsers
	textArea.style.top = '0';
	textArea.style.left = '0';
	textArea.style.position = 'fixed';
	textArea.style.opacity = '0';
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	let successful = false;
	try {
		successful = document.execCommand('copy');
	} catch (err) {
		successful = false;
	}
	document.body.removeChild(textArea);
	return successful;
}
