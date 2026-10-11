/** Legacy prose is text, not HTML. Adapt only the editor's view; loading must
 * never write normalized content back to the recovered record. */
export function editorContent(content: string | null | undefined) {
  const text = content || "";
  if (/<(p|h[1-6]|div|blockquote|ul|ol|li|table|pre|strong|em|span|b|i|u|s|a)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:br|hr|img)\b[^>]*\/?>/i.test(text)) return text;
  return { type: "doc", content: text.split(/\r\n|\n|\r/).map(line => ({ type: "paragraph", ...(line ? { content: [{ type: "text", text: line }] } : {}) })) };
}
