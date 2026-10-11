import { useOutline } from "@/contexts/outline-context";
import OutlineRichEditor from "./outline-rich-editor";
export function NewOutlineRichEditor({ projectId }: { projectId: number }) {
  const { selectedItemId, getItemById } = useOutline();
  const item = getItemById(selectedItemId);
  if (!item) return <p>Select a section to begin editing.</p>;
  return <OutlineRichEditor key={item.id} projectId={projectId} item={{ ...item, projectId, content: item.content || "", isCompleted: item.isCompleted || false, createdAt: null, updatedAt: null }} />;
}
