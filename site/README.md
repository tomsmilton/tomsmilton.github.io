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

## Before going live

- **Address.** `astro.config.mjs` assumes `https://tsmilton.com`. For a custom domain, also add a `public/CNAME` file containing `tsmilton.com` and point the domain's DNS at GitHub Pages. If it lives at `https://<user>.github.io/<repo>/` instead, set `site` to `https://<user>.github.io` and `base` to `'/<repo>'`.

## Deploying

This site lives in `site/` in the [tomsmilton.github.io](https://github.com/tomsmilton/tomsmilton.github.io) repo, on the branch `october-26-revamp`. The repo's root still holds the old site, which `main` serves at tsmilton.com.

The workflow is at `../.github/workflows/deploy.yml`. It builds `site/` and publishes it on each push to `main`, so it does nothing on this branch. Before merging, decide how the old site is served (for example, at `/old/`). Then, in the repository, go to Settings → Pages and set Source to **GitHub Actions**: today the repo uses the old branch-based Pages.

If you'd rather make `site/` the repository on its own, move the workflow into `site/.github/workflows/` and delete the `path: site` line.
