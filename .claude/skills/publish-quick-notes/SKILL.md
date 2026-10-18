---
name: publish-quick-notes
description: Publish finished notes from Tom's "Quick notes" Google Doc to the Quick notes page of tsmilton.com. Use when a scheduled run (or Tom) asks to check the Quick notes doc, sync quick notes, or publish notes moved to the Complete tab.
---

# Publish quick notes from the Google Doc

Tom writes quick notes in the Google Doc **Quick notes**
(`1DESAnnD-0V_CJwqlhVmCoSTKz6kabIQsNStKfb8EjSc`). It has two top-level tabs:

- **Drafts**: sub-tabs here are work in progress. Never publish them.
- **Complete**: moving a sub-tab here is Tom's publish button. Each sub-tab is one note;
  the tab title is the note's title.

Notes go to `site/src/content/notes/` and every push to `main` deploys tsmilton.com
(`.github/workflows/deploy.yml`). Notes already published carry `source: "google-doc"` in
their frontmatter; that is the posted log, so running this again never double-posts.

## Steps

1. **Start from the latest `main`.**
   `git fetch origin main && git checkout -B main origin/main`

2. **Export the doc.** Call the Google Drive connector's `download_file_content` tool (its
   full name may be `mcp__Google_Drive__download_file_content` or carry an id in place of
   `Google_Drive`; find it with ToolSearch "google drive download") with
   `fileId: "1DESAnnD-0V_CJwqlhVmCoSTKz6kabIQsNStKfb8EjSc"` and
   `exportMimeType: "application/zip"`. The zip holds every tab's text and images.
   - A large result is saved to a file and the tool tells you the path. Use that path.
   - If the result comes back inline instead, save its `content` string (base64) to a file
     with the Write tool, exactly as returned.
   - Don't use `read_doc` or `read_file_content` for this: they don't carry the images.

3. **Convert.** From `site/`: `npm ci`, then
   `node scripts/sync-quick-notes.mjs <path from step 2>`.
   It prints one line per finished note: `new`, `updated` or `unchanged`.

4. **Nothing new or updated?** Stop here. Don't commit, don't comment, don't edit the doc.

5. **Check it builds.** `npm run build` in `site/`. Read the new note's Markdown file and
   skim it for anything mangled (stray escapes, a lost paragraph). Fix the script, not
   the output, if something is systematically wrong; for a one-off, fix the Markdown.

6. **Publish.** Stage only the notes and their images:
   `git add site/src/content/notes`, commit as
   `Publish quick note: <title>` (or `Publish quick notes: <title>, <title>`), then
   `git push origin HEAD:main`. If the push is rejected because `main` moved, run
   `git pull --rebase origin main` and push again.

7. **Confirm it's live.** The push starts the "Deploy site to GitHub Pages" workflow. If
   the GitHub tools are available, check that the run for your commit succeeds; if it
   fails, read the job log and fix the cause (usually a build error in the new note).
   The note appears at `https://tsmilton.com/notes/<slug>/`.

## What Tom can put in a note

Ordinary Google Docs formatting comes through: paragraphs, bold, italic, links, bulleted
and numbered lists, headings, footnotes, tables and images. The first image becomes the
note's figure (after the first paragraph); later images stay where they are.

A paragraph starting with one of these is read as a setting and left out of the note:

- `Tags: sheffield, silly`: the note's topics
- `Caption: …`: the caption under the first image
- `Date: 2026-10-18`: the note's date (otherwise the day it was first published)

Editing a note that's already in Complete updates it on the site at the next run, keeping
its date. Renaming its tab publishes it as a new note (the old one stays). Moving a tab
back to Drafts does not take it down; delete its file in `site/src/content/notes/` for that.

## Never

- Publish anything from Drafts, or edit, move or delete tabs in the doc.
- Touch notes without `source: "google-doc"`: they were written by hand.
- Push anything but the note files on a scheduled run.
