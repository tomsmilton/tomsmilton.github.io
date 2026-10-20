---
title: "An example photo essay"
date: 2026-10-20
dek: "A draft that shows how an essay page is put together. It only appears on the dev server."
cover: "../notes/images/90s-00s-film-cameras-are-the-pinnacle-12.jpg"
coverAlt: "Sea cliffs and old mine engine houses"
draft: true
---
An essay is a Markdown file in `src/content/essays/`. Write it like a quick note: paragraphs of text, and photos wherever they belong. The cover is set at the top of the file, along with the title, the date and an optional line under the title.

Put several photos on consecutive lines, with no blank line between them, and they become a gallery that fills the width and opens full screen:

![A woman in a pink top and headband by the sea](../notes/images/90s-00s-film-cameras-are-the-pinnacle-5.jpg)
![A man building plywood boxes in a workshop](../notes/images/90s-00s-film-cameras-are-the-pinnacle-6.jpg)
![Five people on a sofa under an amodo sign](../notes/images/90s-00s-film-cameras-are-the-pinnacle-7.jpg)
*An italic line straight after the photos is the gallery's caption.*

Published photographs can be used too, by their id: `![Description](../../photos/published/6707-07.jpg)`.

To list an essay that lives somewhere else (Substack, or a quick note) instead of writing it here, give it a `url` and leave the body empty. Remove `draft: true` to publish.
