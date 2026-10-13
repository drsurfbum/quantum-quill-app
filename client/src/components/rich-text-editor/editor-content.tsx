import { EditorContent, type Editor } from '@tiptap/react';

interface WritingSurfaceProps {
  editor: Editor;
  label: string;
  labelId: string;
}

// The border and minimum height belong to the editable element itself, so the
// entire visible writing box accepts clicks, including below the last line.
export default function WritingSurface({ editor, label, labelId }: WritingSurfaceProps) {
  return (
    <div className="writing-surface mx-auto max-w-4xl min-h-full flex flex-col" data-empty={editor.isEmpty}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p id={labelId} className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground hidden sm:block">Click anywhere on the page to write</p>
      </div>
      <EditorContent editor={editor} className="writing-document flex flex-1 flex-col" />
    </div>
  );
}
