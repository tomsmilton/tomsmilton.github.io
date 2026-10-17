import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'substack'>;

/** All Substack posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('substack');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Native posts open on this site; everything else goes to Substack. */
export function postHref(post: Post): string {
  return post.data.native ? `/writing/${post.id}/` : post.data.url;
}

export function isExternal(post: Post): boolean {
  return !post.data.native;
}

export function formatDate(date: Date, style: 'long' | 'short' = 'long'): string {
  return date.toLocaleDateString('en-GB', style === 'long'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function readingMinutes(post: Post): number | null {
  return post.data.wordcount ? Math.max(1, Math.round(post.data.wordcount / 230)) : null;
}
