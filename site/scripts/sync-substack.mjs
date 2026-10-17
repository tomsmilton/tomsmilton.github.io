// Pull every post from the Substack archive into src/content/substack.json.
// Posts named in src/data/substack.config.json → "native" also get their full body,
// cleaned up for this site: images downloaded locally, footnotes turned into sidenotes,
// Substack's own widgets removed, and optional figure overrides swapped in.
//
//   npm run sync

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'src/data/substack.config.json'), 'utf8'));
const pub = config.publication.replace(/\/$/, '');
const UA = { 'user-agent': 'tsmilton-site-sync (+https://tsmilton.com)' };

async function getJSON(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function archive() {
  const posts = [];
  for (let offset = 0; ; offset += 50) {
    const page = await getJSON(`${pub}/api/v1/archive?sort=new&offset=${offset}&limit=50`);
    posts.push(...page);
    if (page.length < 50) break;
  }
  return posts.filter((p) => p.audience === 'everyone' && p.type === 'newsletter');
}

function largestFromSrcset(srcset) {
  if (!srcset) return null;
  return srcset
    .split(',')
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }))
    .sort((a, b) => b.w - a.w)[0]?.url;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`image ${res.status} for ${url}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function nativeBody(slug) {
  const post = await getJSON(`${pub}/api/v1/posts/${slug}`);
  const $ = cheerio.load(post.body_html, null, false);

  // Substack furniture that makes no sense off-platform.
  $('.subscription-widget-wrap, .subscription-widget, .button-wrapper, .captioned-button-wrap, .share-dialog, .poll-embed, script, style').remove();

  // Embedded Substack posts → a simple link card.
  $('.embedded-post-wrap').each((_, el) => {
    let a = {};
    try { a = JSON.parse($(el).attr('data-attrs') || '{}'); } catch {}
    const url = (a.url || $(el).find('a').attr('href') || '#').split('?')[0];
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $(el).replaceWith(
      `<aside class="embed"><a href="${url}">` +
        `<span class="embed-pub">${esc(a.publication_name)}</span>` +
        `<strong>${esc(a.title)}</strong>` +
        (a.truncated_body_text ? `<span class="embed-text">${esc(a.truncated_body_text)}</span>` : '') +
        `<span class="embed-cta">Read on Substack ↗</span></a></aside>`,
    );
  });

  // Footnotes → sidenotes placed right after their reference.
  const notes = {};
  $('div.footnote').each((_, el) => {
    const n = $(el).find('a.footnote-number').first().text().trim();
    notes[n] = $(el).find('.footnote-content').html() ?? '';
  });
  $('div.footnote').remove();
  $('a.footnote-anchor').each((_, el) => {
    const n = $(el).text().trim();
    const content = (notes[n] ?? '').replace(/<\/?p[^>]*>/g, ' ').trim();
    $(el).replaceWith(
      `<sup class="fn-ref" id="fnref-${n}"><a href="#fn-${n}">${n}</a></sup>` +
        `<span class="sidenote" id="fn-${n}"><sup>${n}</sup> ${content}</span>`,
    );
  });

  // Figures: download the image, or swap in a hand-made override.
  const overrides = config.figureOverrides?.[slug] ?? {};
  let i = 0;
  for (const fig of $('figure').toArray()) {
    i += 1;
    if (overrides[String(i)]) {
      $(fig).replaceWith(await readFile(path.join(root, overrides[String(i)]), 'utf8'));
      continue;
    }
    const img = $(fig).find('img').first();
    if (!img.length) continue;
    const src = largestFromSrcset($(fig).find('source').attr('srcset')) || img.attr('src');
    const ext = (src.match(/\.(png|jpe?g|gif|webp)(?:$|\?)/i)?.[1] || 'jpg').toLowerCase();
    const rel = `/substack/${slug}/figure-${i}.${ext}`;
    await download(src, path.join(root, 'public', rel));
    const caption = $(fig).find('figcaption').html();
    $(fig).replaceWith(
      `<figure><img src="${rel}" alt="${(img.attr('alt') || '').replace(/"/g, '&quot;')}" loading="lazy">` +
        (caption ? `<figcaption>${caption}</figcaption>` : '') +
        `</figure>`,
    );
  }

  const html = sanitizeHtml($.html(), {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'em', 'strong', 'sup', 'sub', 'span', 'br', 'hr',
      'figure', 'figcaption', 'img', 'aside', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'q', 'small', 'code', 'pre'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'loading'],
      sup: ['class', 'id'],
      span: ['class', 'id'],
      figure: ['class'],
      aside: ['class'],
      table: ['class'],
      th: ['scope'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      a: (tag, attribs) => {
        const external = /^https?:/.test(attribs.href || '');
        return { tagName: 'a', attribs: external ? { ...attribs, rel: 'noopener' } : attribs };
      },
    },
  });
  return html.replace(/<p>\s*<\/p>/g, '');
}

const config_native = new Set(config.native);
const posts = await archive();
const out = [];
for (const p of posts) {
  const native = config_native.has(p.slug);
  out.push({
    id: p.slug,
    title: p.title,
    subtitle: p.subtitle || '',
    date: p.post_date,
    url: p.canonical_url,
    wordcount: p.wordcount ?? null,
    bylines: (p.publishedBylines || []).map((b) => b.name),
    native,
    body: native ? await nativeBody(p.slug) : null,
  });
  console.log(`${native ? 'native' : 'link  '}  ${p.post_date.slice(0, 10)}  ${p.title}`);
}
await mkdir(path.join(root, 'src/content'), { recursive: true });
await writeFile(path.join(root, 'src/content/substack.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`\n${out.length} posts → src/content/substack.json`);
if (!existsSync(path.join(root, 'public/substack'))) console.log('(no images downloaded)');
