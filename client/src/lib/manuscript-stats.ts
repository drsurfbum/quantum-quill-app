import type { Chapter, Scene } from "@shared/schema";
import { editorContent } from "./editor-content";
export function proseText(content: string | null) {
  const parsed=editorContent(content);
  if(typeof parsed !== "string") return (content || "");
  const root=new DOMParser().parseFromString(parsed,"text/html");
  root.querySelectorAll("script,style").forEach(n=>n.remove());
  root.querySelectorAll("br,p,div,li,tr,h1,h2,h3,h4,h5,h6").forEach(n=>n.appendChild(root.createTextNode("\n")));
  return root.body.textContent || "";
}
export function manuscriptStats(chapters: Chapter[], scenes: Scene[]) {
  const byChapter=new Map(chapters.map(ch=>{
    const text=ch.writingMode === "scenes" ? scenes.filter(s=>s.chapterId===ch.id).map(s=>proseText(s.content)).join("\n") : proseText(ch.content);
    return [ch.id,{words:text.trim()?text.trim().split(/\s+/).length:0,characters:text.length}];
  }));
  return {byChapter,words:[...byChapter.values()].reduce((sum,c)=>sum+c.words,0),characters:[...byChapter.values()].reduce((sum,c)=>sum+c.characters,0)};
}
