import { Extension, Mark, mergeAttributes, type Editor, type ChainedCommands } from '@tiptap/core';
import { DEFAULT_WRITING_STYLE, WRITING_FONTS, writingStyleSchema, type WritingStyle } from '@shared/writing-styles';

const normalizedFamily = (value: string) => value.replace(/["'\s]/g, '').toLowerCase();
function fontId(value: string) {
  return WRITING_FONTS.find(font => normalizedFamily(font.family) === normalizedFamily(value))?.id ?? 'sans';
}
function hexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^#[a-f0-9]{6}$/i.test(value)) return value;
  const rgb = value.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:[, /]+1)?\s*\)$/);
  return rgb ? '#' + rgb.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('') : null;
}
const inlineProperties = ['fontFamily', 'fontSize', 'color', 'backgroundColor'] as const;
const cssNames = { fontFamily: 'font-family', fontSize: 'font-size', color: 'color', backgroundColor: 'background-color' };
export const TextAppearance = Mark.create({
  name: 'textAppearance',
  addAttributes() {
    return Object.fromEntries(inlineProperties.map(property => [property, {
      default: null,
      parseHTML: (element: HTMLElement) => element.style[property] || null,
      renderHTML: (attributes: Record<string, string>) => attributes[property] ? { style: `${cssNames[property]}: ${attributes[property]}` } : {},
    }]));
  },
  parseHTML: () => [{ tag: 'span[style]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
});
export const ScriptPosition = Mark.create({
  name: 'scriptPosition',
  addAttributes: () => ({ kind: { default: 'sup', rendered: false } }),
  parseHTML: () => [{ tag: 'sup', attrs: { kind: 'sup' } }, { tag: 'sub', attrs: { kind: 'sub' } }],
  renderHTML: ({ mark }) => [mark.attrs.kind === 'sub' ? 'sub' : 'sup', 0],
});
export const ParagraphAppearance = Extension.create({
  name: 'paragraphAppearance',
  addGlobalAttributes: () => [{ types: ['paragraph', 'heading'], attributes: {
    lineHeight: {
      default: null,
      parseHTML: element => element.style.lineHeight || null,
      renderHTML: attrs => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
    },
    spaceAfter: {
      default: null,
      parseHTML: element => element.style.marginBottom || null,
      renderHTML: attrs => attrs.spaceAfter ? { style: `margin-bottom: ${attrs.spaceAfter}` } : {},
    },
    firstLine: {
      default: false,
      parseHTML: element => element.style.textIndent === '2em',
      renderHTML: attrs => attrs.firstLine ? { style: 'text-indent: 2em' } : {},
    },
    indent: {
      default: 0,
      parseHTML: element => Math.min(8, Math.max(0, parseFloat(element.style.paddingLeft) / 2 || 0)),
      renderHTML: attrs => attrs.indent ? { style: `padding-left: ${Math.min(8, Math.max(0, attrs.indent)) * 2}em` } : {},
    },
  } }],
});
export const writingExtensions = [TextAppearance, ScriptPosition, ParagraphAppearance];
export function currentWritingStyle(editor: Editor): WritingStyle {
  const inline = editor.getAttributes('textAppearance');
  const block = editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph');
  const size = inline.fontSize ? Math.round(parseFloat(inline.fontSize) * (inline.fontSize.endsWith('px') ? 0.75 : 1)) : 12;
  const candidate = {
    font: fontId(inline.fontFamily || ''), size,
    bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'), strike: editor.isActive('strike'),
    color: hexColor(inline.color), highlight: hexColor(inline.backgroundColor),
    alignment: block.textAlign || 'left', lineHeight: block.lineHeight || '1.7',
    spaceAfter: block.spaceAfter ? String(parseInt(block.spaceAfter)) : '16', firstLine: !!block.firstLine,
  };
  // Pasted HTML may use sizes outside the saved-style controls; normalize only
  // the captured style, never rewrite the pasted document during rendering.
  return { ...DEFAULT_WRITING_STYLE, ...Object.fromEntries(Object.entries(candidate).filter(([key, value]) => writingStyleSchema.shape[key as keyof WritingStyle].safeParse(value).success)) };
}
export function setParagraphAppearance(editor: Editor, attributes: Record<string, unknown>) {
  return editor.chain().focus().updateAttributes('paragraph', attributes).updateAttributes('heading', attributes).run();
}
export function applyWritingStyle(editor: Editor, style: WritingStyle) {
  const parsed = writingStyleSchema.parse(style);
  const { from, to, empty, $from } = editor.state.selection;
  let chain = editor.chain().focus();
  // A preset applies to the current paragraph when there is no selected text.
  if (empty && $from.parent.isTextblock) chain = chain.setTextSelection({ from: $from.start(), to: $from.end() });
  const inline = (commands: ChainedCommands) => {
    commands = commands.unsetMark('scriptPosition').setMark('textAppearance', {
      fontFamily: WRITING_FONTS.find(font => font.id === parsed.font)!.family,
      fontSize: `${parsed.size}pt`, color: parsed.color, backgroundColor: parsed.highlight,
    });
    for (const mark of ['bold', 'italic', 'underline', 'strike'] as const) commands = parsed[mark] ? commands.setMark(mark) : commands.unsetMark(mark);
    return commands;
  };
  chain = inline(chain);
  const block = { lineHeight: parsed.lineHeight, spaceAfter: `${parsed.spaceAfter}px`, firstLine: parsed.firstLine, indent: 0 };
  chain = chain.setTextAlign(parsed.alignment).updateAttributes('paragraph', block).updateAttributes('heading', block);
  // Restoring the caret clears ProseMirror's stored marks. Reapply them so
  // a style chosen in an empty paragraph carries into the next keystroke.
  if (empty) chain = inline(chain.setTextSelection({ from, to }));
  return chain.run();
}
export function clearWritingFormatting(editor: Editor) {
  return editor.chain().focus().unsetAllMarks().clearNodes()
    .resetAttributes('paragraph', ['lineHeight', 'spaceAfter', 'firstLine', 'indent', 'textAlign']).run();
}
