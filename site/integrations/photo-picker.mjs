// A page on the dev server for choosing photographs: http://localhost:4321/__photos/
//
// Every imported frame, roll by roll. Click a photo to keep it (its file moves to
// src/photos/published/, which is committed and goes live) or let it go (back to
// src/photos/preview/); ★ marks a highlight in src/photos/photos.json. It only exists on
// the dev server and is never built into the site.
//
// The page itself is plain HTML (photo-picker.html), served here rather than by Astro, so
// the dev server's reloads (every choice changes files under src/) don't interrupt it.

import { execFile } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, closeSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { allPhotos, fileOf, readData, setKept, writeData } from '../scripts/photo-store.mjs';

const run = promisify(execFile);
const PAGE = new URL('./photo-picker.html', import.meta.url).pathname;
const CACHE = new URL('../node_modules/.cache/photo-picker/', import.meta.url).pathname;
const ID = /^[a-z0-9-]+$/;

/** Width and height of a JPEG, from its frame header. */
function jpegSize(path) {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(256 * 1024);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  let i = 2;
  while (i < n - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 3, h: 2 };
}

const sizes = new Map();
const sizeOf = (id) => {
  if (!sizes.has(id)) sizes.set(id, jpegSize(fileOf(id)));
  return sizes.get(id);
};

function list() {
  const data = readData();
  return allPhotos().map(({ id, kept }) => {
    const d = data[id] ?? {};
    return { id, kept, roll: d.roll ?? id.split('-')[0], frame: d.frame ?? null, date: d.date ?? null, highlight: !!d.highlight, blank: !!d.blank, ...sizeOf(id) };
  }).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.roll.localeCompare(a.roll) || (a.frame ?? 0) - (b.frame ?? 0));
}

/** Keep or highlight one photo. A highlight is always kept; letting a photo go clears its highlight. */
function update(id, { keep, highlight }) {
  const data = readData();
  const d = (data[id] ??= {});
  if (highlight === true) keep = true;
  if (keep === false) d.highlight = false;
  if (typeof keep === 'boolean') {
    setKept(id, keep);
    if (keep && d.blank) d.blank = false; // chosen on purpose
  }
  // A numbered highlight keeps its place in the order.
  if (typeof highlight === 'boolean') d.highlight = highlight && typeof d.highlight === 'number' ? d.highlight : highlight;
  if (!d.highlight) delete d.highlight;
  writeData(data);
  return list().find((p) => p.id === id);
}

// Small copies for the grid, made on first request; a few at a time.
let running = 0;
const waiting = [];
async function thumb(id) {
  const out = join(CACHE, `${id}.jpg`);
  if (existsSync(out)) return out;
  if (running >= 6) await new Promise((r) => waiting.push(r));
  running++;
  try {
    mkdirSync(CACHE, { recursive: true });
    if (!existsSync(out)) await run('magick', [fileOf(id), '-resize', '600x600', '-quality', '78', '-strip', out]);
  } finally {
    running--;
    waiting.shift()?.();
  }
  return out;
}

function sendFile(res, path) {
  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': statSync(path).size, 'Cache-Control': 'no-cache' });
  createReadStream(path).pipe(res);
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function handle(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/__photos/, '') || '/';
  try {
    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(PAGE, 'utf8'));
    }
    if (path === '/api/photos' && req.method === 'GET') return json(res, 200, list());

    const m = path.match(/^\/(api\/photos|thumb|full)\/([^/]+?)(?:\.jpg)?$/);
    if (!m || !ID.test(m[2]) || !fileOf(m[2])) return json(res, 404, { error: 'No such photo' });
    const [, kind, id] = m;
    if (kind === 'thumb' && req.method === 'GET') return sendFile(res, await thumb(id));
    if (kind === 'full' && req.method === 'GET') return sendFile(res, fileOf(id));
    if (kind === 'api/photos' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      return json(res, 200, update(id, JSON.parse(body || '{}')));
    }
    return json(res, 405, { error: 'Not allowed' });
  } catch (err) {
    console.error('[photo-picker]', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}

export default function photoPicker() {
  return {
    name: 'photo-picker',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        server.middlewares.use((req, res, next) => (req.url?.startsWith('/__photos') ? handle(req, res, next) : next()));
        logger.info('Choose photographs at /__photos/');
      },
    },
  };
}
