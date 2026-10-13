import { flushPendingSaves, pendingSaveCount } from "@/hooks/use-autosave";
import { draftJournal } from "./draft-journal";
import { currentAccount } from "./queryClient";

export async function prepareManuscriptAction(projectId: number) {
  const account = currentAccount();
  if (!account) throw new Error("Sign in before continuing.");
  if (!await flushPendingSaves() || pendingSaveCount()) throw new Error("Some writing has not saved. Retry or review your drafts before continuing.");
  if (currentAccount() !== account) throw new Error("Your account changed. Sign in again.");
  if (draftJournal.read(account).some(draft => !draft.projectId || draft.projectId === projectId)) throw new Error("Review the recovered drafts for this project before exporting or reorganizing it.");
  if (draftJournal.error) throw new Error(draftJournal.error);
  return account;
}
