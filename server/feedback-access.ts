// Deployment-local, explicitly provisioned account IDs. Never infer privilege from
// registration order, a username, an email address, or a client-provided field.
export function canReviewFeedback(userId: number): boolean {
  const configured = process.env.QQ_FEEDBACK_ADMIN_USER_IDS?.trim();
  if (!configured) return false;
  const ids = configured.split(",").map(value => value.trim());
  if (ids.some(value => !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))) return false;
  return ids.includes(String(userId));
}
