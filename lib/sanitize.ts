// Strip all HTML tags from a string — server-safe, no DOM required.
// Dangerous elements (script, style) are removed including their content.
// All other tags are unwrapped (tag stripped, text content kept).
export function stripHtml(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
}

// Validate and sanitize URLs to prevent javascript: and other dangerous protocols
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url, 'https://example.com');
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

// Recursively sanitize text content in TipTap JSON structure
export function sanitizeTipTapNode(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(sanitizeTipTapNode);
  }

  const obj = node as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'text' && typeof value === 'string') {
      sanitized[key] = stripHtml(value);
    } else if (key === 'attrs' && typeof value === 'object' && value !== null) {
      // Sanitize attributes - especially href and src
      const attrs = value as Record<string, unknown>;
      const sanitizedAttrs: Record<string, unknown> = {};
      for (const [attrKey, attrValue] of Object.entries(attrs)) {
        if ((attrKey === 'href' || attrKey === 'src') && typeof attrValue === 'string') {
          const safeUrl = sanitizeUrl(attrValue);
          if (safeUrl) sanitizedAttrs[attrKey] = safeUrl;
        } else if (typeof attrValue === 'string') {
          sanitizedAttrs[attrKey] = stripHtml(attrValue);
        } else {
          sanitizedAttrs[attrKey] = attrValue;
        }
      }
      sanitized[key] = sanitizedAttrs;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(sanitizeTipTapNode);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeTipTapNode(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function sanitizeContent(jsonString: string): string {
  try {
    const content = JSON.parse(jsonString);
    return JSON.stringify(sanitizeTipTapNode(content));
  } catch {
    return '{}';
  }
}
