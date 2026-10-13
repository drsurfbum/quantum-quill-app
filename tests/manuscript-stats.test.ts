import './editor-dom';
import { manuscriptStats, proseText } from '../client/src/lib/manuscript-stats';
Object.assign(globalThis,{DOMParser:window.DOMParser});
it('counts prose words rather than HTML bytes and includes scene writing without double counting plans',()=>{
 const result=manuscriptStats([{id:1,writingMode:'chapter',content:'<p>Hello <strong>writer</strong></p><p>Next paragraph</p>'},{id:2,writingMode:'scenes',content:''}] as any,[{chapterId:2,content:'One <a dragon> & two  spaces.',summary:'Not manuscript'}] as any);
 expect(result.byChapter.get(1)?.words).toBe(4);expect(result.byChapter.get(2)?.words).toBe(6);expect(result.words).toBe(10);
 expect(proseText('Keep <a dragon> intact')).toBe('Keep <a dragon> intact');
});
