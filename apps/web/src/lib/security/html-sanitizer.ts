/**
 * HTML Sanitization module for preventing XSS attacks
 * This module provides secure sanitization of HTML content extracted from external sources
 */

// For server-side, we'll use a simpler approach without DOMPurify + JSDOM
// as it can cause issues in production. We'll implement comprehensive sanitization manually.

interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  stripScripts?: boolean;
  stripComments?: boolean;
}

/**
 * Default safe configuration for HTML sanitization
 */
const DEFAULT_OPTIONS: Required<SanitizationOptions> = {
  allowedTags: [], // By default, strip all HTML tags
  allowedAttributes: {},
  maxLength: 1000,
  stripScripts: true,
  stripComments: true,
};

/**
 * Dangerous patterns that should always be removed
 */
const DANGEROUS_PATTERNS = [
  // Script tags and javascript:
  /<script[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  
  // Dangerous HTML tags
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?<\/embed>/gi,
  /<applet[\s\S]*?<\/applet>/gi,
  /<form[\s\S]*?<\/form>/gi,
  /<input[\s\S]*?>/gi,
  /<button[\s\S]*?<\/button>/gi,
  
  // Style injections
  /<style[\s\S]*?<\/style>/gi,
  /expression\s*\(/gi,
  /@import/gi,
  
  // Meta redirects and refreshes
  /<meta[\s\S]*?http-equiv[\s\S]*?>/gi,
  
  // Comments that might contain code
  /<!--[\s\S]*?-->/g,
  
  // CDATA sections
  /<!\[CDATA\[[\s\S]*?\]\]>/g,
];

/**
 * Patterns for dangerous attributes
 */
const DANGEROUS_ATTRIBUTES = [
  /\son\w+\s*=/gi, // Event handlers
  /\shref\s*=\s*['"]*javascript:/gi,
  /\ssrc\s*=\s*['"]*javascript:/gi,
  /\ssrc\s*=\s*['"]*data:/gi,
  /\sstyle\s*=/gi, // Inline styles can contain expressions
];

/**
 * Remove dangerous HTML patterns and scripts
 */
function removeDangerousPatterns(html: string): string {
  let sanitized = html;
  
  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove dangerous attributes
  DANGEROUS_ATTRIBUTES.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
}

/**
 * Strip all HTML tags except allowed ones
 */
function stripHtmlTags(html: string, allowedTags: string[]): string {
  if (allowedTags.length === 0) {
    // Strip all HTML tags
    return html.replace(/<[^>]*>/g, '');
  }
  
  // Create regex for allowed tags
  const allowedTagsRegex = new RegExp(`<(?!/?(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  return html.replace(allowedTagsRegex, '');
}

/**
 * Remove dangerous attributes from allowed tags
 */
function sanitizeAttributes(html: string, allowedAttributes: Record<string, string[]>): string {
  let sanitized = html;
  
  // For each allowed tag, remove non-allowed attributes
  Object.entries(allowedAttributes).forEach(([tag, attrs]) => {
    const tagRegex = new RegExp(`<${tag}([^>]*)>`, 'gi');
    
    sanitized = sanitized.replace(tagRegex, (match, attributes) => {
      if (!attributes) return `<${tag}>`;
      
      // Extract and filter attributes
      const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
      const validAttrs: string[] = [];
      let attrMatch;
      
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const [, attrName, attrValue] = attrMatch;
        
        if (attrName && attrs.includes(attrName.toLowerCase())) {
          // Additional validation for href and src attributes
          if ((attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') && attrValue) {
            if (isValidUrl(attrValue)) {
              validAttrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
            }
          } else if (attrValue) {
            validAttrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
          }
        }
      }
      
      return validAttrs.length > 0 ? `<${tag} ${validAttrs.join(' ')}>` : `<${tag}>`;
    });
  });
  
  return sanitized;
}

/**
 * Validate URLs to prevent javascript: and data: schemes
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    // For relative URLs, check they don't start with dangerous schemes
    return !url.match(/^(javascript|data|vbscript):/i);
  }
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
}

/**
 * Decode HTML entities safely
 */
function decodeHtmlEntities(text: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };
  
  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });
}

/**
 * Advanced text sanitization with comprehensive XSS protection
 */
function advancedTextSanitization(text: string): string {
  let sanitized = text;
  
  // Remove any HTML/XML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:[^"']*/gi, '');
  sanitized = sanitized.replace(/data:[^"']*/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove script content
  sanitized = sanitized.replace(/&lt;script[\s\S]*?&lt;\/script&gt;/gi, '');
  
  return sanitized;
}

/**
 * Sanitize text content for safe display
 */
export function sanitizeText(text: string | undefined | null, maxLength: number = 1000): string {
  if (!text) return '';
  
  // Convert to string and trim
  let sanitized = String(text).trim();
  
  // Use advanced sanitization for maximum security
  sanitized = advancedTextSanitization(sanitized);
  
  // Additional fallback sanitization
  sanitized = removeDangerousPatterns(sanitized);
  
  // Strip all HTML tags
  sanitized = stripHtmlTags(sanitized, []);
  
  // Decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim() + '...';
  }
  
  // Final cleanup - remove multiple whitespaces and line breaks
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Sanitize HTML content with custom options
 */
export function sanitizeHtml(html: string | undefined | null, options: SanitizationOptions = {}): string {
  if (!html) return '';
  
  const config = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = String(html).trim();
  
  // Length check first
  if (sanitized.length > config.maxLength) {
    sanitized = sanitized.substring(0, config.maxLength);
  }
  
  // Use advanced sanitization for maximum security
  sanitized = advancedTextSanitization(sanitized);
  
  // Additional fallback sanitization
  if (config.stripScripts) {
    sanitized = removeDangerousPatterns(sanitized);
  }
  
  // Strip comments
  if (config.stripComments) {
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Strip HTML tags (additional layer)
  sanitized = stripHtmlTags(sanitized, config.allowedTags);
  
  // Sanitize attributes for allowed tags
  if (config.allowedTags.length > 0) {
    sanitized = sanitizeAttributes(sanitized, config.allowedAttributes);
  }
  
  // Final cleanup
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Sanitize URL for safe usage
 */
export function sanitizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  
  const urlString = String(url).trim();
  
  // Remove dangerous patterns
  const cleaned = removeDangerousPatterns(urlString);
  
  // Validate URL format
  if (!isValidUrl(cleaned)) {
    return null;
  }
  
  return cleaned;
}

/**
 * Sanitize metadata object for OG images
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const sanitized: Record<string, unknown> = {};
  
  // Recursively sanitize object properties
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      // URLs should be sanitized differently
      if (key.toLowerCase().includes('url') || key.toLowerCase().includes('image')) {
        sanitized[key] = sanitizeUrl(value);
      } else {
        sanitized[key] = sanitizeText(value);
      }
    } else if (typeof value === 'number') {
      // Numbers should be safe, but validate range
      if (Number.isFinite(value) && value >= 0 && value <= 10000) {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    }
    // Skip other types (functions, undefined, etc.)
  }
  
  return sanitized;
}

/**
 * Security logging for sanitization events
 */
export function logSanitizationEvent(
  originalContent: string,
  sanitizedContent: string,
  reason: string
): void {
  if (originalContent !== sanitizedContent) {
    const logData = {
      timestamp: new Date().toISOString(),
      event: "CONTENT_SANITIZED",
      reason,
      originalLength: originalContent.length,
      sanitizedLength: sanitizedContent.length,
      charactersRemoved: originalContent.length - sanitizedContent.length,
    };
    
    console.warn("Content sanitization performed:", logData);
  }
}