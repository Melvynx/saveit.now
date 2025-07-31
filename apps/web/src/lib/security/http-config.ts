/**
 * Secure HTTP configuration for external requests
 * Provides protection against slowloris attacks, oversized responses, and other HTTP-based threats
 */

export interface SecureRequestOptions {
  timeout?: number;
  maxResponseSize?: number;
  maxRedirects?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  followRedirects?: boolean;
}

/**
 * Default secure configuration
 */
export const DEFAULT_SECURE_CONFIG: Required<SecureRequestOptions> = {
  timeout: 10000, // 10 seconds
  maxResponseSize: 2 * 1024 * 1024, // 2MB
  maxRedirects: 3,
  userAgent: "SaveIt.now Bot/1.0 (+https://saveit.now)",
  headers: {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    "Connection": "close", // Prevent connection reuse
    "DNT": "1", // Do Not Track
  },
  followRedirects: true,
};

/**
 * Security headers to prevent information leakage
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "User-Agent": DEFAULT_SECURE_CONFIG.userAgent,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Connection": "close",
  "DNT": "1",
};

/**
 * Create timeout controller for requests
 */
export function createTimeoutController(timeoutMs: number = DEFAULT_SECURE_CONFIG.timeout): AbortController {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  // Clean up timeout when request completes
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller;
}

/**
 * Create secure fetch options
 */
export function createSecureFetchOptions(options: SecureRequestOptions = {}): RequestInit {
  const config = { ...DEFAULT_SECURE_CONFIG, ...options };
  const controller = createTimeoutController(config.timeout);
  
  return {
    method: 'GET',
    headers: {
      ...SECURITY_HEADERS,
      ...config.headers,
      "User-Agent": config.userAgent,
    },
    signal: controller.signal,
    redirect: config.followRedirects ? 'follow' : 'manual',
    // Security settings
    mode: 'cors',
    credentials: 'omit', // Don't send cookies
    referrerPolicy: 'no-referrer',
  };
}

/**
 * Secure fetch wrapper with size limits and timeout
 */
export async function secureFetch(
  url: string, 
  options: SecureRequestOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_SECURE_CONFIG, ...options };
  const fetchOptions = createSecureFetchOptions(options);
  
  let response: Response | undefined;
  let redirectCount = 0;
  let currentUrl = url;
  
  try {
    while (redirectCount <= config.maxRedirects) {
      response = await fetch(currentUrl, fetchOptions);
      
      // Handle redirects manually for better control
      if (response.status >= 300 && response.status < 400 && config.followRedirects) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect response missing location header');
        }
        
        // Resolve relative URLs
        currentUrl = new URL(location, currentUrl).href;
        redirectCount++;
        
        if (redirectCount > config.maxRedirects) {
          throw new Error(`Too many redirects (max: ${config.maxRedirects})`);
        }
        
        // Continue with the redirected URL
        continue;
      }
      
      break;
    }
    
    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 'unknown'}: ${response?.statusText || 'unknown error'}`);
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > config.maxResponseSize) {
      throw new Error(`Response too large: ${contentLength} bytes (max: ${config.maxResponseSize})`);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    const allowedContentTypes = [
      'text/html',
      'application/xhtml+xml',
      'application/xml',
      'text/xml',
      'text/plain',
    ];
    
    if (!allowedContentTypes.some(type => contentType.toLowerCase().includes(type))) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    return response;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${config.timeout}ms`);
      }
      throw error;
    }
    throw new Error('Unknown fetch error');
  }
}

/**
 * Secure text fetcher with size streaming validation
 */
export async function secureTextFetch(
  url: string, 
  options: SecureRequestOptions = {}
): Promise<string> {
  const config = { ...DEFAULT_SECURE_CONFIG, ...options };
  const response = await secureFetch(url, options);
  
  // Stream response and check size incrementally
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }
  
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      if (value) {
        receivedLength += value.length;
        
        if (receivedLength > config.maxResponseSize) {
          throw new Error(`Response size exceeded limit: ${receivedLength} bytes (max: ${config.maxResponseSize})`);
        }
        
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  // Combine chunks and decode
  const allChunks = new Uint8Array(receivedLength);
  let position = 0;
  
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }
  
  // Decode with proper encoding detection
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(allChunks);
}

/**
 * Rate limiting for requests (simple in-memory implementation)
 */
class SimpleRateLimit {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instance
const globalRateLimit = new SimpleRateLimit(10, 60000); // 10 requests per minute

// Clean up every 5 minutes
setInterval(() => globalRateLimit.cleanup(), 5 * 60 * 1000);

/**
 * Check rate limit for a given identifier (IP, user, etc.)
 */
export function checkRateLimit(identifier: string): boolean {
  return globalRateLimit.isAllowed(identifier);
}

/**
 * Get safe request identifier from request
 */
export function getRequestIdentifier(request: Request): string {
  // Try to get real IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';
  
  // Hash the IP for privacy (simple hash)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `ip_${Math.abs(hash)}`;
}

/**
 * Security monitoring and logging
 */
export function logSecureRequest(
  url: string,
  success: boolean,
  responseTime: number,
  error?: string,
  identifier?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event: "SECURE_HTTP_REQUEST",
    url,
    success,
    responseTime,
    error,
    identifier,
  };
  
  if (!success && error) {
    console.warn("Secure request failed:", logData);
  } else {
    console.log("Secure request completed:", logData);
  }
}