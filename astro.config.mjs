// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static', // Static pages with on-demand API routes
  adapter: vercel(),
  trailingSlash: 'never', // API routes don't need trailing slashes
  vite: {
    plugins: [tailwindcss()]
  }
});