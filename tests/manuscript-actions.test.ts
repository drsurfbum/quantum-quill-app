import { prepareManuscriptAction } from '../client/src/lib/manuscript-actions';
import { flushPendingSaves, pendingSaveCount } from '../client/src/hooks/use-autosave';
import { draftJournal } from '../client/src/lib/draft-journal';
import { currentAccount } from '../client/src/lib/queryClient';
jest.mock('../client/src/hooks/use-autosave',()=>({flushPendingSaves:jest.fn(),pendingSaveCount:jest.fn()}));
jest.mock('../client/src/lib/queryClient',()=>({currentAccount:jest.fn()}));
jest.mock('../client/src/lib/draft-journal',()=>({draftJournal:{read:jest.fn(),error:null}}));
beforeEach(()=>{(currentAccount as jest.Mock).mockReturnValue(1);(flushPendingSaves as jest.Mock).mockResolvedValue(true);(pendingSaveCount as jest.Mock).mockReturnValue(0);(draftJournal.read as jest.Mock).mockReturnValue([]);});
it('blocks export/organization on a failed save or an unresolved recovered draft',async()=>{
 (flushPendingSaves as jest.Mock).mockResolvedValue(false);await expect(prepareManuscriptAction(3)).rejects.toThrow('not saved');
 (flushPendingSaves as jest.Mock).mockResolvedValue(true);(draftJournal.read as jest.Mock).mockReturnValue([{projectId:3}]);await expect(prepareManuscriptAction(3)).rejects.toThrow('recovered drafts');
});
it('blocks an account switch during save and keeps unrelated-project drafts private',async()=>{
 (currentAccount as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(2);await expect(prepareManuscriptAction(3)).rejects.toThrow('account changed');
 (currentAccount as jest.Mock).mockReturnValue(1);(draftJournal.read as jest.Mock).mockReturnValue([{projectId:4}]);await expect(prepareManuscriptAction(3)).resolves.toBe(1);expect(draftJournal.read).toHaveBeenCalledWith(1);
});
