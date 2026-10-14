import { useCallback, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type { Chapter, Scene } from "@shared/schema";
import { PanelRight } from "lucide-react";
import RichTextEditor from "./rich-text-editor";
import WritingReferencePane from "./writing-reference-pane";
import { Button } from "./ui/button";

/** Side panels never change the editor's position in the React tree. */
export default function WritingDocument({chapter,scene,controls}: {chapter:Chapter;scene?:Scene;controls?:ReactNode}) {
  const record = scene || chapter;
  const [editor,setEditor] = useState<Editor|null>(null);
  const ready = useCallback((value:Editor|null)=>setEditor(value),[]);
  const [contextOpen,setContextOpen] = useState(()=>typeof window.matchMedia === "function" && window.matchMedia("(min-width:1200px)").matches);
  const [activeId,setActiveId] = useState<number|null>(null);
  const openEntry = useCallback((id:number)=>{setActiveId(id);setContextOpen(true);},[]);
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <header className="h-16 shrink-0 border-b px-3 sm:px-5 flex items-center gap-2 min-w-0">
      <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground truncate">{scene ? chapter.title : "Chapter prose"} · {chapter.isDraft ? "Draft" : "Completed"}</p><h2 className="text-base sm:text-lg font-semibold truncate" title={record.title}>{record.title}</h2></div>
      {controls}
      <Button variant="ghost" size="sm" className="shrink-0 px-2" aria-label={contextOpen ? "Hide context" : "Show context"} aria-expanded={contextOpen} onClick={()=>setContextOpen(open=>!open)}><PanelRight className="h-4 w-4"/><span className="hidden lg:inline ml-2">Context</span></Button>
    </header>
    <div className="relative flex flex-1 min-h-0 min-w-0">
      <div className="flex flex-col flex-1 min-h-0 min-w-0"><RichTextEditor chapterId={record.id} resource={scene ? "scenes" : "chapters"} projectId={record.projectId} content={record.content} title={record.title} revision={record.revision} onOpenEntry={openEntry} onEditorReady={ready} /></div>
      {contextOpen && <WritingReferencePane projectId={record.projectId} scene={scene} editor={editor} activeId={activeId} onOpen={setActiveId} onClose={()=>setContextOpen(false)} />}
    </div>
  </div>;
}
