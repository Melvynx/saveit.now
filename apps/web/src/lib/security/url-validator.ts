import { z } from "zod";

interface ValidationResult {
  isValid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Private IP ranges to block for SSRF protection
 */
const PRIVATE_IP_RANGES = [
  // Loopback addresses
  /^127\./,
  /^::1$/,
  // Private IPv4 ranges (RFC 1918)
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  // Link-local addresses
  /^169\.254\./,
  /^fe80:/i,
  // Multicast addresses
  /^224\./,
  /^ff00:/i,
  // Cloud metadata services
  /^169\.254\.169\.254$/, // AWS, Google Cloud, Azure
  /^100\.100\.100\.200$/, // Alibaba Cloud
  /^metadata\.google\.internal$/, // Google Cloud DNS name
];

/**
 * Hostnames that should be blocked
 */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "instance-data.ec2.internal",
  "metadata.tencentyun.com",
  "100.100.100.200", // Alibaba Cloud
];

/**
 * Allowed protocols for security
 */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Validates if an IP address is private/internal
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => range.test(ip));
}

/**
 * Validates if a hostname should be blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  
  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(normalizedHostname)) {
    return true;
  }
  
  // Check if hostname is an IP address
  if (isPrivateIP(normalizedHostname)) {
    return true;
  }
  
  return false;
}

/**
 * Resolves hostname to IP and checks if it's private
 * Note: In a production environment, you might want to use dns.promises.resolve()
 * but for web environments, we rely on URL validation and hostname checking
 */
async function validateHostnameResolution(hostname: string): Promise<boolean> {
  // For now, we'll do basic hostname validation
  // In a Node.js environment, you could resolve DNS here
  return !isBlockedHostname(hostname);
}

/**
 * Comprehensive URL validation with SSRF protection
 */
export async function validateUrl(urlString: string): Promise<ValidationResult> {
  try {
    // Basic URL format validation
    const urlSchema = z.string().url("Invalid URL format");
    const validatedUrl = urlSchema.parse(urlString);
    
    // Parse URL
    let url: URL;
    try {
      url = new URL(validatedUrl);
    } catch {
      return {
        isValid: false,
        error: "Invalid URL format"
      };
    }
    
    // Protocol validation
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        isValid: false,
        error: `Protocol ${url.protocol} is not allowed. Only HTTP and HTTPS are permitted.`
      };
    }
    
    // Port validation - block commonly dangerous ports
    const dangerousPorts = [22, 23, 25, 53, 135, 139, 445, 993, 995, 1433, 1521, 3306, 3389, 5432, 5984, 6379, 9200, 11211, 27017];
    const port = url.port ? parseInt(url.port) : (url.protocol === "https:" ? 443 : 80);
    
    if (dangerousPorts.includes(port)) {
      return {
        isValid: false,
        error: `Port ${port} is not allowed for security reasons.`
      };
    }
    
    // Hostname validation
    const hostname = url.hostname.toLowerCase();
    
    // Check for blocked hostnames and private IPs
    if (isBlockedHostname(hostname)) {
      return {
        isValid: false,
        error: "Access to private/internal addresses is not allowed."
      };
    }
    
    // Additional hostname resolution validation
    const isHostnameValid = await validateHostnameResolution(hostname);
    if (!isHostnameValid) {
      return {
        isValid: false,
        error: "Hostname resolution blocked for security reasons."
      };
    }
    
    // URL length validation
    if (urlString.length > 2048) {
      return {
        isValid: false,
        error: "URL is too long (maximum 2048 characters)."
      };
    }
    
    // Check for suspicious URL patterns
    const suspiciousPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/,
      /\[::]/,
      /metadata/i,
      /instance-data/i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(urlString))) {
      return {
        isValid: false,
        error: "URL contains suspicious patterns and is blocked."
      };
    }
    
    return {
      isValid: true,
      url
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || "Invalid URL format"
      };
    }
    
    return {
      isValid: false,
      error: "URL validation failed"
    };
  }
}

/**
 * Security logging for attack attempts
 */
export function logSecurityViolation(
  urlString: string, 
  reason: string, 
  userAgent?: string,
  ip?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event: "SSRF_ATTEMPT_BLOCKED",
    url: urlString,
    reason,
    userAgent,
    ip,
  };
  
  console.warn("Security violation detected:", logData);
  
  // In production, you might want to send this to a security monitoring service
  // e.g., send to PostHog, Sentry, or dedicated security service
}