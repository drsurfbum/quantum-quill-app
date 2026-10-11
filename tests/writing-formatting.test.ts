import './editor-dom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { applyWritingStyle, currentWritingStyle, writingExtensions, clearWritingFormatting } from '../client/src/components/rich-text-editor/formatting';
import { findMatches, replaceMatches } from '../client/src/components/rich-text-editor/search';
import { DEFAULT_WRITING_STYLE, QUILL_STYLES } from '../shared/writing-styles';
function create(content = '<p>First words.</p><p>Leave this paragraph alone.</p>') {
  return new Editor({ extensions: [StarterKit, Underline, TextAlign.configure({ types: ['paragraph', 'heading'] }), ...writingExtensions], content });
}
const editors: Editor[] = [];
function make(content?: string) { const editor = create(content); editors.push(editor); return editor; }
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); });

it.each(QUILL_STYLES)('$name applies to the current paragraph and survives HTML reload', preset => {
  const editor = make();
  editor.commands.setTextSelection(3);
  applyWritingStyle(editor, preset.definition);
  expect(editor.getText()).toBe('First words.\n\nLeave this paragraph alone.');
  const untouched = editor.state.doc.child(1).toJSON();
  expect(untouched.content?.[0].marks).toBeUndefined();
  const reloaded = make(editor.getHTML());
  reloaded.commands.setTextSelection(3);
  expect(currentWritingStyle(reloaded)).toEqual(preset.definition);
});
it('preserves selected inline formatting, color, highlight, paragraph spacing and scripts on reload', () => {
  const editor = make();
  editor.commands.setTextSelection({ from: 1, to: 6 });
  const style = { ...DEFAULT_WRITING_STYLE, font: 'typewriter' as const, size: 18, bold: true, underline: true, color: '#7e22ce', highlight: '#fef08a', alignment: 'justify' as const, lineHeight: '2' as const, spaceAfter: '24' as const, firstLine: true };
  applyWritingStyle(editor, style);
  editor.commands.setMark('scriptPosition', { kind: 'sup' });
  const reloaded = make(editor.getHTML()); reloaded.commands.setTextSelection(3);
  expect(currentWritingStyle(reloaded)).toEqual(style);
  expect(reloaded.isActive('scriptPosition', { kind: 'sup' })).toBe(true);
  expect(reloaded.state.doc.child(1).textContent).toBe('Leave this paragraph alone.');
  reloaded.commands.selectAll(); clearWritingFormatting(reloaded);
  expect(reloaded.getHTML()).toBe('<p>First words.</p><p>Leave this paragraph alone.</p>');
});
it('applying a style to an empty paragraph carries into typing', () => {
  const editor = make('<p></p>');
  applyWritingStyle(editor, QUILL_STYLES[1].definition);
  editor.commands.insertContent('A new sentence.');
  expect(currentWritingStyle(editor)).toEqual(QUILL_STYLES[1].definition);
  expect(editor.getHTML()).toContain('<em>');
});
it('find and replace crosses inline marks, handles literal punctuation, preserves marks and supports undo', () => {
  const editor = make('<p><strong>Rain</strong> falls. Rain falls. [a+b]</p><p>rain falls.</p>');
  expect(findMatches(editor, 'Rain falls', true)).toHaveLength(2);
  expect(findMatches(editor, 'Rain falls', false)).toHaveLength(3);
  expect(findMatches(editor, '[a+b]', true)).toHaveLength(1);
  const original = editor.getHTML();
  expect(replaceMatches(editor, 'Rain falls', 'Snow settles', false, true)).toBe(3);
  expect(editor.getText()).toBe('Snow settles. Snow settles. [a+b]\n\nSnow settles.');
  expect(editor.getHTML()).toContain('<strong>Snow settles</strong>');
  editor.commands.undo(); expect(editor.getHTML()).toBe(original);
  const [match] = findMatches(editor, 'Rain falls', true); editor.commands.setTextSelection(match);
  expect(replaceMatches(editor, 'Rain falls', '', true, false)).toBe(1);
  expect(findMatches(editor, 'Rain falls', true)).toHaveLength(1);
});
it('search positions remain accurate after inline hard breaks', () => {
  const editor = make('<p>One<br>Two <em>three</em></p>');
  const [match] = findMatches(editor, 'Two three', true);
  editor.commands.setTextSelection(match);
  expect(editor.state.doc.textBetween(match.from, match.to)).toBe('Two three');
  expect(replaceMatches(editor, 'Two three', 'Four', true, false)).toBe(1);
  expect(editor.getHTML()).toContain('One<br>Four');
});
