import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import details from '../photos/photos.json';

// Photographs: published ones are committed in src/photos/published/; previews (imported by
// scripts/photos.mjs but not yet chosen) sit in src/photos/preview/, which git ignores, and
// only show on the dev server.
const published = import.meta.glob<{ default: ImageMetadata }>('../photos/published/*.jpg', { eager: true });
const preview = import.meta.glob<{ default: ImageMetadata }>('../photos/preview/*.jpg', { eager: true });

interface Details { roll?: string; frame?: number; date?: string; highlight?: boolean; caption?: string; alt?: string; blank?: boolean }

export interface Photo {
  id: string; // "6707-07": roll 6707, frame 7
  src: ImageMetadata;
  date: Date; // when it was scanned
  roll?: string;
  frame?: number;
  highlight: boolean;
  caption?: string;
  alt: string;
  preview: boolean; // not published yet: dev server only
}

const idOf = (path: string) => path.split('/').pop()!.replace(/\.jpg$/, '');

/** Every photograph to show, newest roll first and in frame order within a roll. */
export function getPhotos(): Photo[] {
  const files = [
    ...Object.entries(published).map(([p, m]) => [p, m, false] as const),
    ...(import.meta.env.DEV ? Object.entries(preview).map(([p, m]) => [p, m, true] as const) : []),
  ];
  const photos = files.flatMap(([path, mod, isPreview]) => {
    const id = idOf(path);
    const d: Details = (details as Record<string, Details>)[id] ?? {};
    if (d.blank) return []; // fogged or blank frames from the ends of a roll
    return [{
      id,
      src: mod.default,
      date: new Date(d.date ?? 0),
      roll: d.roll,
      frame: d.frame,
      highlight: !!d.highlight,
      caption: d.caption,
      alt: d.alt ?? d.caption ?? (d.roll ? `Film photograph, roll ${d.roll}, frame ${d.frame}` : 'Photograph'),
      preview: isPreview,
    }];
  });
  return photos.sort((a, b) => b.date.getTime() - a.date.getTime() || (b.roll ?? '').localeCompare(a.roll ?? '') || (a.frame ?? 0) - (b.frame ?? 0));
}

/** The line under a photo in the viewer: its caption, then roll and scan date. */
export function photoLine(p: Photo): string {
  const when = p.date.getTime() ? p.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const meta = [p.roll && `Roll ${p.roll}`, when].filter(Boolean).join(' · ');
  return [p.caption, meta].filter(Boolean).join(' — ');
}

export type Essay = CollectionEntry<'essays'>;

/** Photo essays, newest first. Drafts show on the dev server only. */
export async function getEssays(): Promise<Essay[]> {
  const essays = await getCollection('essays', (e) => import.meta.env.DEV || !e.data.draft);
  return essays.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** An essay with a `url` links out (or to another page on the site); otherwise it has its own page. */
export const essayHref = (e: Essay) => e.data.url ?? `/photographs/${e.id}/`;
export const isExternalEssay = (e: Essay) => !!e.data.url && /^https?:/.test(e.data.url);
