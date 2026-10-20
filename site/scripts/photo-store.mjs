// Where the photographs live and how a photo is kept or highlighted: shared by
// scripts/photos.mjs and the dev-only picker (integrations/photo-picker.mjs).
//
// A kept photo's file is in src/photos/published/ (committed, goes live); the rest wait in
// src/photos/preview/ (git ignores it). Each photo's details are in src/photos/photos.json.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const ROOT = new URL('../src/photos/', import.meta.url).pathname;
export const PREVIEW = join(ROOT, 'preview');
export const PUBLISHED = join(ROOT, 'published');
export const DATA = join(ROOT, 'photos.json');

export const readData = () => (existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : {});
// Sorted by id so the file diffs cleanly.
export const writeData = (data) => writeFileSync(DATA, JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');

const idsIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.jpg')).map((f) => basename(f, '.jpg')) : []);

/** Every photo there's a file for: { id, kept }. */
export const allPhotos = () => [
  ...idsIn(PUBLISHED).map((id) => ({ id, kept: true })),
  ...idsIn(PREVIEW).map((id) => ({ id, kept: false })),
];

/** The file for a photo, wherever it is. */
export function fileOf(id) {
  for (const dir of [PUBLISHED, PREVIEW]) {
    const f = join(dir, `${id}.jpg`);
    if (existsSync(f)) return f;
  }
  return null;
}

/** Keeps a photo (moves it to published/) or lets it go (back to preview/). Returns whether it moved. */
export function setKept(id, keep) {
  const [from, to] = keep ? [PREVIEW, PUBLISHED] : [PUBLISHED, PREVIEW];
  const src = join(from, `${id}.jpg`);
  if (!existsSync(src)) return false;
  mkdirSync(to, { recursive: true });
  renameSync(src, join(to, `${id}.jpg`));
  return true;
}

/** Ids for `roll:6707` style arguments, or the ids as given. */
export function expand(ids) {
  const all = allPhotos().map((p) => p.id);
  return ids.flatMap((id) => (id.startsWith('roll:') ? all.filter((a) => a.startsWith(`${id.slice(5)}-`)) : [id]));
}
