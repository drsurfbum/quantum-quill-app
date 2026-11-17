import './editor-dom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { BibleReference } from '../client/src/components/rich-text-editor/bible-reference';
import { captureWordSelection, replaceWordSelection } from '../client/src/components/rich-text-editor/word-selection';
const editors: Editor[] = [];
function make(content = '<p>A <strong>quiet</strong> shore.</p>') {
  const editor = new Editor({ extensions: [StarterKit, Link, BibleReference], content });
  editors.push(editor); editor.commands.setTextSelection({ from: 3, to: 8 }); return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));
it('replaces exactly the selection, preserves marks and isolates undo from surrounding typing', () => {
  const editor = make();
  editor.commands.insertContentAt(15, '!');
  editor.commands.setTextSelection({ from: 3, to: 8 });
  const before = editor.getHTML(), target = captureWordSelection(editor);
  expect(target?.text).toBe('quiet');
  expect(replaceWordSelection(editor, target, 'calm')).toBe(true);
  const replaced = editor.getHTML();
  expect(replaced).toContain('<strong>calm</strong>');
  editor.commands.undo(); expect(editor.getHTML()).toBe(before);
  editor.commands.redo(); expect(editor.getHTML()).toBe(replaced);
  editor.commands.setTextSelection(7); editor.commands.insertContent('ly');
  editor.commands.undo(); expect(editor.getHTML()).toBe(replaced);
  editor.commands.undo(); expect(editor.getHTML()).toBe(before);
});
it('refuses stale document, changed selection, and read-only edits', () => {
  const editor = make(), target = captureWordSelection(editor);
  editor.commands.setTextSelection(2);
  expect(replaceWordSelection(editor, target, 'calm')).toBe(false);
  editor.commands.setTextSelection({ from: 3, to: 8 });
  editor.commands.insertContentAt(15, '!');
  expect(replaceWordSelection(editor, target, 'calm')).toBe(false);
  editor.commands.setTextSelection({ from: 3, to: 8 });
  const fresh = captureWordSelection(editor); editor.setEditable(false);
  expect(replaceWordSelection(editor, fresh, 'calm')).toBe(false);
});
it.each(['<p>A <strong>qui</strong>et shore.</p>', '<p>A <a href="https://example.test">quiet</a> shore.</p>', '<p>A <span data-qq-entry="1">quiet</span> shore.</p>'])(
  'protects mixed formatting and semantic links: %s', content => expect(captureWordSelection(make(content))).toBeNull());
it('inserts data as literal text, never HTML', () => {
  const editor = make(), target = captureWordSelection(editor);
  expect(replaceWordSelection(editor, target, '<img>')).toBe(true);
  expect(editor.getHTML()).toContain('&lt;img&gt;');
  expect(editor.getHTML()).not.toContain('<img>');
});
it('rejects paragraphs, empty selections and inline atoms', () => {
  const editor = make('<p>A quiet</p><p>shore.</p>');
  editor.commands.setTextSelection({ from: 3, to: 13 }); expect(captureWordSelection(editor)).toBeNull();
  editor.commands.setTextSelection(3); expect(captureWordSelection(editor)).toBeNull();
});
