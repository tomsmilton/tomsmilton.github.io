// Manages the photographs on /photography/.
//
//   node scripts/photos.mjs import <folder or files…> [--force]
//   node scripts/photos.mjs publish <id… | roll:6707>
//   node scripts/photos.mjs unpublish <id… | roll:6707>
//
// `import` resizes scans (2400px on the long edge, metadata stripped) into src/photos/preview/,
// which git ignores: previews show on the dev server only, so you can see them in place before
// choosing. `publish` moves the chosen ones into src/photos/published/, which is committed and
// goes live. Lab scans are named by roll and frame (000067070007.jpg is roll 6707, frame 7), so a
// photo's id is "6707-07".
//
// Each photo's details live in src/photos/photos.json, keyed by id. The script fills in roll,
// frame and date (the scan date), and marks near-featureless frames (the fogged or blank ones at
// the ends of a roll) "blank": true so they're left off the page; set it to false to keep one.
// Add "highlight": true to show a photo in Recent highlights, "caption" / "alt" to describe it, and
// "rotate": 90 (degrees clockwise) for a scan that came back sideways; re-import with --force to apply.
//
// Or choose on the dev server, at /__photos/ (integrations/photo-picker.mjs).
//
// Needs ImageMagick (`magick`) for import.

import { execFile } from 'node:child_process';
import { cpus } from 'node:os';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PREVIEW, PUBLISHED, readData, writeData, setKept, expand } from './photo-store.mjs';

const run = promisify(execFile);
const SIZE = 2400;
// Below this contrast (standard deviation of a small greyscale copy) a frame is blank or fogged.
const BLANK = 0.09;

const [command, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const args = rest.filter((a) => !a.startsWith('--'));

/** 000067070007.jpg or 20260430_000065320006.jpg → { roll: "6707", frame: 7 }. */
function rollAndFrame(file) {
  const m = basename(file, extname(file)).match(/(\d{4})(\d{4})$/);
  return m ? { roll: String(Number(m[1])), frame: Number(m[2]) } : null;
}

function idOf(file) {
  const rf = rollAndFrame(file);
  if (rf) return `${rf.roll}-${String(rf.frame).padStart(2, '0')}`;
  return basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function contrast(file) {
  const { stdout } = await run('magick', [file, '-resize', '64x64!', '-colorspace', 'gray', '-format', '%[fx:standard_deviation]', 'info:']);
  return Number(stdout);
}

async function scanDate(file) {
  try {
    const { stdout } = await run('magick', ['identify', '-format', '%[EXIF:DateTimeOriginal]|%[EXIF:DateTime]', `${file}[0]`]);
    const m = stdout.match(/(\d{4}):(\d{2}):(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  } catch {}
  return statSync(file).mtime.toISOString().slice(0, 10);
}

/** Runs `fn` over `items`, a few at a time. */
async function pool(items, fn, size = Math.max(2, cpus().length - 2)) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

async function importPhotos(inputs) {
  const files = inputs.flatMap((p) => {
    const abs = resolve(p);
    return statSync(abs).isDirectory() ? readdirSync(abs).map((f) => join(abs, f)) : [abs];
  }).filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f)).sort();
  if (!files.length) throw new Error('No images found.');

  mkdirSync(PREVIEW, { recursive: true });
  const data = readData();
  let done = 0, skipped = 0;
  await pool(files, async (file) => {
    const id = idOf(file);
    const out = join(PREVIEW, `${id}.jpg`);
    const live = join(PUBLISHED, `${id}.jpg`);
    if (!force && (existsSync(out) || existsSync(live))) { skipped++; }
    else {
      // A scan that came back sideways carries "rotate" (degrees clockwise) in photos.json.
      const turn = data[id]?.rotate ? ['-rotate', String(data[id].rotate)] : [];
      await run('magick', [`${file}[0]`, '-auto-orient', ...turn, '-resize', `${SIZE}x${SIZE}>`, '-strip', '-quality', '84', '-interlace', 'JPEG', out]);
      done++;
    }
    const rf = rollAndFrame(file);
    data[id] = { ...(rf ?? {}), date: data[id]?.date ?? await scanDate(file), source: basename(file), ...data[id] };
    if (data[id].blank === undefined && await contrast(existsSync(out) ? out : live) < BLANK) data[id].blank = true;
    if ((done + skipped) % 25 === 0) process.stdout.write(`  ${done + skipped}/${files.length}\n`);
  });
  writeData(data);
  console.log(`Imported ${done} photo(s) to src/photos/preview/ (${skipped} already there). They show on the dev server only until published.`);
}

function move(ids, keep) {
  let n = 0;
  for (const id of expand(ids)) {
    if (setKept(id, keep)) n++;
    else console.warn(`  ${id}: not found in ${keep ? 'preview' : 'published'}/`);
  }
  console.log(`${keep ? 'Published' : 'Unpublished'} ${n} photo(s).`);
}

if (command === 'import' && args.length) await importPhotos(args);
else if (command === 'publish' && args.length) move(args, true);
else if (command === 'unpublish' && args.length) move(args, false);
else {
  console.error('usage: node scripts/photos.mjs import <folder|files…> [--force] | publish <id…|roll:N> | unpublish <id…|roll:N>');
  process.exit(1);
}
