import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { normalizeWord, wordBucket, lookupWord, validWordQuery, WORDNET_ROOT } from '../client/src/lib/wordnet';
const root = `client/public${WORDNET_ROOT}`;
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, 'utf8'));
it('ships intact pinned shards, with every lookup key in its expected bucket', () => {
  let keys = 0;
  for (const [bucket, metadata] of Object.entries(manifest.shards) as [string, any][]) {
    const bytes = readFileSync(`${root}/${bucket}.json.gz`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256);
    const entries = JSON.parse(gunzipSync(bytes).toString());
    for (const word of Object.keys(entries)) {
      if (wordBucket(word) !== bucket) throw new Error(`Wrong bucket for ${word}`);
      keys++;
    }
  }
  expect(keys).toBe(manifest.keys);
});
it('normalizes case and apostrophes, while bounding lookup input', () => {
  expect(normalizeWord('  Fisherman’s  knot ')).toBe("fisherman's knot");
  expect(wordBucket('Quiet')).toBe(wordBucket('quiet'));
  expect(validWordQuery('<script>')).toBe(false);
  expect(validWordQuery('x'.repeat(81))).toBe(false);
});
it('loads definitions, sense-specific synonyms, antonyms and examples without transmitting the query', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockImplementation(async url => new Response(readFileSync(`client/public${url}`)));
  try {
    const senses = await lookupWord('quiet');
    expect(senses.length).toBeGreaterThan(1);
    expect(senses.some(s => s.synonyms.includes('calm'))).toBe(true);
    expect(senses.some(s => s.antonyms.length > 0)).toBe(true);
    expect(senses.some(s => s.examples.length > 0)).toBe(true);
    expect(senses.every(s => !!s.definition)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/^\/wordnet\/2025-v1\/[0-9a-f]{2}\.json\.gz$/), expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
    expect(await lookupWord('zznonexistentwordzz')).toEqual([]);
    await expect(lookupWord('a'.repeat(81))).rejects.toThrow('80');
  } finally { fetcher.mockRestore(); }
});
