import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://books.dumbhome.uk',
  base: process.env.BASE_PATH || '/',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
