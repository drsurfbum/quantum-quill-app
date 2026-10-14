import type { StoryBibleEntry } from './schema';
import { legacyClassification } from './bible-contract';
import { isBibleType } from './bible-catalog';
import { readBibleFields } from './story-bible';
import { SCENE_ROLES, sceneLinksSchema, type SceneBibleLink, type SceneRole } from './scene-context';

type ScanEntry = Pick<StoryBibleEntry, 'id' | 'projectId' | 'title' | 'entryType' | 'content' | 'metadata' | 'tags' | 'isArchived'>;
type Name = {text:string; kind:'name'|'nickname'|'variation'};
type Hit = {entryId:number; from:number; to:number; kind:Name['kind']; text:string};
export type ConnectionSuggestion = {entryId:number; title:string; entryType:string; count:number; ambiguous:boolean; variation:boolean; excerpts:string[]};
const normalize = (text:string) => text.normalize('NFC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[‐‑–—]/g,'-');
const escape = (text:string) => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/** Only names, never biography text or retained import envelopes, become search terms. */
export function connectionNames(entry:ScanEntry):Name[] {
  const names:Name[]=[];
  const add=(text:string,kind:Name['kind'])=>{
    text=normalize(text).replace(/\s+/g,' ').trim();
    if(text.length<2 || text.length>500 || !/[\p{L}\p{N}]/u.test(text) || names.some(n=>n.text.toLocaleLowerCase()===text.toLocaleLowerCase()))return;
    names.push({text,kind});
  };
  add(entry.title,'name');
  const title=normalize(entry.title);
  for(const match of title.matchAll(/"([^"\n]+)"/g))add(match[1],'nickname');
  const bare=title.replace(/"[^"\n]+"/g,'').replace(/\s+/g,' ').trim();
  add(bare,'name');
  for(const part of bare.split(/\s*\/\s*/))add(part,'variation');
  if(entry.entryType==='characters'){
    const personal=bare.replace(/^(?:(?:dr\.?|doctor|commander|arch-commander|captain|lieutenant|ensign|professor|prof\.?|mr\.?|mrs\.?|ms\.?)\s+)+/i,'');
    add(personal,'variation');
    const words=personal.split(/\s+/);
    if(words.length>1){add(words[0],'variation');add(words.at(-1)!,'variation');}
  }
  if(entry.entryType==='locations')add(bare.replace(/^(?:SPNS|USS|HMS)\s+/i,''),'variation');
  const fields=readBibleFields(entry);
  for(const key of ['aliases','alias','nicknames','nickname','alternateNames','abbreviation']){
    const value=fields[key];
    for(const part of typeof value==='string' ? value.split(/[;,\n]/) : Array.isArray(value) ? value : [])if(typeof part==='string')add(part,'nickname');
  }
  return names.sort((a,b)=>b.text.length-a.text.length);
}

/** Read-only, project-scoped literal matching. A mention does not establish presence or viewpoint. */
export function scanExistingConnections(rawText:string, entries:ScanEntry[], projectId:number, connectedIds:Iterable<number>) {
  const text=normalize(rawText), connected=new Set(connectedIds);
  const active=entries.filter(e=>e.projectId===projectId && isBibleType(e.entryType) && !legacyClassification(e).archived);
  const hits:Hit[]=[];
  for(const entry of active)for(const name of connectionNames(entry)){
    const pattern=new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${name.text.split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{M}\\p{N}_])`,'giu');
    for(const m of text.matchAll(pattern))hits.push({entryId:entry.id,from:m.index!,to:m.index!+m[0].length,kind:name.kind,text:m[0]});
  }
  // A full name wins over a contained fragment; equal names remain ambiguous.
  hits.sort((a,b)=>a.from-b.from || b.to-a.to || ({name:0,nickname:1,variation:2}[a.kind]-{name:0,nickname:1,variation:2}[b.kind]));
  const kept:Hit[]=[];let start=0;
  for(const hit of hits){
    while(start<kept.length && kept[start].to<=hit.from)start++;
    if(kept.slice(start).some(old=>old.from<=hit.from && old.to>=hit.to && (old.entryId===hit.entryId || old.to-old.from>hit.to-hit.from)))continue;
    kept.push(hit);
  }
  const byEntry=new Map<number,Hit[]>(),byRange=new Map<string,Set<number>>();
  for(const hit of kept){if(!byEntry.has(hit.entryId))byEntry.set(hit.entryId,[]);byEntry.get(hit.entryId)!.push(hit);const key=`${hit.from}:${hit.to}`;if(!byRange.has(key))byRange.set(key,new Set());byRange.get(key)!.add(hit.entryId);}
  const suggestions:ConnectionSuggestion[]=active.filter(e=>byEntry.has(e.id) && !connected.has(e.id)).map(e=>{
    const matches=byEntry.get(e.id)!;
    return {entryId:e.id,title:e.title,entryType:e.entryType,count:matches.length,
      ambiguous:matches.some(m=>byRange.get(`${m.from}:${m.to}`)!.size>1),variation:matches.every(m=>m.kind==='variation'),
      excerpts:matches.slice(0,3).map(m=>`${m.from>65 ? '…' : ''}${text.slice(Math.max(0,m.from-65),Math.min(text.length,m.to+95)).replace(/\s+/g,' ')}${m.to+95<text.length ? '…' : ''}`)};
  }).sort((a,b)=>a.title.localeCompare(b.title));
  return {suggestions,alreadyConnected:[...byEntry.keys()].filter(id=>connected.has(id)).length};
}

/** Additive only: preserve existing roles/notes and reject stale, invalid or duplicate choices. */
export function appendScannedConnection(links:SceneBibleLink[], entry:ScanEntry, projectId:number, role:SceneRole):SceneBibleLink[] {
  if(entry.projectId!==projectId || !isBibleType(entry.entryType) || legacyClassification(entry).archived)throw new Error('This entry is no longer available to link. Scan again.');
  if(!(SCENE_ROLES[role].types as readonly string[]).includes(entry.entryType))throw new Error('Choose a role that fits this entry.');
  if(links.some(l=>l.entryId===entry.id))return links;
  // Viewpoint is intentionally a manual decision in the scene editor, not a name-match inference.
  if(role==='viewpoint')throw new Error('Choose viewpoint in the scene references editor.');
  if(links.length>=200)throw new Error('This scene already has 200 connections. Review its existing references first.');
  return sceneLinksSchema.parse([...links,{entryId:entry.id,role,note:''}]);
}
