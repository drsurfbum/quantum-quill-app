import {compileBibleQuery} from '../client/src/lib/bible-query';
import {biblePickerChoices} from '../client/src/lib/bible-picker';
import type {StoryBibleEntry} from '../shared/schema';
const titles=['Mara Vale','Mara North Vale','Elian Rook','Old Harbor','Harbor Road','The Chart Room','Mara AND Elian','Orion','Andreas','Nottingham','D’Arcy + C++ [A.*]','The "North" Chart'];
const matches=(query:string, rows=titles)=>rows.filter(title=>compileBibleQuery(query)(title).matches);
it('combines partial words as implicit AND in either order',()=>{
 expect(matches('val mar')).toEqual(['Mara Vale','Mara North Vale']);
 expect(matches('MAR val')).toEqual(matches('val mar'));
 expect(matches('Mara AND Vale')).toEqual(matches('val mar'));
 expect(matches('mara val')).not.toContain('Mara AND Elian');
});
it('uses NOT > AND > OR with explicit and implicit conjunction',()=>{
 expect(matches('Mara OR Elian AND NOT Rook')).toEqual(['Mara Vale','Mara North Vale','Mara AND Elian']);
 expect(matches('Mara OR Elian NOT Rook')).toEqual(matches('Mara OR Elian AND NOT Rook'));
 expect(matches('(Mara OR Elian) AND NOT Vale')).toEqual(['Elian Rook','Mara AND Elian']);
 expect(matches('NOT NOT Mara')).toEqual(matches('Mara'));
 expect(matches('NOT (Mara OR Elian)')).not.toEqual(matches('NOT Mara OR Elian'));
});
it('supports contiguous quoted phrases, quoted operator names and escaped quotes',()=>{
 expect(matches('"mara vale"')).toEqual(['Mara Vale']);
 expect(matches('“mara vale”')).toEqual(['Mara Vale']);
 expect(matches('“mara v')).toEqual(['Mara Vale']);
 expect(matches('"Mara AND Elian"')).toEqual(['Mara AND Elian']);
 expect(matches('"North\\" Chart"')).toEqual(['The "North" Chart']);
 expect(matches('"North Vale" OR "Chart Room"')).toEqual(['Mara North Vale','The Chart Room']);
});
it('keeps operators case-sensitive and does not turn name prefixes into operators',()=>{
 for(const query of ['O','OR','Ori','Orion'])expect(matches(query)).toContain('Orion');
 for(const query of ['N','NO','NOT','Nott'])expect(matches(query)).toContain('Nottingham');
 for(const query of ['A','AN','AND','Andr'])expect(matches(query)).toContain('Andreas');
 expect(matches('Mara and Elian')).toEqual(['Mara AND Elian']);
 expect(matches('"OR"')).toContain('Orion');
});
it.each(['Mara AND','Mara AND ','Mara OR','Mara OR ','Mara NOT','Mara OR NOT','Mara OR NOT ','Mara OR (','Mara OR ()','Mara OR "','Mara AND NOT ()','Mara AND OR','(Mara','((Mara)) )'])('keeps completed constraints useful for unfinished query %s',query=>{
 expect(matches(query)).toEqual(matches('Mara'));
});
it('uses unfinished phrases and groups immediately, without requiring a closing delimiter',()=>{
 expect(matches('"Mara V')).toEqual(['Mara Vale']);
 expect(matches('(Mara OR Elian')).toEqual(matches('Mara OR Elian'));
 expect(matches('Mara OR "Chart R')).toEqual(['Mara Vale','Mara North Vale','The Chart Room','Mara AND Elian']);
 for(const query of ['', ' ', '(', 'NOT ', '"', '()', 'AND '])expect(matches(query)).toEqual(titles);
});
it('treats punctuation and regex-like text literally and handles very deep groups iteratively',()=>{
 expect(matches('C++ [A.*]')).toEqual(['D’Arcy + C++ [A.*]']);
 expect(matches('"A(B)"',['A(B)','AB'])).toEqual(['A(B)']);
 expect(matches('"C:\\\\North"',['C:\\North','CNorth'])).toEqual(['C:\\North']);
 expect(matches('('.repeat(10000)+'Mara'+')'.repeat(10000))).toEqual(matches('Mara'));
});
it('keeps title-only project filtering, unfiltered ranking and original shared-consumer syntax',()=>{
 const rows=titles.map((title,i)=>({id:i+1,projectId:1,entryType:'characters',title,priority:0,content:'SecretKeyword'} as StoryBibleEntry));
 rows.push({...rows[0],id:100,projectId:2});
 const options={query:'Mara OR Elian',types:['characters'],projectId:1,ranked:true};
 expect(biblePickerChoices(rows,options).map(e=>e.title)).toEqual(['Elian Rook','Mara AND Elian','Mara North Vale','Mara Vale']);
 expect(biblePickerChoices(rows,{...options,ranked:false})).toEqual([]);
 expect(biblePickerChoices(rows,{...options,query:'Mara AND Elian',ranked:false}).map(e=>e.title)).toEqual(['Mara AND Elian']);
 expect(biblePickerChoices(rows,{...options,query:'NOT Elian'}).every(e=>e.projectId===1)).toBe(true);
 expect(biblePickerChoices(rows,{...options,query:'SecretKeyword'})).toEqual([]);
 expect(biblePickerChoices(rows,{...options,query:'val mar',ranked:false})).toEqual([]);
 expect(biblePickerChoices(rows,{...options,query:'"Mara Vale"'})[0].id).toBe(1);
});
it('ranks matched positive branches before stars/frequency and preserves whole-name relevance',()=>{
 const rows=['Old Harbor road','Old Harbor','Elian','Mara Vale','Elian at Old Harbor'].map((title,i)=>({id:i+1,projectId:1,entryType:'characters',title,priority:i===0?1:0} as StoryBibleEntry));
 const options={query:'Old Harbor',types:['characters'],projectId:1,ranked:true,counts:{1:99}};
 expect(biblePickerChoices(rows,options).map(e=>e.id)).toEqual([2,1,5]);
 expect(biblePickerChoices(rows,{...options,query:'"Old Harbor" OR Elian'}).map(e=>e.id)).toEqual([3,2,1,5]);
 expect(biblePickerChoices(rows,{...options,query:'NOT Harbor OR Elian'}).map(e=>e.id)).toEqual([3,5,4]);
 expect(biblePickerChoices(rows,{...options,query:''})[0].id).toBe(1);
});
it('filters the full long list without a result cap',()=>{
 const rows=Array.from({length:1500},(_,i)=>({id:i+1,projectId:1,entryType:'characters',title:`Fixture ${i} ${i%2?'north':'south'}`} as StoryBibleEntry));
 const result=biblePickerChoices(rows,{query:'Fixture NOT south',types:['characters'],projectId:1,ranked:true});
 expect(result).toHaveLength(750);expect(result.some(e=>e.id===1500)).toBe(true);
});

it('agrees with independent Boolean truth tables for mixed precedence and groups',()=>{
 for(let mask=0;mask<8;mask++){
  const a=!!(mask&1),b=!!(mask&2),c=!!(mask&4);
  const title=[a?'alpha':'',b?'beta':'',c?'gamma':''].join(' ');
  expect(compileBibleQuery('alpha OR beta AND NOT gamma')(title).matches).toBe(a || b && !c);
  expect(compileBibleQuery('(alpha OR beta) AND NOT gamma')(title).matches).toBe((a || b) && !c);
  expect(compileBibleQuery('NOT (alpha AND (beta OR NOT gamma))')(title).matches).toBe(!(a && (b || !c)));
 }
});

it('keeps a contiguous full-name prefix ahead of disjoint terms and ignores negation for positive relevance',()=>{
 const rows=['Old Golden Harbor','Old Harbor road','Mara Vale','Mara'].map((title,i)=>({id:i+1,projectId:1,entryType:'characters',title,priority:i===0?1:0} as StoryBibleEntry));
 const options={query:'Old Harbor',types:['characters'],projectId:1,ranked:true};
 expect(biblePickerChoices(rows,options).map(e=>e.id)).toEqual([2,1]);
 expect(biblePickerChoices(rows,{...options,query:'Mara NOT North'}).map(e=>e.id)).toEqual([4,3]);
});

it('keeps results during partial operators only when their literal name matches are empty',()=>{
 const rows=['Mara Vale','Mara North','Orion'].map((title,i)=>({id:i+1,projectId:1,entryType:'characters',title} as StoryBibleEntry));
 const options={query:'Mara O',types:['characters'],projectId:1,ranked:true};
 expect(biblePickerChoices(rows,options).map(e=>e.title)).toEqual(['Mara North']);
 for(const query of ['Mara A','Mara AN'])expect(biblePickerChoices(rows,{...options,query})).toHaveLength(2);
 expect(biblePickerChoices(rows,{...options,query:'Mara "AN'})).toHaveLength(0);
 expect(biblePickerChoices(rows,{...options,query:'Mara AN',ranked:false})).toHaveLength(0);
});
