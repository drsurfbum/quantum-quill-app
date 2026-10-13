import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
/** Bounded, per-process protection for a single-instance pilot. Multi-instance
 * deployments must use a shared limiter before scaling out. No credentials logged. */
export function authLimiter(max: number, windowMs: number, clock = Date.now, perUsername = false): RequestHandler {
  const buckets = new Map<string,{count:number;until:number}>();
  return (req,res,next) => {
    const now=clock();
    for(const [key,bucket] of buckets) if(bucket.until<=now) buckets.delete(key);
    const name=perUsername ? String(req.body?.username || "").trim().toLowerCase().slice(0,200) : "";
    const key=createHash("sha256").update(`${req.ip}:${name}`).digest("hex");
    let bucket=buckets.get(key);
    if(!bucket){
      if(buckets.size>=10000){res.setHeader("Retry-After","60");res.status(429).json({message:"Too many sign-in attempts. Please try again shortly."});return;}
      bucket={count:0,until:now+windowMs};buckets.set(key,bucket);
    }
    bucket.count++;
    if(bucket.count>max){res.setHeader("Retry-After",String(Math.ceil((bucket.until-now)/1000)));res.status(429).json({message:"Too many attempts. Please wait before trying again."});return;}
    next();
  };
}
