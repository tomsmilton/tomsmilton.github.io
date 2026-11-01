// Everything a person might want to change about the site, in one place.
import substack from './data/substack.config.json';

export const site = {
  name: 'Thomas Milton',
  tag: 'tsmilton',
  description: 'Thomas Milton: things made, written and kept.',

  x: 'https://x.com/tsmilton_amodo',
  linkedin: 'https://www.linkedin.com/in/tsmilton/',
  // The previous site, linked top right. TODO: point at wherever the old site ends up being served.
  oldSite: '/old/',

  // Which posts render natively is set in src/data/substack.config.json (used by `npm run sync`).
  substack: { url: substack.publication, native: substack.native },

  // The index on the homepage. Only Quick notes, Photography, Writing and Widgets are live for now; uncomment a section to add it back
  // (it gets a short "coming soon" page until it's built).
  index: [
    // { label: 'Work', href: '/work/' },
    { label: 'Quick notes', href: '/notes/' },
    { label: 'Photography', href: '/photography/' },
    { label: 'Writing', href: '/writing/' },
    { label: 'Widgets', href: '/widgets/' },
    // { label: 'Objects', href: '/objects/' },
    // { label: 'About', href: '/about/' },
  ],

  // The widgets page (/widgets/) lists these as `ls` output, newest first. `name` is how it appears in the listing
  // (end it in / for an app, which shows as a directory); `made` is shown as the date. A widget that lives on another
  // site shows as a symlink to it (`name -> x.com/…`), with a ↗.
  widgets: [
    {
      name: 'simple-cycling-mapper/',
      href: '/simple-cycling-mapper/',
      about: 'Plot a ride, see its climbs, mark the cafés, share it as a link.',
      made: '2026-11-01',
    },
    {
      name: 'bin-day',
      href: '/widgets_dev/bin_day/floras_bins.html',
      about: 'Which bin goes out next? Scraped from the council once a day.',
      made: '2025-03-23',
    },
    {
      name: 'contour-poster',
      href: 'https://contour-poster.apps.amodo.tools/',
      about: 'Turn any place on Earth into a topographic contour poster: find it, frame it, style it, download it.',
      made: '2026-02-14',
    },
    {
      name: 'ukc-leaderboard',
      href: 'https://chromewebstore.google.com/detail/ukc-leaderboard/kgjjgklaoaklkcbacmpmbkbjpgaongbf',
      about: 'A Chrome extension: a most-logged leaderboard on every UKC route, to compete with friends.',
      made: '2025-05-11',
    },
    {
      name: 'hollybush-crack-bot',
      href: 'https://x.com/HollybushCrack',
      about: 'Posts on X every time someone logs Hollybush Crack on UKC.',
      made: '2025-03-02',
    },
  ],
};
