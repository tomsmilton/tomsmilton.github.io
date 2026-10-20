import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import * as cheerio from 'cheerio';
import { posix } from 'node:path';

export type Note = CollectionEntry<'notes'>;

/** All quick notes, newest first; notes from the same day keep their `order`. */
export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection('notes');
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.order - b.data.order);
}

export const noteHref = (note: Note) => `/notes/${note.id}/`;
export const tagSlug = (tag: string) => tag.toLowerCase().replace(/&/g, '-and-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const tagHref = (tag: string) => `/notes/topic/${tagSlug(tag)}/`;
export const monthId = (date: Date) => date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase().replace(' ', '-');
export const monthLabel = (date: Date) => date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

/** Every tag in use, with how many notes carry it, most used first. */
export function tagCounts(notes: Note[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const n of notes) for (const t of n.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Every image a note or essay can use, so images inside the text can be optimised like the lead
// one. Keyed by path from the project root (src/content/notes/images/x.jpg).
const images = Object.fromEntries(Object.entries({
  ...import.meta.glob<{ default: ImageMetadata }>('../content/**/*.{jpg,jpeg,png,webp,gif}', { eager: true }),
  // Photographs, so an essay can use them; previews only exist locally.
  ...import.meta.glob<{ default: ImageMetadata }>('../photos/{published,preview}/*.jpg', { eager: true }),
}).map(([path, mod]) => [path.replace(/^\.\.\//, 'src/'), mod.default]));

export interface NoteImage { src: ImageMetadata; alt: string }

/** `./images/x.jpg` as written in an entry at `from` → its image, if it exists. */
function entryImage(src: string, alt: string, from?: string): NoteImage | undefined {
  const hit = from ? images[posix.normalize(posix.join(posix.dirname(from), src))] : undefined;
  if (hit) return { src: hit, alt };
  // Older notes: fall back to the file name.
  const name = src.split('/').pop();
  const byName = Object.entries(images).find(([path]) => path.split('/').pop() === name);
  return byName ? { src: byName[1], alt } : undefined;
}

export type Block =
  | { html: string }
  // A paragraph of nothing but images: one is a figure, more are a gallery.
  // An italic line at its end (`*…*`) is the caption.
  | { images: NoteImage[]; caption?: string }
  // A table whose first header cell is an image: a card for a thing, with its facts.
  | { card: { image: NoteImage; title: string; facts: [string, string][] } };

export interface Body {
  blocks: Block[]; // top-level blocks of the note
  footnotes: string; // the footnotes section, if any
  words: number;
}

/**
 * Splits a note's (or photo essay's) rendered HTML into its top-level blocks, so long
 * notes can be collapsed after a few paragraphs, and picks out the image blocks. Footnote
 * ids are prefixed with the entry's id, so several notes with footnotes can share one page.
 */
export function noteBody(note: { id: string; filePath?: string; rendered?: { html: string } }): Body {
  const html = (note.rendered?.html ?? '').replace(/user-content-fn/g, `${note.id}-fn`);
  const $ = cheerio.load(html, null, false);
  const footnotes = $('section.footnotes, section[data-footnotes]');
  const foot = footnotes.length ? $.html(footnotes) : '';
  footnotes.remove();

  // Images in a note's text render as placeholders holding their src and alt.
  const imageOf = (img: cheerio.Cheerio<any>) => {
    const raw = img.attr('__astro_image_');
    const { src, alt } = raw ? JSON.parse(raw) : { src: img.attr('src') ?? '', alt: img.attr('alt') ?? '' };
    return entryImage(src, alt ?? '', note.filePath);
  };

  const blocks: Block[] = $.root().children().toArray().map((el) => {
    const node = $(el);
    const imgs = node.find('img');
    const em = node.children('em');
    const caption = em.length === 1 && em.is(':last-child') ? em.text().trim() : undefined;
    if (node.is('p') && imgs.length && node.text().trim() === (caption ?? '')) {
      const images = imgs.toArray().map((img) => imageOf($(img))).filter((i) => !!i);
      if (images.length) return { images, caption };
    }
    const lead = node.is('table') ? node.find('thead th').first().find('img') : null;
    if (lead?.length) {
      const image = imageOf(lead);
      if (image) {
        const title = node.find('thead th').eq(1).text().trim();
        const facts = node.find('tbody tr').toArray().map((tr) => {
          const [k, v] = $(tr).children('td').toArray();
          return [$(k).text().trim().replace(/:$/, ''), $(v).html()?.trim() ?? ''] as [string, string];
        });
        return { card: { image, title, facts } };
      }
    }
    return { html: $.html(el) };
  });
  const words = $.root().text().split(/\s+/).filter(Boolean).length;
  return { blocks, footnotes: foot, words };
}
