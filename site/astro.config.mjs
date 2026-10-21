// @ts-check
import { defineConfig } from 'astro/config';
import photoPicker from './integrations/photo-picker.mjs';

// https://astro.build/config
export default defineConfig({
  // The public URL the site is served from. If it lives at https://<user>.github.io/<repo>/
  // instead of a custom domain, set `site` to https://<user>.github.io and `base` to '/<repo>'.
  site: 'https://tsmilton.com',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Old addresses, kept working.
  redirects: {
    '/photographs': '/photography',
    '/photographs/[essay]': '/photography/[essay]',
  },
  // The dev server's photo chooser at /__photos/ (dev only).
  integrations: [photoPicker()],
});
