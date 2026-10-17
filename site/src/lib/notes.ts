import { getCollection, type CollectionEntry } from 'astro:content';
import * as cheerio from 'cheerio';

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

export interface Body {
  blocks: string[]; // top-level blocks of the note, as HTML
  footnotes: string; // the footnotes section, if any
  words: number;
}

/**
 * Splits a note's rendered HTML into its top-level blocks, so long notes can be
 * collapsed after a few paragraphs. Footnote ids are prefixed with the note's id,
 * so several notes with footnotes can share one page.
 */
export function noteBody(note: Note): Body {
  const html = (note.rendered?.html ?? '').replace(/user-content-fn/g, `${note.id}-fn`);
  const $ = cheerio.load(html, null, false);
  const footnotes = $('section.footnotes, section[data-footnotes]');
  const foot = footnotes.length ? $.html(footnotes) : '';
  footnotes.remove();
  const blocks = $.root().children().toArray().map((el) => $.html(el));
  const words = $.root().text().split(/\s+/).filter(Boolean).length;
  return { blocks, footnotes: foot, words };
}
