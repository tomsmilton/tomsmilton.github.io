# tsmilton

Thomas Milton's personal site. Static [Astro](https://docs.astro.build) site, served from GitHub Pages.

## Run it

Needs Node 22.22 or later.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The homepage (desktop grid, and "Phone A" below 980px) |
| `src/pages/writing/` | Writing index, and the page for posts shown natively |
| `src/pages/[section].astro` | Placeholder pages for Work, Photographs, Objects, Notes, About |
| `src/components/` | `PhotoCycle` (the slow film-photo crossfade) and `Author` (the boy, the scribble, the arrows) |
| `src/layouts/Base.astro` | Head, the `tsmilton / …` breadcrumb bar, footer |
| `src/site.config.ts` | Name, social links, the homepage index |
| `src/styles/global.css` | Colour, type and spacing tokens |
| `src/assets/` | Photos and the cut-out (Astro turns them into responsive WebP at build) |

## Writing from Substack

Posts come from [tomsmilton.substack.com](https://tomsmilton.substack.com) and are saved as a snapshot in `src/content/substack.json`, so builds don't depend on Substack being up.

```sh
npm run sync
```

That fetches every public post and rewrites the snapshot. Commit the result. Run it again after publishing something new.

**Most posts link out.** In the writing section they appear in orange with a ↗ and click through to Substack.

**To show a post on the site itself,** add its slug (the end of its Substack URL) to `native` in `src/data/substack.config.json` and run `npm run sync`. The sync then also pulls the full text, and:

- footnotes become margin notes (beside the text on wide screens, folded in on phones)
- embedded Substack posts become plain link cards
- images are downloaded into `public/substack/<slug>/`
- a figure can be replaced with hand-made HTML through `figureOverrides` (the AI-verification table lives in `scripts/overrides/`)

## Quick notes

Short notes live at `/notes/`, one Markdown file each in `src/content/notes/`. To add one, create `src/content/notes/<slug>.md`:

```md
---
title: "Train desk"          # optional
date: 2026-10-06
tags: ["sheffield"]          # each tag gets a page at /notes/topic/<tag>/
image: "./images/photo.jpg"  # optional, kept in src/content/notes/images/
imageAlt: "What the photo shows"
caption: "Shown under the photo"
---

The note itself, in Markdown. Footnotes work too.[^1]

[^1]: Like this.
```

Notes are newest first; `order:` sorts notes from the same day. In the feed, a note longer than three blocks shows its first two and folds the rest behind "Continue reading". Every note also has its own page at `/notes/<slug>/`.

### Publishing notes from the Google Doc

The easier way: write the note as a sub-tab under **Drafts** in the *Quick notes* Google Doc, and when it's done, move the tab under **Complete**. A scheduled Claude session checks the doc, turns each finished tab into a note (the tab title is the note's title, the first image its figure), commits it and pushes to `main`, which deploys it. Its steps are in `.claude/skills/publish-quick-notes/SKILL.md`.

The conversion is `scripts/sync-quick-notes.mjs`, which reads the doc's zipped HTML export (Drive → Download → Web page). Run it by hand with `node scripts/sync-quick-notes.mjs <export.zip>`. Notes it writes carry `source: "google-doc"`; it only ever rewrites those, so hand-written notes are safe. In the doc, a paragraph starting `Tags:`, `Caption:` or `Date:` sets that field instead of appearing in the note.

## Deploying

Every push to `main` deploys to [tsmilton.com](https://tsmilton.com) via `.github/workflows/deploy.yml` at the repo root: it checks out the repo (with submodules), builds this folder with Astro, and publishes `dist/` to GitHub Pages. Pages is set to deploy from **GitHub Actions** (Settings → Pages), and the custom domain `tsmilton.com` is configured there; `public/CNAME` is kept for reference.

## The old site

The previous tsmilton.com lives unchanged in `public/old/` and is published as-is at [tsmilton.com/old/](https://tsmilton.com/old/). Its stylesheet, `public/old/tufte-css`, is a git submodule, so after cloning run:

```sh
git submodule update --init
```

The old page URLs (`/widgets.html`, `/scrapbook.html`, `/outdoor_hottakes.html`) redirect to their `/old/` copies, and old idea links like `tsmilton.com/#melatonin` are sent on to the matching quick note by a few lines on the homepage.

Other `tsmilton.com/<name>/` paths (e.g. `/widgets_dev/`, `/amodo/`) are separate repos with their own GitHub Pages sites and are unaffected by this one.
