import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { Mark, type Node as ProseNode } from '@tiptap/pm/model';
import { validWordQuery } from '@/lib/wordnet';

export type WordSelection = { from: number; to: number; text: string; doc: ProseNode; marks: readonly Mark[] };
export function captureWordSelection(editor: Editor): WordSelection | null {
  const { selection, doc } = editor.state;
  if (!(selection instanceof TextSelection) || selection.empty || !selection.$from.sameParent(selection.$to)) return null;
  const text = doc.textBetween(selection.from, selection.to, '', '\ufffc');
  if (!validWordQuery(text) || text !== text.trim()) return null;
  // A replacement cannot safely guess which mixed formatting or link to keep.
  let marks: readonly Mark[] | undefined, safe = true;
  doc.nodesBetween(selection.from, selection.to, node => {
    if (!node.isText) { if (node.isInline) safe = false; return true; }
    if (node.marks.some(mark => ['bibleReference', 'link'].includes(mark.type.name))) safe = false;
    if (marks && !Mark.sameSet(marks, node.marks)) safe = false;
    marks = node.marks;
  });
  return safe && marks ? { from: selection.from, to: selection.to, text, doc, marks } : null;
}
export function selectionIsCurrent(editor: Editor, target: WordSelection | null) {
  return !!target && !editor.isDestroyed && editor.isEditable && editor.state.doc === target.doc
    && editor.state.selection.from === target.from && editor.state.selection.to === target.to;
}
export function replaceWordSelection(editor: Editor, target: WordSelection | null, replacement: string) {
  if (!selectionIsCurrent(editor, target) || !target || !replacement.trim() || replacement.length > 120 || /[\r\n]/.test(replacement)) return false;
  // Separate from both preceding and subsequent typing; insert literal text only.
  const tr = closeHistory(editor.state.tr).replaceWith(target.from, target.to, editor.schema.text(replacement, target.marks));
  tr.setSelection(TextSelection.create(tr.doc, target.from, target.from + replacement.length));
  editor.view.dispatch(tr);
  editor.view.dispatch(closeHistory(editor.state.tr));
  editor.view.focus();
  return true;
}
