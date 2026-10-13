import { SCENE_ROLES } from "@shared/scene-context";
import { imageDimensions } from "./upload-access";
import sanitize from "sanitize-html";
import { parseDocument } from "htmlparser2";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ExternalHyperlink, HeadingLevel, AlignmentType, Footer, PageNumber, ImageRun, LevelFormat } from "docx";
import JSZip from "jszip";
import { z } from "zod";
import type { IStorage } from "./storage";
import type { Project } from "@shared/schema";

export const exportOptions = z.object({
  format: z.enum(["html", "txt", "docx", "epub", "json"]),
  manuscript: z.boolean().default(true), outline: z.boolean().default(false),
  storyboard: z.boolean().default(false), bible: z.boolean().default(false),
  contents: z.boolean().default(true), pageNumbers: z.boolean().default(true),
}).strict().refine(o => o.manuscript || o.outline || o.storyboard || o.bible, "Choose at least one section.");
export type ExportOptions = z.infer<typeof exportOptions>;
const escape = (text: unknown) => String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const plainHTML = (text: string) => text.split(/\r\n|\r|\n/).map(line => `<p>${escape(line)}</p>`).join("");
const allowedTags = ["p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "strike", "sup", "sub", "mark", "blockquote", "ul", "ol", "li", "br", "hr", "pre", "code", "a", "table", "thead", "tbody", "tr", "th", "td", "img"];
export function cleanProse(text: string | null | undefined, images = new Map<string,string>()) {
  const value = text || "";
  // Match the editor's legacy plain-text reader. Never normalize stored originals.
  const html = /<(p|h[1-6]|div|blockquote|ul|ol|li|table|pre|strong|em|span|b|i|u|s|a)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:br|hr|img)\b[^>]*\/?>/i.test(value) ? value : plainHTML(value);
  return sanitize(html, {
    allowedTags, allowedAttributes: { "*": ["style"], a: ["href", "title"], img: ["src", "alt", "width", "height"], ol: ["start"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: ["https", "http", "mailto"], allowedSchemesByTag: { img: ["data"] }, allowProtocolRelative: false,
    allowedStyles: { "*": {
      "font-family": [/^[\w\s,"'-]+$/], "font-size": [/^\d{1,3}(\.\d+)?(pt|px)$/],
      "color": [/^#[\da-f]{3,8}$/i, /^rgb\([\d\s,]+\)$/], "background-color": [/^#[\da-f]{3,8}$/i, /^rgb\([\d\s,]+\)$/],
      "text-align": [/^(left|right|center|justify)$/], "line-height": [/^\d(\.\d+)?$/],
      "text-indent": [/^\d{1,3}(\.\d+)?(em|pt|px)$/], "margin-top": [/^\d{1,3}(\.\d+)?(pt|px)$/], "margin-bottom": [/^\d{1,3}(\.\d+)?(pt|px)$/],
    } },
    transformTags: { img: (_tag, attrs) => { if (images.has(attrs.src)) attrs = {...attrs,src:images.get(attrs.src)!}; return /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(attrs.src || "")
      ? { tagName: "img", attribs: attrs } : { tagName: "span", attribs: {}, text: `[Image: ${attrs.alt || "image stored separately"}]` }; } },
  });
}
export function htmlText(html: string) {
  const walk = (node: any): string => node.type === "text" ? node.data : node.name === "br" ? "\n" : node.name === "img" ? `[Image: ${node.attribs.alt || "image"}]` :
    (node.name === "li" ? "• " : "") + (node.children || []).map(walk).join("") + (/^(p|div|h[1-6]|li|tr|blockquote|pre)$/.test(node.name) ? "\n" : node.name === "td" || node.name === "th" ? "\t" : "");
  return walk(parseDocument(html));
}
export async function collectExport(storage: IStorage, project: Project, options: ExportOptions, resolveImage?: (url: string) => Promise<string | undefined>) {
  const chapters = await storage.getProjectChapters(project.id), scenes = await storage.getProjectScenes(project.id);
  const sceneContexts = options.manuscript || options.outline || options.bible ? await storage.getProjectSceneContexts(project.id) : [];
  const contextEntries = options.outline || options.bible ? await storage.getProjectStoryBible(project.id) : [];
  const parts: { title: string; html: string }[] = [];
  const images = new Map<string,string>(); let imageBytes = 0;
  const prose = async (value: string | null | undefined) => {
    if (resolveImage && options.format !== "json") {
      const visit = async (node: any): Promise<void> => {
        const src = node.name === "img" && node.attribs.src;
        if (src && src.startsWith("/uploads/") && !images.has(src)) {
          const data = await resolveImage(src);
          if (data) { imageBytes += data.length; if (imageBytes > 32*1024*1024) throw Object.assign(new Error("This export has more than 24 MB of images. Export smaller sections separately."),{status:413}); images.set(src,data); }
        }
        for (const child of node.children || []) await visit(child);
      };
      await visit(parseDocument(value || ""));
    }
    return cleanProse(value,images);
  };
  if (options.manuscript) for (const chapter of chapters.sort((a,b) => a.order-b.order || a.id-b.id)) {
    const children = scenes.filter(s => s.chapterId === chapter.id).sort((a,b) => a.order-b.order || a.id-b.id);
    parts.push({ title: chapter.title, html: chapter.writingMode === "scenes" ? (await Promise.all(children.map(async s => `<h2>${escape(s.title)}</h2>${await prose(s.content)}`))).join("\n") : await prose(chapter.content) });
  }
  const outline = options.outline ? await storage.getProjectOutline(project.id) : [];
  for (const item of outline) await prose(item.content);
  if (options.outline) {
    const seen = new Set<number>();
    const branch = (parentId: number | null, depth: number): string => outline.filter(i => i.parentId === parentId).sort((a,b) => a.order-b.order || a.id-b.id).map(i => {
      if (seen.has(i.id)) return ""; seen.add(i.id); const level = Math.min(depth+2,6);
      return `<h${level}>${escape(i.title)}</h${level}>${cleanProse(i.content,images)}${branch(i.id,depth+1)}`;
    }).join("");
    let html = branch(null,0);
    for (const item of outline) if (!seen.has(item.id)) html += `<h2>${escape(item.title)}</h2>${cleanProse(item.content,images)}`;
    for (const chapter of chapters) for (const scene of scenes.filter(s => s.chapterId === chapter.id)) { html += `<h2>${escape(chapter.title)} / ${escape(scene.title)}</h2>${plainHTML(scene.summary || "")}<ol>${(scene.storyBeats || []).map(b => `<li>${escape(b.text)}</li>`).join("")}</ol>`;
      const links = sceneContexts.find(context=>context.sceneId===scene.id)?.links || [];
      if (links.length) html += `<h3>Story Bible references</h3><ul>${links.map(link=>`<li>${escape(SCENE_ROLES[link.role].label)}: ${escape(contextEntries.find(entry=>entry.id===link.entryId)?.title || `Unavailable entry #${link.entryId}`)}${link.note ? plainHTML(link.note) : ""}</li>`).join("")}</ul>`;
    }
    parts.push({ title: "Outline & scene plans", html });
  }
  const plots = options.storyboard ? await storage.getProjectPlotStructures(project.id) : [];
  const plotSections = [];
  for (const plot of plots.sort((a,b) => (a.order || 0)-(b.order || 0) || a.id-b.id)) {
    const sections = await storage.getPlotStructureSections(plot.id); plotSections.push(...sections); for (const section of sections) await prose(section.content);
    parts.push({ title: `Storyboard: ${plot.name}`, html: `${plainHTML(plot.description || "")}${sections.map(s => `<h2>${escape(s.title)}</h2>${cleanProse(s.content,images)}`).join("")}` });
  }
  const bible = options.bible ? contextEntries : [];
  const relationships = options.bible ? await storage.getBibleRelationships(project.id) : [];
  for (const entry of bible) await prose(entry.content);
  for (const entry of bible) parts.push({ title: `Story Bible: ${entry.title}`, html: `<p>${escape(entry.entryType)}${entry.isArchived ? " · Archived" : ""}</p>${cleanProse(entry.content,images)}<h2>Structured fields & original metadata</h2><pre>${escape(JSON.stringify({ category: entry.category, subcategory: entry.subcategory, tags: entry.tags, metadata: entry.metadata, relatedEntryIds: entry.relatedEntryIds }, null, 2))}</pre>` });
  if (relationships.length) parts.push({ title: "Story Bible relationships", html: `<pre>${escape(JSON.stringify(relationships, null, 2))}</pre>` });
  return { project, parts, original: { schemaVersion: 1, exportedAt: new Date().toISOString(), project, ...(options.manuscript || options.outline ? { chapters, scenes } : {}), outline, plots, plotSections, bible, relationships, sceneContexts } };
}
export type ExportData = Awaited<ReturnType<typeof collectExport>>;
export const exportCSS = `@page{margin:22mm}*{box-sizing:border-box}body{font:12pt Georgia,serif;line-height:1.6;color:#171717;background:#fff;margin:0 auto;padding:2rem;max-width:850px}p{min-height:1em;white-space:pre-wrap}h1,h2,h3{line-height:1.25;break-after:avoid}h1{font-size:24pt}h2{font-size:17pt}section{break-before:page}section:first-of-type{break-before:auto}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #aaa;padding:.4em;overflow-wrap:anywhere}blockquote{border-left:3px solid #888;margin-left:0;padding-left:1em}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt}a{color:inherit}nav{margin-bottom:3rem}@media print{body{max-width:none;padding:0}a{text-decoration:none}}`;
export function exportHTML(data: ExportData, options: ExportOptions) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(data.project.title)}</title><style>${exportCSS}</style></head><body><header><h1>${escape(data.project.title)}</h1><p>${escape(data.project.settings.author || "")}</p></header>${options.contents ? `<nav aria-label="Contents"><h2>Contents</h2><ol>${data.parts.map((p,i) => `<li><a href="#part-${i}">${escape(p.title)}</a></li>`).join("")}</ol></nav>` : ""}${data.parts.map((p,i) => `<section id="part-${i}"><h1>${escape(p.title)}</h1>${p.html}</section>`).join("\n")}</body></html>`;
}
// Word uses native paragraphs/runs/tables, rather than an HTML file renamed .docx.
async function exportWord(data: ExportData, options: ExportOptions) {
  const styles = (node: any, inherited: any) => {
    const style = Object.fromEntries((node.attribs?.style || "").split(";").filter(Boolean).map((s: string) => { const i=s.indexOf(":"); return [s.slice(0,i).trim(),s.slice(i+1).trim()]; }));
    return { ...inherited, ...(["b","strong"].includes(node.name) ? { bold: true } : {}), ...(["em","i"].includes(node.name) ? { italics: true } : {}), ...(node.name === "u" ? { underline: {} } : {}), ...(["s","strike"].includes(node.name) ? { strike: true } : {}), ...(node.name === "sup" ? { superScript: true } : {}), ...(node.name === "sub" ? { subScript: true } : {}), ...(style["font-family"] ? { font: style["font-family"].split(",")[0].replace(/['"]/g,"") } : {}), ...(style["font-size"] ? { size: Math.round(parseFloat(style["font-size"]) * (style["font-size"].endsWith("px") ? 1.5 : 2)) } : {}), ...(/^#[0-9a-f]{6}$/i.test(style.color) ? { color: style.color.slice(1) } : {}) };
  };
  const inline = (node: any, inherited: any = {}): any[] => {
    if (node.type === "text") return [new TextRun({ ...inherited, text: node.data })];
    if (node.name === "br") return [new TextRun({ break: 1 })];
    if (node.name === "img") {
      const match = /^data:image\/(png|jpeg|gif);base64,(.*)$/s.exec(node.attribs.src || "");
      if (match) {
        const data=Buffer.from(match[2],"base64"), natural=imageDimensions(data) || {width:400,height:240};
        const width=Number(node.attribs.width) || natural.width, height=Number(node.attribs.height) || natural.height;
        const scale=Math.min(1,600/width,800/height);
        return [new ImageRun({ type: match[1] === "jpeg" ? "jpg" : match[1] as "png"|"gif", data, transformation: {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))} })];
      }
      return [new TextRun(`[Image: ${node.attribs.alt || "see HTML export"}]`)];
    }
    const children = (node.children || []).flatMap((child: any) => inline(child, styles(node, inherited)));
    return node.name === "a" && /^https?:|^mailto:/.test(node.attribs.href || "") ? [new ExternalHyperlink({ link: node.attribs.href, children })] : children;
  };
  let listId=0;
  const numbering: any[]=[];
  const blocks = (nodes: any[], list?: {reference:string;level:number}): (Paragraph|Table)[] => nodes.flatMap(node => {
    if (node.type === "text") return node.data.trim() ? [new Paragraph({ children: inline(node) })] : [];
    if (node.name === "table") {
      const rows = (n: any): any[] => n.name === "tr" ? [n] : (n.children || []).flatMap(rows);
      return [new Table({ rows: rows(node).map(row => new TableRow({ children: row.children.filter((c: any) => ["td","th"].includes(c.name)).map((cell: any) => new TableCell({ children: blocks(cell.children).length ? blocks(cell.children) : [new Paragraph("")], columnSpan: Number(cell.attribs.colspan) || 1 })) })) })];
    }
    if (["ul","ol"].includes(node.name)) {
      const reference=`list-${listId++}`;
      numbering.push({reference,levels:[{level:0,format:node.name === "ol" ? LevelFormat.DECIMAL : LevelFormat.BULLET,text:node.name === "ol" ? "%1." : "•",start:Number(node.attribs.start)||1,alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]});
      return blocks(node.children || [],{reference,level:0});
    }
    if (["div","tbody","thead"].includes(node.name)) return blocks(node.children || [],list);
    const alignment = /text-align:\s*(left|right|center|justify)/.exec(node.attribs?.style || "")?.[1];
    const heading = /^h([1-6])$/.exec(node.name);
    const css=node.attribs?.style || "";
    const line=/line-height:\s*([\d.]+)/.exec(css)?.[1];
    const after=/margin-bottom:\s*([\d.]+)(px|pt)/.exec(css);
    const firstLine=/text-indent:\s*([\d.]+)(em|px|pt)/.exec(css);
    return [new Paragraph({ children: inline(node), ...(heading ? { heading: Object.values(HeadingLevel)[Number(heading[1])-1] } : {}), ...(alignment ? { alignment: alignment === "justify" ? AlignmentType.JUSTIFIED : alignment as "left"|"right"|"center" } : {}), ...(node.name === "li" && list ? { numbering:list } : {}), ...(firstLine ? {indent:{firstLine:Math.round(Number(firstLine[1]) * (firstLine[2] === "em" ? 240 : firstLine[2] === "px" ? 15 : 20))}} : {}), spacing: { after:after ? Math.round(Number(after[1])*(after[2] === "px" ? 15 : 20)) : 160, ...(line ? {line:Math.round(Number(line)*240)} : {}) } })];
  });
  const children: (Paragraph|Table)[] = [new Paragraph({ text: data.project.title, heading: HeadingLevel.TITLE }), new Paragraph(data.project.settings.author || "")];
  if (options.contents) children.push(new Paragraph({ text: "Contents", heading: HeadingLevel.HEADING_1 }), ...data.parts.map(p => new Paragraph(p.title)));
  for (const part of data.parts) children.push(new Paragraph({ text: part.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }), ...blocks(parseDocument(part.html).children));
  return Packer.toBuffer(new Document({ numbering:{config:numbering}, title: data.project.title, creator: data.project.settings.author || "Quantum Quill", sections: [{ children, ...(options.pageNumbers ? { footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) } } : {}) }] }));
}
export async function renderExport(data: ExportData, options: ExportOptions) {
  const format = options.format;
  if (format === "json") return { type: "application/json", body: Buffer.from(JSON.stringify(data.original,null,2)) };
  if (format === "txt") return { type: "text/plain; charset=utf-8", body: Buffer.from([data.project.title, data.project.settings.author || "", ...data.parts.map(p => `${p.title}\n\n${htmlText(p.html)}`)].join("\n\n")) };
  if (format === "docx") return { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", body: await exportWord(data,options) };
  if (format === "epub") {
    const zip = new JSZip(); zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    // Serialize HTML as XML for EPUB XHTML. Raw original records remain available in JSON export.
    const { getOuterHTML } = await import("domutils");
    const body = data.parts.map((p,i) => `<section id="part-${i}"><h1>${escape(p.title)}</h1>${p.html}</section>`).join("");
    const dom=parseDocument(body); const imageItems: string[]=[]; const embedded=new Map<string,string>();
    const embed=(node:any):void=>{
      if(node.name === "img"){
        const src=node.attribs.src || "",match=/^data:(image\/(png|jpeg|gif|webp));base64,([a-zA-Z0-9+/=\s]+)$/.exec(src);
        if(match){
          let name=embedded.get(src);
          if(!name){name=`images/image-${embedded.size}.${match[2]}`;embedded.set(src,name);zip.file(name,Buffer.from(match[3],"base64"));imageItems.push(`<item id="image-${embedded.size}" href="${name}" media-type="${match[1]}"/>`);}
          node.attribs.src=name;
        }
      }
      for(const child of node.children || []) embed(child);
    };embed(dom);
    const xhtml = getOuterHTML(dom, { xmlMode: true });
    zip.file("book.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${escape(data.project.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${xhtml}</body></html>`);
    zip.file("style.css", exportCSS);
    zip.file("nav.xhtml", `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${data.parts.map((p,i) => `<li><a href="book.xhtml#part-${i}">${escape(p.title)}</a></li>`).join("")}</ol></nav></body></html>`);
    zip.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${crypto.randomUUID()}</dc:identifier><dc:title>${escape(data.project.title)}</dc:title><dc:creator>${escape(data.project.settings.author || "")}</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/,"Z")}</meta></metadata><manifest>${imageItems.join("")}<item id="book" href="book.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/></manifest><spine>${options.contents ? '<itemref idref="nav"/>' : ""}<itemref idref="book"/></spine></package>`);
    return { type: "application/epub+zip", body: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }) };
  }
  return { type: "text/html; charset=utf-8", body: Buffer.from(exportHTML(data,options)) };
}
