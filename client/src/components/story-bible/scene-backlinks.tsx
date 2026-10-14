import type { WritingUse } from "@shared/writing-links";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { StoryBibleEntry, Scene } from "@shared/schema";
import { SCENE_ROLES, type SceneUse } from "@shared/scene-context";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { apiRequest } from "@/lib/queryClient";

export function SceneBacklinks({entry}: {entry:StoryBibleEntry}) {
  const query = useQuery<SceneUse[]>({queryKey:[`/api/story-bible/${entry.id}/scene-uses`],staleTime:0,refetchOnWindowFocus:true});
  const [,navigate] = useLocation(), [error,setError] = useState("");
  async function open(sceneId:number, outline:boolean) {
    setError("");
    try {
      await prepareManuscriptAction(entry.projectId);
      // Resolve the chapter at navigation time: this scene may have been moved.
      const scene = await (await apiRequest("GET",`/api/scenes/${sceneId}`)).json();
      if(scene.projectId!==entry.projectId) throw new Error("Scene unavailable in this project.");
      navigate(`/project/${entry.projectId}/${outline ? "outline?" : `write?chapter=${scene.chapterId}&`}scene=${scene.id}`);
    } catch(cause) {setError(cause instanceof Error ? cause.message : "Could not open this scene.");}
  }
  return <><WritingBacklinks entry={entry}/><section aria-label="Scenes using this entry" className="mt-6 border rounded-lg p-4 space-y-3">
    <h2 className="font-semibold">Used in scenes</h2>
    {query.isLoading ? <p className="text-sm">Loading scene connections…</p> : query.error ? <p role="alert" className="text-sm text-destructive">Scene connections could not load. <button className="underline" onClick={()=>void query.refetch()}>Retry</button></p> : !query.data?.length ? <p className="text-sm text-muted-foreground">No scenes linked yet. Add this entry from a scene’s Story Bible panel in Write or Outline.</p> : <ul className="space-y-3">{query.data.map(use=><li key={use.sceneId} className="rounded border p-3"><p className="text-xs text-muted-foreground">{use.chapterTitle}</p><button className="font-medium underline text-left break-words" onClick={()=>void open(use.sceneId,false)}>{use.sceneTitle}</button><p className="text-xs text-muted-foreground">{use.links.map(link=>SCENE_ROLES[link.role].label).join(" · ")}</p>{use.links.filter(link=>link.note).map(link=><p key={link.role} className="text-sm whitespace-pre-wrap">{link.note}</p>)}<button className="text-xs underline mt-2" onClick={()=>void open(use.sceneId,true)}>Open scene plan</button></li>)}</ul>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section></>;
}

export function SceneReturn({sceneId,projectId}:{sceneId:number;projectId:number}) {
  const query = useQuery<Scene>({queryKey:[`/api/scenes/${sceneId}`],staleTime:0});
  const [,navigate] = useLocation(), [error,setError] = useState("");
  if (!query.data || query.data.projectId !== projectId) return null;
  async function back() {
    setError("");
    try {
      await prepareManuscriptAction(projectId);
      const scene = await (await apiRequest("GET",`/api/scenes/${sceneId}`)).json();
      if (scene.projectId !== projectId) throw new Error("This scene is unavailable in this project.");
      navigate(`/project/${projectId}/write?chapter=${scene.chapterId}&scene=${scene.id}`);
    } catch(cause) {setError(cause instanceof Error ? cause.message : "Could not return to scene.");}
  }
  return <div className="border-b p-4"><button className="text-sm underline" onClick={()=>void back()}>← Return to scene: {query.data.title}</button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}

function WritingBacklinks({entry}:{entry:StoryBibleEntry}) {
  const query=useQuery<WritingUse[]>({queryKey:[`/api/story-bible/${entry.id}/writing-uses`],staleTime:0,refetchOnWindowFocus:true});
  const [,navigate]=useLocation(),[error,setError]=useState("");
  async function open(use:WritingUse) {
    try {await prepareManuscriptAction(entry.projectId);const record=await(await apiRequest("GET",`/api/${use.resource}/${use.id}`)).json();if(record.projectId!==entry.projectId)throw new Error("Writing unavailable in this project.");navigate(`/project/${entry.projectId}/write?chapter=${use.resource==="scenes" ? record.chapterId : record.id}${use.resource==="scenes" ? `&scene=${record.id}` : ""}`);}
    catch(cause){setError(cause instanceof Error ? cause.message : "Could not open writing.");}
  }
  return <section className="mt-6 border rounded-lg p-4 space-y-3" aria-label="Inline mentions"><h2 className="font-semibold">Mentioned in writing</h2>{query.error ? <p role="alert">Mentions could not load. <button className="underline" onClick={()=>void query.refetch()}>Retry</button></p> : query.isLoading ? <p>Loading mentions…</p> : query.data?.length ? <ul className="space-y-2">{query.data.map(use=><li key={`${use.resource}:${use.id}`}><button className="text-sm underline text-left" onClick={()=>void open(use)}>{use.resource==="scenes" ? `${use.chapterTitle} / ` : ""}{use.title}</button></li>)}</ul> : <p className="text-sm text-muted-foreground">No saved inline mentions yet. Use @ in Write to link this entry.</p>}{error && <p role="alert">{error}</p>}</section>;
}
