/**
 * Generic file download utility
 * Downloads any file from a URL with a custom filename
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Failed to download file:", error);
    throw new Error("Failed to download file");
  }
}

/**
 * Download JSON data as a file
 * Converts object to JSON and downloads it
 */
export function downloadJSON(data: object, filename: string): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download JSON:", error);
    throw new Error("Failed to download JSON file");
  }
}

/**
 * Download text content as a file
 * Creates a text file from string content
 */
export function downloadText(content: string, filename: string): void {
  try {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download text:", error);
    throw new Error("Failed to download text file");
  }
}

/**
 * Copy content to clipboard
 * Uses the modern Clipboard API with fallback
 */
export async function copyToClipboard(content: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    throw new Error("Failed to copy to clipboard");
  }
}

/**
 * Validate URL format
 * Checks if a string is a valid URL
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve relative URL against base URL
 * Handles URL resolution for relative paths
 */
export function resolveURL(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    console.error("Failed to resolve URL:", error);
    throw new Error("Invalid URL resolution");
  }
}

/**
 * Extract domain from URL
 * Gets the hostname from a URL string
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.error("Failed to extract domain:", error);
    throw new Error("Invalid URL for domain extraction");
  }
}

/**
 * Generate filename from URL
 * Creates a safe filename from URL hostname
 */
export function generateFilenameFromURL(url: string, prefix?: string, extension?: string): string {
  try {
    const hostname = extractDomain(url);
    const sanitizedHostname = hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
    
    let filename = prefix ? `${prefix}-${sanitizedHostname}` : sanitizedHostname;
    filename += `-${timestamp}`;
    
    if (extension) {
      filename += extension.startsWith(".") ? extension : `.${extension}`;
    }
    
    return filename;
  } catch (error) {
    console.error("Failed to generate filename:", error);
    const fallback = `file-${Date.now()}`;
    return extension ? `${fallback}${extension}` : fallback;
  }
}

/**
 * Format file size in human readable format
 * Converts bytes to KB, MB, GB etc.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sanitize filename for download
 * Removes or replaces characters that are invalid in filenames
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Check if running in browser environment
 * Useful for SSR-safe code
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Debounce function for search inputs and API calls
 * Delays execution until after wait milliseconds have elapsed
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}