import { capacityNotice, planProseRetention, RETENTION_SCAN_LIMIT, type RetentionInput } from '../shared/prose-retention';
const now=new Date('2026-11-15T12:00:00Z'), day=86_400_000;
const row=(id:number,date:number|string,extra:Partial<RetentionInput>={}):RetentionInput=>({id,revision:id,savedAt:new Date(typeof date==='number'?now.getTime()-date:date),kind:'save',restoredFromId:null,keptAt:null,restoreProtected:false,sessionCheckpoint:false,bytes:100,...extra});
const plan=(rows:RetentionInput[])=>planProseRetention(rows,999,now);
it('keeps the newest changed state in each UTC window and never mutates input',()=>{
 const rows=[row(1,120000),row(2,60000),row(3,day+120000),row(4,day+60000),row(5,8*day+120000),row(6,8*day+60000),row(7,100*day),row(8,99*day),row(9,0)];
 const before=JSON.stringify(rows),report=plan(rows);
 expect(report.mode).toBe('dry-run');expect(report.decisions.filter(r=>r.action==='would-expire').map(r=>r.id).sort()).toEqual([1,3,5,7]);
 expect(report.wouldExpireLogicalBytes).toBe(400);expect(JSON.stringify(rows)).toBe(before);
 expect(plan([...rows].reverse())).toEqual(report);
});
it.each([[day,'5-minute'],[day+1,'hourly'],[7*day,'hourly'],[7*day+1,'daily'],[90*day,'daily'],[90*day+1,'monthly'],[365*day,'monthly'],[365*day+1,'older-than-year']])('handles age boundary %s', (age,tier)=>{
 expect(plan([row(1,Number(age))]).decisions[0].tier).toBe(tier);
});
it('uses a calendar year and handles leap-day review dates',()=>{
 const report=planProseRetention([row(1,'2023-02-28T12:00:00Z'),row(2,'2023-02-28T11:59:59.999Z'),row(3,'2024-02-29T12:00:00Z')],999,new Date('2024-02-29T12:00:00Z'));
 expect(report.decisions.find(r=>r.id===1)?.tier).toBe('monthly');expect(report.decisions.find(r=>r.id===2)?.action).toBe('would-expire');
});
it('protects original, kept, current, latest and every side of legacy or flagged restores',()=>{
 const rows=[row(1,800*day,{kind:'baseline'}),row(2,799*day,{keptAt:now}),row(3,798*day),row(4,797*day),row(5,796*day,{kind:'restore',restoredFromId:3}),row(6,795*day,{restoreProtected:true}),row(7,794*day),row(8,793*day),row(9,792*day)];
 const report=planProseRetention(rows,7,now);
 expect(report.decisions.filter(r=>r.action==='would-expire').map(r=>r.id)).toEqual([8]);
 for(const id of [3,4,5,6])expect(report.decisions.find(r=>r.id===id)?.reasons).toContain('restore-checkpoint');
});
it('keeps a recent clean-session state even when another state occupies the same bucket',()=>{
 const report=plan([row(1,120000,{sessionCheckpoint:true}),row(2,60000),row(3,0)]);
 expect(report.decisions.find(r=>r.id===1)?.reasons).toContain('recent-session-end');
 expect(plan([row(1,day+120000,{sessionCheckpoint:true}),row(2,day+60000),row(3,0)]).wouldExpireVersions).toBe(1);
});
it('fails closed for incomplete scans, unavailable documents, and uncertain timestamps',()=>{
 expect(plan(Array.from({length:RETENTION_SCAN_LIMIT+1},(_,i)=>row(i,800*day))).wouldExpireVersions).toBe(0);
 expect(planProseRetention([row(1,800*day),row(2,799*day)],null,now).wouldExpireVersions).toBe(0);
 expect(plan([row(1,-day),row(2,'invalid'),row(3,0)]).wouldExpireVersions).toBe(0);
 expect(()=>planProseRetention([],0,new Date('invalid'))).toThrow();
});
it('reports empty histories and deterministic tie-breaking',()=>{
 expect(plan([])).toMatchObject({complete:true,scannedVersions:0,wouldExpireVersions:0,logicalBytes:0});
 expect(plan([row(1,0),row(2,0)]).decisions.find(r=>r.id===1)?.action).toBe('would-expire');
});
it.each([[69,'normal'],[70,'warning'],[84,'warning'],[85,'urgent'],[120,'urgent']])('reports capacity %s without imposing a writing limit',(used,level)=>{expect(capacityNotice(Number(used),100).level).toBe(level);});
it('rejects invalid capacity rather than presenting a reassuring result',()=>{expect(()=>capacityNotice(-1,100)).toThrow();expect(()=>capacityNotice(1,0)).toThrow();});
