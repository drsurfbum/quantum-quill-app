// Synthetic compatibility cases. No recovered user data is copied here.
export const legacyBible = [
  { name: "plain prose", entryType: "details", content: "First line.\nKeep <the dragon> & two  spaces.", metadata: { custom: { keep: true } }, field: "content" },
  { name: "JSON scalar", entryType: "research", content: '"A quoted source"', metadata: {}, field: "detailedNotes" },
  { name: "JSON array", entryType: "events", content: '["scene one", "scene two"]', metadata: {}, field: "narrativeContext" },
  { name: "broken JSON", entryType: "world_elements", content: '{"unfinished":', metadata: {}, field: "shortNotes" },
  { name: "structured JSON", entryType: "details", content: '{"content":"A reveal","unknown":{"nested":[1,2]},"tags":["legacy"]}', metadata: { note: "Keep me" }, field: "content" },
  { name: "metadata", entryType: "characters", content: "Legacy biography", metadata: { age: "42", unknown: { nested: [3, 4] } }, field: "age" },
  { name: "historically malformed field", entryType: "events", content: '{"writerNotes":"old","locations":"old bad shape","unknown":99}', metadata: {}, field: "writerNotes" },
  { name: "future schema", entryType: "details", content: '{"_schemaVersion":99,"content":"future prose"}', metadata: {}, field: "content" },
] as const;
export const legacyProse = "First line with <a dragon> & two  spaces.\n\nLast line.";
