import { z } from "zod";

// Base request interface for all tools
export interface BaseToolRequest {
  url?: string;
  [key: string]: unknown;
}

// Base response interface for all tools
export interface BaseToolResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

// Common error types
export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Rate limiting response
export interface RateLimitResponse {
  success: false;
  error: "RATE_LIMIT_EXCEEDED";
  retryAfter: number;
  limit: number;
  remaining: number;
}

// Validation error response
export interface ValidationErrorResponse {
  success: false;
  error: "VALIDATION_ERROR";
  issues: Array<{
    field: string;
    message: string;
  }>;
}

// Network error response
export interface NetworkErrorResponse {
  success: false;
  error: "NETWORK_ERROR";
  message: string;
  statusCode?: number;
}

// Generic API error response
export interface APIErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

// Union type for all possible error responses
export type ToolErrorResponse = 
  | RateLimitResponse 
  | ValidationErrorResponse 
  | NetworkErrorResponse 
  | APIErrorResponse;

// Success response wrapper
export interface ToolSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

// Generic tool response
export type ToolResponse<T = unknown> = ToolSuccessResponse<T> | ToolErrorResponse;

// Common metadata types that can be reused across tools
export interface MetaTag {
  name: string;
  content: string;
  property?: string;
}

export interface ImageMetadata {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
  size?: number;
}

export interface LinkMetadata {
  url: string;
  rel: string;
  type?: string;
  href: string;
}

// Base schemas for validation
export const baseUrlSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export const baseResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
});

// Tool configuration interface
export interface ToolConfig {
  name: string;
  description: string;
  version: string;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validation?: {
    maxUrlLength?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  };
}

// Tool analytics data
export interface ToolAnalytics {
  toolName: string;
  action: string;
  success: boolean;
  duration: number;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
}

// File download metadata
export interface DownloadMetadata {
  filename: string;
  size: number;
  type: string;
  url: string;
  downloadedAt: string;
}

// Common social media metadata (can be extended for specific platforms)
export interface SocialMetadata {
  title?: string;
  description?: string;
  image?: ImageMetadata;
  site?: string;
  creator?: string;
  type?: string;
}

// Website analysis result (reusable across tools)
export interface WebsiteAnalysis {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  language?: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  loadTime?: number;
  statusCode: number;
  redirectChain?: string[];
  headers: Record<string, string>;
  analyzedAt: string;
}

export type ToolName = 
  | "og-images"
  | "meta-tags"
  | "seo-analyzer"
  | "link-checker"
  | "screenshot"
  | "performance"
  | "accessibility";

export interface ToolUsage {
  toolName: ToolName;
  requestCount: number;
  lastUsed: string;
  averageResponseTime: number;
}

// HTTP Status categories for API responses
export type HTTPStatus = {
  1: "Informational";
  2: "Success";
  3: "Redirection";
  4: "Client Error";
  5: "Server Error";
};

// Common tool states
export type ToolState = "idle" | "loading" | "success" | "error";

// Tool result with loading states
export interface ToolResult<T = unknown> {
  state: ToolState;
  data?: T;
  error?: string;
  loading?: boolean;
}

// URL analysis types that can be reused
export interface URLAnalysisResult {
  isValid: boolean;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  searchParams?: Record<string, string>;
  hash?: string;
  port?: string;
}

// Common form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Tool performance metrics
export interface ToolPerformance {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
  apiCalls?: number;
}

// Common tool options interface
export interface ToolOptions {
  timeout?: number;
  retries?: number;
  validateSSL?: boolean;
  followRedirects?: boolean;
  userAgent?: string;
  maxResponseSize?: number;
}