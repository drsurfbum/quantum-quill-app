"""Build the vendored lookup shards. Python standard library only; no network.

Usage: python3 scripts/build-wordnet.py /path/to/english-wordnet-2025.xml.gz
Input: https://en-word.net/static/english-wordnet-2025.xml.gz
The release input is hash-pinned. All definitions/examples are retained verbatim;
selected relations are flattened to labels. See docs/WORD_FINDER.md for attribution.
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import unicodedata
import xml.etree.ElementTree as ET

SOURCE_SHA = '9ca6d1dcb75f822fdd66617f7d9da48142ace38dd544d6ad5e2feca1674ad3fe'
OUT = Path(__file__).resolve().parents[1] / 'client/public/wordnet/2025-v1'


def normalize(word):
    return ' '.join(unicodedata.normalize('NFKC', word).lower().replace('’', "'").replace('‘', "'").split())


def bucket(word):
    value = 2166136261
    for byte in word.encode('utf-8'):
        value = ((value ^ byte) * 16777619) & 0xffffffff
    return f'{value & 255:02x}'


def main():
    source = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA:
        raise ValueError('Unexpected WordNet source; review a new release before updating the pin')
    lexicon = ET.fromstring(gzip.decompress(source)).find('Lexicon')
    entries = {e.attrib['id']: e for e in lexicon.findall('LexicalEntry')}
    synsets = {s.attrib['id']: s for s in lexicon.findall('Synset')}
    lemmas = {key: e.find('Lemma').attrib['writtenForm'] for key, e in entries.items()}
    sense_words = {s.attrib['id']: lemmas[key] for key, e in entries.items() for s in e.findall('Sense')}
    relations = {'hypernym': 'Broader', 'hyponym': 'More specific', 'similar': 'Similar',
                 'meronym': 'Has parts', 'mero_part': 'Has parts', 'holonym': 'Part of',
                 'holo_part': 'Part of', 'also': 'See also'}
    shards = {f'{n:02x}': {} for n in range(256)}
    for key, entry in entries.items():
        senses = []
        for sense in entry.findall('Sense'):
            synset = synsets[sense.attrib['synset']]
            related = {}
            for relation in synset.findall('SynsetRelation'):
                label = relations.get(relation.attrib['relType'])
                target = synsets.get(relation.attrib['target'])
                if label and target is not None:
                    related.setdefault(label, []).extend(lemmas[m] for m in target.attrib.get('members', '').split() if m in lemmas)
            senses.append({'id': sense.attrib['id'], 'lemma': lemmas[key], 'pos': synset.attrib['partOfSpeech'],
                           'definition': synset.findtext('Definition', ''),
                           'examples': [e.text or '' for e in synset.findall('Example')],
                           'synonyms': [lemmas[m] for m in synset.attrib.get('members', '').split() if m in lemmas and m != key],
                           'antonyms': sorted({sense_words[r.attrib['target']] for r in sense.findall('SenseRelation')
                                               if r.attrib['relType'] == 'antonym' and r.attrib['target'] in sense_words}),
                           'related': {label: sorted(set(words)) for label, words in related.items()}})
        forms = {lemmas[key]} | {f.attrib['writtenForm'] for f in entry.findall('Form')}
        for form in forms:
            normalized = normalize(form)
            shards[bucket(normalized)].setdefault(normalized, []).extend(senses)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'edition': '2025', 'format': 1, 'sourceSha256': SOURCE_SHA,
                'source': 'https://en-word.net/static/english-wordnet-2025.xml.gz',
                'entries': len(entries), 'synsets': len(synsets), 'keys': sum(len(s) for s in shards.values()), 'shards': {}}
    for name, shard in shards.items():
        for word in shard:
            shard[word] = list({s['id']: s for s in shard[word]}.values())
        raw = json.dumps(shard, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        (OUT / f'{name}.json.gz').write_bytes(compressed)
        manifest['shards'][name] = {'bytes': len(compressed), 'decodedBytes': len(raw), 'sha256': hashlib.sha256(compressed).hexdigest()}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({k: v for k, v in manifest.items() if k != 'shards'}))
    print('Compressed bytes:', sum(s['bytes'] for s in manifest['shards'].values()))
    print('Largest decoded shard:', max(s['decodedBytes'] for s in manifest['shards'].values()))


if __name__ == '__main__':
    main()
