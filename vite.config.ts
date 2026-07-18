import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// honor harness-assigned port (e.g. Claude preview); vite ignores PORT by default
	server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
