// Everything a person might want to change about the site, in one place.
import substack from './data/substack.config.json';

export const site = {
  name: 'Thomas Milton',
  tag: 'tsmilton',
  description: 'Thomas Milton: things made, written and kept.',

  x: 'https://x.com/tsmilton_amodo',
  linkedin: 'https://www.linkedin.com/in/tsmilton/',
  // The previous site, linked top right. TODO: point at wherever the old site ends up being served.
  oldSite: '#',

  // Which posts render natively is set in src/data/substack.config.json (used by `npm run sync`).
  substack: { url: substack.publication, native: substack.native },

  // The index on the homepage. Only Writing is live for now; uncomment a section to add it back
  // (it gets a short "coming soon" page until it's built).
  index: [
    // { label: 'Work', href: '/work/' },
    { label: 'Writing', href: '/writing/' },
    // { label: 'Photographs', href: '/photographs/' },
    // { label: 'Objects', href: '/objects/' },
    // { label: 'Notes', href: '/notes/' },
    // { label: 'About', href: '/about/' },
  ],
};
