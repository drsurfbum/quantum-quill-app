import { z } from "zod";
import { Agent, get, type IncomingMessage } from "node:http";
import { legacyClassification, previewBibleDocument } from "../../shared/bible-contract";

export const idSchema = z.number().int().positive().max(2147483647);
const revision = z.number().int().nonnegative();
const text = z.string().nullable();
const projectSchema = z.object({
  id: idSchema, userId: idSchema, title: z.string(), description: text,
  isArchived: z.boolean().nullable(), isTrashed: z.boolean().nullable(),
});
const outlineSchema = z.object({
  id: idSchema, projectId: idSchema, revision, title: z.string(), content: text,
  parentId: idSchema.nullable(), order: z.number().int(), isCompleted: z.boolean().nullable(),
});
const entrySchema = z.object({
  id: idSchema, projectId: idSchema, revision, title: z.string(), entryType: z.string(), content: text,
  category: text, subcategory: text, tags: z.array(z.string()).nullable(),
  relatedEntryIds: z.array(idSchema).nullable(), metadata: z.unknown(),
  isArchived: z.boolean().nullable(), priority: z.number().int().nullable(),
  createdAt: text, updatedAt: text,
});

export class ReadError extends Error {}
export interface McpConfig { origin: string; projectId: number; accountId: number; cookie: string }

/** Configuration is operator-selected, never supplied by a tool/model. No .env loading. */
export function readConfig(env: NodeJS.ProcessEnv): McpConfig {
  try {
    const origin = env.QQ_MCP_ORIGIN || "http://127.0.0.1:5055";
    // Exact numeric loopback origin: no DNS, aliases, credentials, paths or redirects.
    if (!/^http:\/\/(127\.0\.0\.1|\[::1\]):[1-9][0-9]{0,4}$/.test(origin)) throw new Error();
    const url = new URL(origin);
    if (Number(url.port || 80) > 65535) throw new Error();
    const parseId = (value: string | undefined) => {
      if (!value || !/^[1-9][0-9]*$/.test(value)) throw new Error();
      return idSchema.parse(Number(value));
    };
    const cookie = env.QQ_MCP_SESSION_COOKIE || "";
    if (!/^quill_sid=[A-Za-z0-9%._~-]+$/.test(cookie) || cookie.length > 4096) throw new Error();
    return { origin, projectId: parseId(env.QQ_MCP_PROJECT_ID), accountId: parseId(env.QQ_MCP_ACCOUNT_ID), cookie };
  } catch {
    throw new ReadError("Invalid MCP configuration. Set a numeric loopback origin, account ID, project ID and quill_sid session cookie; see docs/MCP.md.");
  }
}

const MAX_API_BYTES = 8 * 1024 * 1024;
export const MAX_RESULT_BYTES = 256 * 1024;
export type Page = { afterId: number; limit: number };
function page<T extends { id: number }>(rows: T[], { afterId, limit }: Page) {
  const remaining = rows.filter(row => row.id > afterId).sort((a, b) => a.id - b.id);
  const items = remaining.slice(0, limit);
  return { items, nextAfterId: remaining.length > limit ? items.at(-1)!.id : null };
}

function summaryClassification(row: z.infer<typeof entrySchema>) {
  const value = legacyClassification(row);
  return { archived: value.archived, tags: value.tags.filter((tag: unknown) => typeof tag === "string"),
    category: typeof value.category === "string" ? value.category : null,
    subcategory: typeof value.subcategory === "string" ? value.subcategory : null };
}

/** Only fixed GET app operations exist here. No arbitrary URL, entity route or method. */
export class AppReader {
  constructor(private readonly config: McpConfig) {}
  get projectId() { return this.config.projectId; }

  private async get<T>(suffix: "" | "/outline" | "/story-bible", schema: z.ZodType<T>): Promise<T> {
    try {
      // A dedicated direct agent ignores global/environment HTTP proxy settings.
      const agent = new Agent({ keepAlive: false });
      try {
        const response = await new Promise<IncomingMessage>((resolve, reject) => {
          const request = get(`${this.config.origin}/api/projects/${this.projectId}${suffix}`, {
            agent, signal: AbortSignal.timeout(10_000),
            headers: { Cookie: this.config.cookie, "X-QQ-Account": String(this.config.accountId), Accept: "application/json" },
          }, resolve);
          request.on("error", reject);
        });
        try {
          if ([401, 403, 404, 409].includes(response.statusCode!)) throw new ReadError("The selected project or session is unavailable. Check the local app and sign in again.");
          // node:http never follows redirects. Unexpected bodies are discarded.
          if (response.statusCode !== 200 || !response.headers["content-type"]?.includes("application/json")) throw new Error();
          if (Number(response.headers["content-length"]) > MAX_API_BYTES) throw new ReadError("Project data exceeds the local MCP read limit.");
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of response) {
            size += chunk.length;
            if (size > MAX_API_BYTES) throw new ReadError("Project data exceeds the local MCP read limit.");
            chunks.push(chunk);
          }
          return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } finally { response.destroy(); }
      } finally { agent.destroy(); }
    } catch (error) {
      if (error instanceof ReadError) throw error;
      // Do not return/log HTTP bodies, schema errors, URLs, cookies or stored prose.
      throw new ReadError("The local QQ read failed. Check the app, session and supported data format.");
    }
  }

  async project() {
    const row = await this.get("", projectSchema);
    if (row.id !== this.projectId || row.userId !== this.config.accountId || row.isTrashed) throw new ReadError("The selected project is unavailable.");
    const { id, title, description, isArchived } = row;
    return { id, title, description, isArchived };
  }

  private async outline() {
    await this.project();
    const rows = await this.get("/outline", z.array(outlineSchema));
    if (rows.some(row => row.projectId !== this.projectId)) throw new ReadError("Project scope check failed.");
    return rows;
  }
  async listOutline(options: Page) {
    return page((await this.outline()).map(({ content: _, ...row }) => row), options);
  }
  async outlineItem(itemId: number) {
    const row = (await this.outline()).find(row => row.id === itemId);
    if (!row) throw new ReadError("Outline item not found in the selected project.");
    return row;
  }

  private async bible() {
    await this.project();
    const rows = await this.get("/story-bible", z.array(entrySchema));
    if (rows.some(row => row.projectId !== this.projectId)) throw new ReadError("Project scope check failed.");
    return rows;
  }
  async listBible(options: Page) {
    return page((await this.bible()).map(row => ({
      id: row.id, projectId: row.projectId, revision: row.revision, title: row.title,
      entryType: row.entryType, ...summaryClassification(row),
    })), options);
  }
  async bibleEntry(entryId: number) {
    const row = (await this.bible()).find(row => row.id === entryId);
    if (!row) throw new ReadError("Story Bible entry not found in the selected project.");
    // Same pure compatibility contract as GET /api/story-bible/:id/contract.
    // Never follows embedded links, loads images, converts or persists a record.
    return { id: row.id, revision: row.revision, ...previewBibleDocument(row) };
  }
}
