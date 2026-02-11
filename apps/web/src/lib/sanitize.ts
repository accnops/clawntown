import filter from 'leo-profanity';

export interface SanitizeResult {
  ok: boolean;
  sanitized: string;
  reason?: string;
  category?: string;
}

const MAX_LENGTH = 1000;

// URL patterns
const URL_PATTERNS = [
  /https?:\/\/\S+/gi,
  /www\.\S+/gi,
  /\S+\.(com|org|net|io|dev|co|me|info|biz|xyz|app|gg|tv|us|uk|ca|au|de|fr)\b\S*/gi,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/\S*)?/g,
  /\[([^\]]*)\]\([^)]*\)/g, // markdown links — replace with link text
  /<a\b[^>]*>(.*?)<\/a>/gi, // HTML links — replace with inner text
];

// Code patterns
const CODE_PATTERNS = [
  /```[\s\S]*?```/g,
  /`[^`]+`/g,
  /<\/?[a-z][a-z0-9]*\b[^>]*>/gi,
  /javascript:/gi,
  /data:[a-z]+\/[a-z]+/gi,
  /\bon\w+\s*=/gi,
];

const CODE_KEYWORDS = [
  /\bfunction\s*\(/gi,
  /\b(const|let|var)\s+\w+\s*=/gi,
  /\b(import|export)\s+/gi,
  /\brequire\s*\(/gi,
  /\beval\s*\(/gi,
  /\bconsole\.\w+/gi,
  /\bdocument\.\w+/gi,
  /\bwindow\.\w+/gi,
  /\bprocess\.\w+/gi,
];

// Prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
  /you\s+are\s+now\b/gi,
  /act\s+as\s+(a|an|if)\b/gi,
  /\bsystem\s*prompt\b/gi,
  /\bjailbreak\b/gi,
  /\[SYSTEM\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /^-{3,}\s*$/gm,
  /^={3,}\s*$/gm,
  /^#{3,}\s+/gm,
  /\bdo\s+not\s+follow\s+(your|the)\s+(rules|instructions)\b/gi,
  /\boverride\s+(your|the|all)\s+(instructions|rules|programming)\b/gi,
  /\bforget\s+(your|all|previous)\s+(instructions|rules|programming)\b/gi,
  /\bnew\s+instructions\b/gi,
  /\bDAN\s+mode\b/gi,
  /\bdeveloper\s+mode\b/gi,
];

export function sanitizeMessage(raw: string): SanitizeResult {
  // 1. Length check
  if (raw.length > MAX_LENGTH) {
    return {
      ok: false,
      sanitized: '',
      reason: "That's quite the speech! Please keep messages under 1000 characters.",
      category: 'length',
    };
  }

  let text = raw;

  // 2. Strip URLs (markdown links → keep link text)
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
  for (const pattern of URL_PATTERNS.slice(0, 4)) {
    text = text.replace(pattern, '');
  }

  // 3. Strip code
  for (const pattern of CODE_PATTERNS) {
    text = text.replace(pattern, '');
  }
  for (const pattern of CODE_KEYWORDS) {
    text = text.replace(pattern, '');
  }

  // 4. Profanity check (on stripped text)
  if (filter.check(text)) {
    return {
      ok: false,
      sanitized: '',
      reason: "Whoa there, citizen! That language isn't welcome in Clawntown.",
      category: 'profanity',
    };
  }

  // 5. Prompt injection detection (on original raw input)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        ok: false,
        sanitized: '',
        reason: "Nice try, citizen! That kind of message isn't allowed in Clawntown.",
        category: 'injection',
      };
    }
  }

  // 6. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 7. Empty check
  if (!text) {
    return {
      ok: false,
      sanitized: '',
      reason: "Your message seems empty after cleanup. Try saying something else!",
      category: 'empty',
    };
  }

  return { ok: true, sanitized: text };
}
