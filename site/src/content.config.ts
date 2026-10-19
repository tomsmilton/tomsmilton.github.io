import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Written by `npm run sync` (scripts/sync-substack.mjs) from the Substack archive.
const substack = defineCollection({
  loader: file('src/content/substack.json'),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.coerce.date(),
    url: z.string().url(),
    wordcount: z.number().nullable(),
    bylines: z.array(z.string()),
    native: z.boolean(),
    body: z.string().nullable(),
  }),
});

// Quick notes: one Markdown file per note in src/content/notes/.
const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/notes' }),
  schema: ({ image }) => z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    // Orders notes written on the same day (lower comes first).
    order: z.number().default(0),
    tags: z.array(z.string()).default([]),
    image: image().optional(),
    imageAlt: z.string().optional(),
    caption: z.string().optional(),
    // "cutout" for an object on a transparent background: shown smaller and centred.
    imageStyle: z.enum(['photo', 'cutout']).default('photo'),
    // "google-doc" for notes published from the Quick notes doc by scripts/sync-quick-notes.mjs.
    source: z.string().optional(),
  }),
});

export const collections = { substack, notes };
