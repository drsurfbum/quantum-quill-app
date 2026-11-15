export type WordSense = {
  id: string; lemma: string; pos: string; definition: string;
  examples: string[]; synonyms: string[]; antonyms: string[];
  related: Record<string, string[]>;
};
export const WORDNET_ROOT = '/wordnet/2025-v1';
export function normalizeWord(word: string) {
  return word.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ');
}
export function wordBucket(word: string) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(normalizeWord(word))) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return (hash & 255).toString(16).padStart(2, '0');
}
export function validWordQuery(word: string) {
  return word.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M}\d'’‘ .-]*$/u.test(word.trim());
}
type Shard = Record<string, WordSense[]>;
// Bounded memory, no localStorage, analytics, provider requests, or query in URLs.
const cache = new Map<string, Shard>();
export async function lookupWord(query: string, signal?: AbortSignal): Promise<WordSense[]> {
  if (!validWordQuery(query)) throw new Error('Enter an English word or short expression (up to 80 characters).');
  const word = normalizeWord(query), bucket = wordBucket(word);
  let shard = cache.get(bucket);
  if (shard) { cache.delete(bucket); cache.set(bucket, shard); }
  else {
    if (typeof DecompressionStream === 'undefined') throw new Error('Word Finder needs a newer browser to open its dictionary. Your writing is unaffected.');
    const response = await fetch(`${WORDNET_ROOT}/${bucket}.json.gz`, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok || !response.body) throw new Error('The dictionary could not load. Please try again.');
    // Some hosts transparently decompress .gz assets; support either form.
    const bytes = new Uint8Array(await response.arrayBuffer());
    const blob = new Blob([bytes]);
    const text = bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
      : await blob.text();
    shard = JSON.parse(text) as Shard;
    signal?.throwIfAborted();
    cache.set(bucket, shard);
    while (cache.size > 8) cache.delete(cache.keys().next().value!);
  }
  return Object.prototype.hasOwnProperty.call(shard, word) ? shard[word] : [];
}
