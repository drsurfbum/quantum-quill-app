import fs from "node:fs/promises";
import path from "node:path";
import type { IStorage } from "./storage";
export function imageType(data: Buffer): { ext: string; mime: string } | undefined {
  if (data.length >= 24 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {ext:"png",mime:"image/png"};
  if (data.length >= 4 && data[0] === 255 && data[1] === 216 && data[2] === 255) return {ext:"jpg",mime:"image/jpeg"};
  if (data.length >= 13 && /^GIF8[79]a$/.test(data.subarray(0,6).toString())) return {ext:"gif",mime:"image/gif"};
  if (data.length >= 16 && data.subarray(0,4).toString() === "RIFF" && data.subarray(8,12).toString() === "WEBP") return {ext:"webp",mime:"image/webp"};
}
export const safeImageName = (name: string) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|gif|webp)$/i.test(name) && !name.includes("..");
export async function imageProjectIds(directory: string, name: string): Promise<number[]> {
  if (!safeImageName(name)) return [];
  try {
    const data = JSON.parse(await fs.readFile(path.join(directory,".access",`${name}.json`),"utf8"));
    return Array.isArray(data.projectIds) ? data.projectIds.filter((id: unknown) => Number.isInteger(id) && Number(id)>0) : [];
  } catch { return []; }
}
export async function readProjectImage(directory: string, name: string, projectId: number) {
  if (!(await imageProjectIds(directory,name)).includes(projectId)) return undefined;
  try { const bytes=await fs.readFile(path.join(directory,name)); const type=imageType(bytes); return type && bytes.length<=5*1024*1024 ? {bytes,...type} : undefined; } catch { return undefined; }
}
export async function userCanReadImage(storage: IStorage, directory: string, name: string, userId: number) {
  for (const projectId of await imageProjectIds(directory,name)) if ((await storage.getProject(projectId))?.userId === userId) return true;
  return false;
}
export function imageDimensions(bytes:Buffer) {
 const type=imageType(bytes);let width=0,height=0;
 if(type?.ext === 'png'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);}
 if(type?.ext === 'gif'){width=bytes.readUInt16LE(6);height=bytes.readUInt16LE(8);}
 if(type?.ext === 'jpg'){
  let offset=2;
  while(offset+8<bytes.length){
   if(bytes[offset]!==255)break;const marker=bytes[offset+1];
   if(marker===216 || marker===1 || (marker>=208 && marker<=215)){offset+=2;continue;}
   if(marker===217 || marker===218)break;
   const length=bytes.readUInt16BE(offset+2);if(length<2 || offset+2+length>bytes.length)break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=bytes.readUInt16BE(offset+5);width=bytes.readUInt16BE(offset+7);break;}
   offset+=2+length;
  }
 }
 return width>0 && height>0 ? {width,height} : undefined;
}
