import { defineManifest } from '@crxjs/vite-plugin'

// R5: tanpa `permissions`, tanpa `background` — host access implisit dari matches.
export default defineManifest({
  manifest_version: 3,
  name: 'Treacon — Reader Mode for Threads',
  version: '0.1.0',
  description:
    'Read long Threads self-threads as one clean page. Copy as markdown. Read-only, local-first — no servers, no data collection.',
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  content_scripts: [
    {
      matches: [
        'https://www.threads.com/*',
        'https://threads.com/*',
        'https://www.threads.net/*',
        'https://threads.net/*',
      ],
      js: ['src/content.ts'],
      run_at: 'document_idle',
    },
  ],
})
