import { z } from "zod";
export const agentId = z.number().int().positive().max(2147483647);
export const agentPermissionsSchema = z.object({
  enabled: z.boolean(), allProjects: z.boolean(), projectIds: z.array(agentId).max(1000),
  allowWrites: z.boolean(), allowManuscript: z.boolean(),
}).strict();
export type AgentPermissions = z.infer<typeof agentPermissionsSchema>;
export type AgentAccess = AgentPermissions & { userId: number; revision: number; tokenHash: string | null };
export type AgentSettings = AgentPermissions & { revision: number; hasKey: boolean };
export const defaultAgentAccess = (userId: number): AgentAccess => ({ userId, revision: 0, enabled: false, allProjects: false, projectIds: [], allowWrites: false, allowManuscript: false, tokenHash: null });
export const publicAgentSettings = ({ userId: _, tokenHash, ...settings }: AgentAccess): AgentSettings => ({ ...settings, hasKey: !!tokenHash });
export const saveAgentSettingsSchema = agentPermissionsSchema.extend({ revision: z.number().int().nonnegative() });
