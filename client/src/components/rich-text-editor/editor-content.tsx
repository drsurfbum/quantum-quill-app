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
    <div className="writing-surface mx-auto max-w-3xl" data-empty={editor.isEmpty}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p id={labelId} className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Click inside the box to write</p>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
