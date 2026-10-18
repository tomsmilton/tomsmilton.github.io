// Turns the finished notes in the "Quick notes" Google Doc into quick notes on the site.
//
// The doc has two top-level tabs, Drafts and Complete. Every sub-tab under Complete is a
// note: its tab title is the note's title, its text is the note. This script reads the
// doc's "Web page (.html, zipped)" export (Drive export as application/zip) and writes
// one Markdown file per finished note into src/content/notes/, with its images.
//
//   node scripts/sync-quick-notes.mjs <export>  [--dry-run]
//
// <export> is the zip itself, or the saved Drive download result (JSON whose `content`
// is the zip in base64), or a file holding just the base64.
//
// Notes written by this script carry `source: "google-doc"`, which doubles as the posted
// log: a note already on the site keeps its original date, and is only rewritten if its
// text or images changed in the doc. Notes written by hand are never touched; a doc note
// whose slug clashes with one gets a "-2" slug instead.
//
// Inside a note, a paragraph that starts with "Tags:" sets its tags (comma separated),
// "Caption:" sets the caption under its first image, and "Date: 2026-10-18" overrides the
// date. They're taken out of the text.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import * as cheerio from 'cheerio';

const NOTES = new URL('../src/content/notes/', import.meta.url).pathname;
const IMAGES = join(NOTES, 'images');
const SOURCE = 'google-doc';
const SECTIONS = { complete: 'complete', drafts: 'drafts' };

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const input = args.find((a) => !a.startsWith('--'));
if (!input) {
  console.error('usage: node scripts/sync-quick-notes.mjs <export.zip | saved download result> [--dry-run]');
  process.exit(1);
}

// ---------- unpack the export ----------

function zipBytes(path) {
  const raw = readFileSync(path);
  if (raw[0] === 0x50 && raw[1] === 0x4b) return raw; // "PK": already a zip
  let text = raw.toString('utf8').trim();
  if (text.startsWith('{')) text = JSON.parse(text).content;
  return Buffer.from(text, 'base64');
}

const dir = mkdtempSync(join(tmpdir(), 'quick-notes-'));
writeFileSync(join(dir, 'doc.zip'), zipBytes(input));
try {
  execFileSync('unzip', ['-q', '-o', 'doc.zip'], { cwd: dir });
} catch {
  execFileSync('python3', ['-m', 'zipfile', '-e', 'doc.zip', '.'], { cwd: dir });
}
const htmlFile = readdirSync(dir).find((f) => f.endsWith('.html'));
if (!htmlFile) throw new Error('No .html file in the export; was it exported as application/zip?');
const $ = cheerio.load(readFileSync(join(dir, htmlFile), 'utf8'));

// ---------- markdown from the export's HTML ----------

const styleOf = (el) => $(el).attr('style') ?? '';
const isBold = (s) => /font-weight:\s*(6|7|8|9)00/.test(s);
const isItalic = (s) => /font-style:\s*italic/.test(s);
const isMono = (s) => /font-family:[^;]*(Courier|Mono|Consolas|Source Code)/i.test(s);

const escapeMd = (t) => t.replace(/([\\`*_[\]<>])/g, '\\$1');

/** Google wraps outbound links in https://www.google.com/url?q=…; unwrap them. */
function cleanHref(href) {
  try {
    const u = new URL(href);
    if (u.hostname.endsWith('google.com') && u.pathname === '/url' && u.searchParams.get('q')) return u.searchParams.get('q');
  } catch {}
  return href;
}

// Footnotes sit at the end of the export, after every tab: <a id="ftnt1">[1]</a> text.
const footnoteText = new Map();
$('a[id^="ftnt"]').each((_, a) => {
  const id = $(a).attr('id');
  if (!/^ftnt\d+$/.test(id)) return;
  const p = $(a).closest('p');
  const clone = p.clone();
  clone.find(`a#${id}`).remove();
  footnoteText.set(id, clone);
});
$('a[id^="ftnt"]').closest('div').each((_, d) => { if (!$(d).find('p.title').length) $(d).remove(); });

/**
 * Inline content of a paragraph or list item → { text, images, footnotes }.
 * Images are lifted out of the text (they become their own blocks after it).
 */
function inline(node, note) {
  const images = [];
  let text = '';
  $(node).contents().each((_, child) => {
    if (child.type === 'text') { text += escapeMd($(child).text()); return; }
    if (child.type !== 'tag') return;
    const el = $(child);
    const img = el.is('img') ? el : el.find('img').first();
    if (img.length) {
      images.push({ src: img.attr('src'), alt: (img.attr('alt') ?? '').trim(), title: (img.attr('title') ?? '').trim() });
      return;
    }
    if (el.is('sup') && el.find('a[href^="#ftnt"]').length) {
      const id = el.find('a').attr('href').slice(1);
      if (footnoteText.has(id)) {
        note.footnotes.push(id);
        text += `[^${note.footnotes.length}]`;
      }
      return;
    }
    if (el.is('br')) { text += '  \n'; return; }
    let inner = el.children().length ? inline(child, note) : { text: escapeMd(el.text()), images: [] };
    images.push(...inner.images);
    let t = inner.text;
    if (el.is('a') && el.attr('href')) {
      t = `[${t}](${cleanHref(el.attr('href'))})`;
    } else if (t.trim()) {
      const s = styleOf(child);
      // Keep the spaces outside the markers so `**word **` doesn't break the emphasis.
      const [, lead, core, trail] = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      let c = core;
      if (isMono(s)) c = '`' + c.replace(/\\([\\`*_[\]<>])/g, '$1') + '`';
      else {
        if (isItalic(s)) c = `*${c}*`;
        if (isBold(s)) c = `**${c}**`;
      }
      t = lead + c + trail;
    }
    text += t;
  });
  return { text, images };
}

// A line starting with these would be read as Markdown structure; escape the marker.
const guardLineStart = (t) => t.replace(/^(\s*)([#+-]|\d+[.)])(\s)/, (m, sp, mark, after) => `${sp}\\${mark}${after}`);

function listLevel(el) {
  const m = ($(el).attr('class') ?? '').match(/lst-kix_[^\s-]+-(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** One tab's elements → note { title, blocks[], images[], meta }. */
function buildNote(title, elements) {
  const note = { title, blocks: [], images: [], footnotes: [], meta: {} };
  let list = []; // pending list lines; consecutive lists join into one
  const flushList = () => { if (list.length) { note.blocks.push(list.join('\n')); list = []; } };
  const addImages = (imgs) => { for (const i of imgs) { note.images.push(i); note.blocks.push({ image: note.images.length - 1 }); } };

  for (const el of elements) {
    const node = $(el);
    if (node.is('ul, ol')) {
      const ordered = node.is('ol');
      const level = listLevel(el);
      node.children('li').each((i, li) => {
        const { text, images } = inline(li, note);
        const indent = '   '.repeat(level);
        list.push(`${indent}${ordered ? '1.' : '-'} ${text.trim()}`);
        if (images.length) { flushList(); addImages(images); }
      });
      continue;
    }
    flushList();
    if (node.is('table')) {
      const rows = node.find('tr').toArray().map((tr) => $(tr).children('td, th').toArray()
        .map((td) => $(td).find('p').toArray().map((p) => inline(p, note).text.trim()).filter(Boolean).join(' ').replace(/\|/g, '\\|')));
      if (rows.length) {
        const width = Math.max(...rows.map((r) => r.length));
        const line = (r) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
        note.blocks.push([line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n'));
      }
      continue;
    }
    if (node.is('hr')) { note.blocks.push('***'); continue; }
    if (!node.is('p, h1, h2, h3, h4, h5, h6')) continue;

    const { text, images } = inline(el, note);
    const plain = text.replace(/\\(.)/g, '$1').trim();
    const meta = plain.match(/^(tags?|caption|date)\s*:\s*(.*)$/i);
    if (meta && !node.is('h1, h2, h3, h4, h5, h6')) {
      const key = meta[1].toLowerCase().replace(/s$/, '');
      if (key === 'tag') note.meta.tags = meta[2].split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      else if (key === 'caption') note.meta.caption = meta[2].trim();
      else if (/^\d{4}-\d{2}-\d{2}$/.test(meta[2].trim())) note.meta.date = meta[2].trim();
      addImages(images);
      continue;
    }
    if (text.trim()) {
      const heading = node.is('h1, h2') ? '### ' : node.is('h3, h4, h5, h6') ? '#### ' : '';
      note.blocks.push(heading ? heading + text.replace(/\*\*/g, '').trim() : guardLineStart(text.trim()));
    }
    addImages(images);
  }
  flushList();
  return note;
}

// ---------- split the export into tabs ----------
// Each tab starts with its title as a "title" paragraph, in tab order: a top-level tab,
// then its sub-tabs, then the next top-level tab.

const tabs = [];
let section = null;
let current = null;
$('body').children().each((_, el) => {
  const node = $(el);
  if (node.is('p.title')) {
    const title = node.text().replace(/\s+/g, ' ').trim();
    const key = title.toLowerCase();
    if (key === SECTIONS.complete || key === SECTIONS.drafts) { section = key; current = null; return; }
    current = { title, section, elements: [] };
    tabs.push(current);
    return;
  }
  if (current) current.elements.push(el);
});

const finished = tabs.filter((t) => t.section === SECTIONS.complete);
const drafts = tabs.filter((t) => t.section === SECTIONS.drafts);
if (!tabs.length && !$('p.title').length) throw new Error('No tabs found in the export.');

// ---------- write the notes ----------

const slugify = (t) => t.toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'note';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());

function frontmatterOf(path) {
  const m = readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return fm;
}

const existing = readdirSync(NOTES).filter((f) => f.endsWith('.md')).map((f) => ({ slug: basename(f, '.md'), fm: frontmatterOf(join(NOTES, f)) }));
const bySlug = new Map(existing.map((n) => [n.slug, n]));
const q = (s) => JSON.stringify(s);
const results = [];

for (const tab of finished) {
  const note = buildNote(tab.title, tab.elements);
  if (!note.blocks.some((b) => typeof b === 'string') && !note.images.length) {
    results.push({ status: 'empty, skipped', title: tab.title });
    continue;
  }

  // The doc's own notes reuse their slug; a hand-written note with the same slug is left alone.
  let slug = slugify(tab.title);
  for (let n = 2; bySlug.has(slug) && bySlug.get(slug).fm.source !== SOURCE; n++) slug = `${slugify(tab.title)}-${n}`;
  const prior = bySlug.get(slug);

  const date = note.meta.date ?? prior?.fm.date ?? today;
  let order = Number(prior?.fm.order ?? NaN);
  if (Number.isNaN(order)) {
    // Newest first within a day: a note posted later in the day gets a lower order.
    const sameDay = existing.filter((n) => n.fm.date === date).map((n) => Number(n.fm.order ?? 0));
    order = sameDay.length ? Math.min(...sameDay) - 1 : 0;
  }

  // Images: the first one is the note's figure; any others sit in the text where they were.
  const files = note.images.map((img, i) => {
    const bytes = readFileSync(join(dir, img.src));
    const name = `${slug}${i ? `-${i + 1}` : ''}${extname(img.src).toLowerCase() || '.png'}`;
    return { ...img, bytes, name };
  });
  const alt = (img) => img.alt || img.title || tab.title;

  const body = note.blocks
    .map((b) => (typeof b === 'string' ? b : b.image === 0 ? null : `![${escapeMd(alt(files[b.image]))}](./images/${files[b.image].name})`))
    .filter(Boolean);
  const notes = note.footnotes.map((id, i) => `[^${i + 1}]: ${inline(footnoteText.get(id), { footnotes: [] }).text.trim()}`);

  const fm = [
    `title: ${q(tab.title)}`,
    `date: ${date}`,
    `order: ${order}`,
    `tags: ${q(note.meta.tags ?? [])}`,
    ...(files[0] ? [`image: ${q(`./images/${files[0].name}`)}`, `imageAlt: ${q(alt(files[0]))}`] : []),
    ...(files[0] && (note.meta.caption ?? files[0].title) ? [`caption: ${q(note.meta.caption ?? files[0].title)}`] : []),
    `source: ${q(SOURCE)}`,
  ];
  const md = `---\n${fm.join('\n')}\n---\n${body.join('\n\n')}\n${notes.length ? `\n${notes.join('\n')}\n` : ''}`;

  const path = join(NOTES, `${slug}.md`);
  const sameText = existsSync(path) && readFileSync(path, 'utf8') === md;
  const sameImages = files.every((f) => existsSync(join(IMAGES, f.name)) &&
    createHash('sha256').update(readFileSync(join(IMAGES, f.name))).digest('hex') === createHash('sha256').update(f.bytes).digest('hex'));
  if (sameText && sameImages) {
    results.push({ status: 'unchanged', slug });
    continue;
  }
  if (!dryRun) {
    for (const f of files) writeFileSync(join(IMAGES, f.name), f.bytes);
    writeFileSync(path, md);
  }
  results.push({ status: prior ? 'updated' : 'new', slug, title: tab.title, date });
  bySlug.set(slug, { slug, fm: { source: SOURCE, date, order: String(order) } });
  existing.push({ slug, fm: { date, order: String(order) } });
}

rmSync(dir, { recursive: true, force: true });

for (const r of results) console.log(`${r.status.padEnd(9)} ${r.slug ?? r.title}${r.date ? `  (${r.date})` : ''}`);
console.log(`${finished.length} finished note(s) in the doc, ${drafts.length} draft(s) left alone.${dryRun ? ' Dry run: nothing written.' : ''}`);
