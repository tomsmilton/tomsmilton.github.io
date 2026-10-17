import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
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

export const collections = { substack };
