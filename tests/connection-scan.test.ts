import { connectionNames, scanExistingConnections, appendScannedConnection } from '../shared/connection-scan';
import type { StoryBibleEntry } from '../shared/schema';
const entry=(id:number,title:string,entryType='characters',extra:Partial<StoryBibleEntry>={})=>({id,title,entryType,projectId:5,content:'',metadata:{},tags:[],isArchived:false,...extra} as StoryBibleEntry);
const scan=(text:string,entries:StoryBibleEntry[],connected:number[]=[])=>scanExistingConnections(text,entries,5,connected);
it('finds title nicknames, quoted-name variants, titles, ship names and explicit aliases',()=>{
 const entries=[entry(1,'Jasper “Jazz” Ramirez'),entry(2,'Dr. Amelia "Amy" Patel'),entry(3,'Commander Rigel Thorne'),entry(4,'SPNS Endeavor','locations'),entry(5,'World Breaker / Alien Ship','locations'),entry(6,'Solar Peace Navy','groups_races',{metadata:{aliases:['SPN']}})];
 const before=JSON.stringify(entries);
 const result=scan("Jazz called Jasper Ramirez. Amy met Dr. Amelia Patel; Thorne boarded Endeavor. The Alien Ship hailed the SPN.",entries);
 expect(result.suggestions.map(s=>s.entryId).sort()).toEqual([1,2,3,4,5,6]);
 expect(result.suggestions.find(s=>s.entryId===1)?.count).toBe(2);
 expect(result.suggestions.find(s=>s.entryId===3)?.variation).toBe(true);
 expect(JSON.stringify(entries)).toBe(before);
});
it('uses Unicode word boundaries, apostrophes, punctuation and normalized accents',()=>{
 const entries=[entry(1,'Pax','locations'),entry(2,'Élodie'),entry(3,"O'Neil"),entry(4,'C++','world_elements')];
 expect(scan("Pax's paxophone _Pax Pax2 e\u0301lodie, O’Neil’s C++.",entries).suggestions.map(s=>[s.entryId,s.count]).sort()).toEqual([[1,1],[2,1],[3,1],[4,1]]);
});
it('skips connected, archived, other-project and unknown-type records and legacy envelopes',()=>{
 const entries=[entry(1,'Jazz'),entry(2,'Hylla','locations',{isArchived:true}),entry(3,'Pax','locations',{projectId:6}),entry(4,'Secret','other'),entry(5,'Cube','world_elements',{content:JSON.stringify({isArchived:true})}),entry(6,'Mara','characters',{metadata:{_notion:{aliases:['Hidden']},biography:'No name extraction from prose'}})];
 expect(scan('Jazz Hylla Pax Secret Cube Hidden No name extraction from prose',entries,[1])).toEqual({suggestions:[],alreadyConnected:1});
});
it('marks shared names as ambiguous and full names suppress shorter overlapping matches',()=>{
 const entries=[entry(1,'Mara Vale'),entry(2,'Mara Reed'),entry(3,'Vale','locations')];
 const bare=scan('Mara waits.',entries);expect(bare.suggestions).toHaveLength(2);expect(bare.suggestions.every(s=>s.ambiguous)).toBe(true);
 expect(scan('Mara Vale waits.',entries).suggestions.map(s=>s.entryId)).toEqual([1]);
});
it('returns bounded excerpts for repeated mentions without duplicate title/alias hits',()=>{
 const item=entry(1,'GLITCH','characters',{metadata:{nickname:'GLITCH'}});
 const result=scan('GLITCH '.repeat(5000),[item]);expect(result.suggestions[0].count).toBe(5000);expect(result.suggestions[0].excerpts).toHaveLength(3);
 expect(connectionNames(item)).toEqual([{text:'GLITCH',kind:'name'}]);
});
it('adds only valid new IDs and retains existing roles and notes without inferring viewpoint',()=>{
 const old=[{entryId:1,role:'viewpoint' as const,note:'Keep this note'}],mara=entry(2,'Mara');
 const added=appendScannedConnection(old,mara,5,'reference');expect(added).toEqual([...old,{entryId:2,role:'reference',note:''}]);expect(old).toHaveLength(1);
 expect(appendScannedConnection(added,mara,5,'cast')).toBe(added);
 expect(()=>appendScannedConnection(old,mara,5,'location')).toThrow('role');
 expect(()=>appendScannedConnection(old,mara,5,'viewpoint')).toThrow('viewpoint');
 expect(()=>appendScannedConnection(old,{...mara,isArchived:true},5,'reference')).toThrow('available');
 expect(()=>appendScannedConnection(old,mara,6,'reference')).toThrow('available');
 expect(()=>appendScannedConnection(Array.from({length:200},(_,i)=>({entryId:i+10,role:'reference',note:''})),mara,5,'reference')).toThrow('200');
});
