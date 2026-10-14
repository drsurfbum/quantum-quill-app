import "./editor-dom";
import {Editor} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import {BibleReference,atQuery,linkWritingRange,mentionRanges} from "../client/src/components/rich-text-editor/bible-reference";
import {writingExtensions,clearWritingFormatting,applyWritingStyle} from "../client/src/components/rich-text-editor/formatting";
import {QUILL_STYLES} from "../shared/writing-styles";
import {DraftJournal} from "../client/src/lib/draft-journal";
const make=(content:string)=>new Editor({extensions:[StarterKit,Underline,TextAlign.configure({types:["paragraph","heading"]}),Link,BibleReference,...writingExtensions],content});
it("selected phrase retains emphasis and alias, links undo/redo, and presets/clear formatting retain meaning",()=>{
  const editor=make("<p>The <strong>navigator</strong> arrived.</p>");
  linkWritingRange(editor,{from:5,to:14},42,"Mara Vale");
  expect(editor.getText()).toBe("The navigator arrived.");
  expect(mentionRanges(editor)).toEqual([{from:5,to:14,entryId:42}]);
  expect(editor.getHTML()).toContain("<strong>");
  editor.commands.undo();expect(mentionRanges(editor)).toEqual([]);expect(editor.getText()).toBe("The navigator arrived.");
  editor.commands.redo();editor.commands.setTextSelection({from:1,to:editor.state.doc.content.size-1});
  applyWritingStyle(editor,QUILL_STYLES[2].definition);clearWritingFormatting(editor);
  expect(mentionRanges(editor)).toEqual([{from:5,to:14,entryId:42}]);
  const html=editor.getHTML(),reloaded=make(html);expect(reloaded.getHTML()).toBe(html);expect(reloaded.getText()).toBe(editor.getText());
  editor.destroy();reloaded.destroy();
});
it("@ detection ignores email addresses, supports empty queries and native composition",()=>{
  for(const [text,query] of [["Hello @",""],["Hello @Mara","Mara"],["person@example.com",null],["@@",null]] as const){
    const editor=make(`<p>${text}</p>`);editor.commands.setTextSelection(text.length+1);
    expect(atQuery(editor)?.query ?? null).toBe(query);editor.destroy();
  }
  const editor=make("<p>@Mara</p>");editor.commands.setTextSelection(6);Object.defineProperty(editor.view,"composing",{value:true,configurable:true});expect(atQuery(editor)).toBeNull();editor.destroy();
});
it("replaces only the @ query and typing after a link does not extend it",()=>{
  const editor=make("<p>Meet @Ma</p>");editor.commands.setTextSelection(9);
  const query=atQuery(editor)!;linkWritingRange(editor,query,7,"Mara",true);
  expect(editor.getText()).toBe("Meet Mara");editor.commands.insertContent(" tomorrow");
  expect(mentionRanges(editor)[0]).toMatchObject({from:6,to:10,entryId:7});
  expect(editor.getText()).toBe("Meet Mara tomorrow");editor.commands.undo();editor.destroy();
});
it("rejects malformed marks while leaving words, and durable HTML drafts are isolated by account",()=>{
  const editor=make('<p><span data-qq-entry="javascript:bad">Keep words</span></p>');expect(mentionRanges(editor)).toEqual([]);
  linkWritingRange(editor,{from:1,to:11},12,"Name");const html=editor.getHTML();
  const journal=new DraftJournal(()=>window.localStorage);const draft={version:1 as const,id:"inline-fixture",owner:987,projectId:2,url:"/api/chapters/3",title:"Chapter",updatedAt:new Date().toISOString(),base:{content:"Original"},baseRevision:0,patch:{content:html}};
  journal.write(draft);expect(new DraftJournal(()=>window.localStorage).read(987)[0].patch.content).toBe(html);expect(journal.read(988)).toEqual([]);journal.remove(draft);editor.destroy();
});
