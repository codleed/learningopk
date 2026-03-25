const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /<base/gi,
  /<form/gi,
  /<input/gi,
  /<button/gi,
  /<svg/gi,
  /<math/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /onfocus\s*=/gi,
  /onblur\s*=/gi,
  /onchange\s*=/gi,
  /onsubmit\s*=/gi,
  /onkeydown\s*=/gi,
  /onkeyup\s*=/gi,
  /onkeypress\s*=/gi
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /(OR|AND)\s+\d+\s*=\s*\d+/i,
  /('\s*(OR|AND)\s*')/i,
  /\bOR\b\s+'?\d+'?\s*=\s*'?/i
];

export interface SanitizationResult {
  sanitized: string;
  hadDangerousContent: boolean;
}

export const sanitizeHtml = (input: string): SanitizationResult => {
  let sanitized = input;
  let hadDangerousContent = false;

  for (const pattern of DANGEROUS_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      hadDangerousContent = true;
      sanitized = sanitized.replace(pattern, "");
    }
  }

  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  return { sanitized, hadDangerousContent };
};

export const sanitizeForSql = (input: string): { sanitized: string; isSuspicious: boolean } => {
  let isSuspicious = false;

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      isSuspicious = true;
      break;
    }
  }

  const sanitized = input
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x00/g, "\\0");

  return { sanitized, isSuspicious };
};

export const sanitizeMessageContent = (content: string): SanitizationResult => {
  if (!content || typeof content !== "string") {
    return { sanitized: "", hadDangerousContent: false };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { sanitized: "", hadDangerousContent: false };
  }

  const htmlResult = sanitizeHtml(trimmed);
  
  const sqlResult = sanitizeForSql(htmlResult.sanitized);

  return {
    sanitized: sqlResult.sanitized.slice(0, 5000),
    hadDangerousContent: htmlResult.hadDangerousContent || sqlResult.isSuspicious
  };
};

export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== "string") {
    return "";
  }

  return query
    .slice(0, 100)
    .replace(/[<>\"']/g, "")
    .trim();
};

export const sanitizeUserGeneratedField = (field: string | null | undefined, maxLength: number = 255): string => {
  if (!field || typeof field !== "string") {
    return "";
  }

  const sanitized = sanitizeHtml(field);
  
  return sanitized.sanitized.slice(0, maxLength).trim();
};

export const validateAndSanitizeMediaUrl = (url: string, allowedDomains: string[]): { valid: boolean; sanitizedUrl: string } => {
  try {
    const parsed = new URL(url);
    
    const isAllowed = allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    });

    if (!isAllowed) {
      return { valid: false, sanitizedUrl: "" };
    }

    const sanitizedUrl = parsed.toString();

    if (parsed.protocol !== "https:" && !allowedDomains.includes(parsed.hostname)) {
      return { valid: false, sanitizedUrl: "" };
    }

    return { valid: true, sanitizedUrl };
  } catch {
    return { valid: false, sanitizedUrl: "" };
  }
};
