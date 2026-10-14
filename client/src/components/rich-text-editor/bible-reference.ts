import { closeHistory } from "@tiptap/pm/history";
import { Mark, type Editor } from "@tiptap/core";
import { BIBLE_LINK_ATTRIBUTE, bibleLinkId } from "@shared/writing-links";

export const BibleReference = Mark.create({
  name: "bibleReference",
  inclusive: false,
  excludes: "link bibleReference",
  addAttributes: () => ({ entryId: {default:null, rendered:false} }),
  parseHTML: () => [{tag:`span[${BIBLE_LINK_ATTRIBUTE}]`, getAttrs: element => {
    const entryId = bibleLinkId((element as HTMLElement).getAttribute(BIBLE_LINK_ATTRIBUTE));
    return entryId ? {entryId} : false;
  }}],
  renderHTML: ({mark}) => ["span", {[BIBLE_LINK_ATTRIBUTE]:String(mark.attrs.entryId),class:"bible-reference",title:"Open Story Bible card (⌘/Ctrl+Enter)"}, 0],
});
export type WritingRange = {from:number;to:number};
export function mentionRanges(editor: Editor, entryId?: number) {
  const ranges: Array<WritingRange & {entryId:number}> = [];
  editor.state.doc.descendants((node,pos) => {
    if (!node.isText) return;
    const mark = node.marks.find(m=>m.type.name === "bibleReference");
    const id = bibleLinkId(mark?.attrs.entryId);
    if (!id || (entryId !== undefined && id !== entryId)) return;
    const previous = ranges.at(-1);
    if (previous?.entryId === id && previous.to === pos) previous.to = pos + node.nodeSize;
    else ranges.push({entryId:id,from:pos,to:pos+node.nodeSize});
  });
  return ranges;
}
/** One native transaction: preserves selected words/marks, works with undo and draft HTML. */
export function linkWritingRange(editor: Editor, range: WritingRange, entryId: number, title: string, replace = false) {
  if (!bibleLinkId(entryId) || editor.isDestroyed || range.from < 1 || range.to > editor.state.doc.content.size) return false;
  const tr = closeHistory(editor.state.tr);
  let to = range.to;
  if (replace || range.from === range.to) {
    tr.insertText(title, range.from, range.to);
    to = range.from + title.length;
  }
  if (editor.schema.marks.link) tr.removeMark(range.from,to,editor.schema.marks.link);
  tr.addMark(range.from,to,editor.schema.marks.bibleReference.create({entryId}));
  tr.removeStoredMark(editor.schema.marks.bibleReference);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}
export function atQuery(editor: Editor): (WritingRange & {query:string}) | null {
  const {selection} = editor.state;
  if (!selection.empty || !selection.$from.parent.isTextblock || editor.view.composing) return null;
  const before = selection.$from.parent.textBetween(0,selection.$from.parentOffset,"\n","\ufffc");
  const match = /(?:^|\s)@([^@\s]{0,60})$/.exec(before);
  if (!match) return null;
  return {from:selection.from-match[1].length-1,to:selection.from,query:match[1]};
}
