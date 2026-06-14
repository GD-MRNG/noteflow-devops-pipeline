export function parseContent(content?: string): object | string {
  if (!content) return '';
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
