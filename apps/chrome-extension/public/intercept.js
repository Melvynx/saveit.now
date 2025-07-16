/**
 * YouTube Transcript Extraction Script
 * 
 * PRIVACY NOTICE: This script is designed to extract public captions/transcripts 
 * from YouTube videos for accessibility and content analysis purposes only.
 * 
 * WHAT THIS SCRIPT DOES:
 * - Intercepts YouTube's public transcript API requests (/api/timedtext)
 * - Extracts publicly available captions/subtitles from videos
 * - Does NOT access any personal data, login information, or private content
 * - Does NOT collect user information, browsing history, or personal details
 * - Only processes transcript text that is already publicly available on YouTube
 * 
 * WHAT THIS SCRIPT DOES NOT DO:
 * - Does NOT access private or personal user data
 * - Does NOT track user behavior or browsing habits
 * - Does NOT collect authentication tokens or login credentials
 * - Does NOT access content from private or restricted videos
 * - Does NOT modify YouTube's functionality beyond transcript extraction
 * 
 * DATA HANDLING:
 * - Only processes public transcript data from YouTube's official API
 * - Transcript data is used for content analysis and accessibility features
 * - No personal information is collected, stored, or transmitted
 * 
 * This script operates within YouTube's public API framework and respects
 * all content visibility settings. It only accesses content that is already
 * publicly available to users viewing the video.
 */

(async () => {
  // Clear console for clean logging during development
  console.clear();
  console.log("🚀 Starting YouTube transcript extraction...");

  // Variable to store the intercepted transcript URL
  let transcriptUrl = null;

  // Store original XMLHttpRequest methods to restore later
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  /**
   * Intercept XMLHttpRequest.open to capture URLs
   * This is necessary because YouTube loads transcripts via AJAX calls
   * We only monitor requests to the public transcript API endpoint
   */
  XMLHttpRequest.prototype.open = function (method, url) {
    // Store the URL on the request object for later inspection
    this._url = url;
    // Call the original open method to maintain normal functionality
    return originalOpen.apply(this, arguments);
  };

  /**
   * Intercept XMLHttpRequest.send to identify transcript requests
   * We only capture URLs that contain "/api/timedtext" which is
   * YouTube's public transcript API endpoint
   */
  XMLHttpRequest.prototype.send = function () {
    // Check if this request is for transcript data (public API)
    if (this._url.includes("/api/timedtext")) {
      transcriptUrl = this._url;
      console.log("📡 Found public transcript API request:", transcriptUrl);
    }
    // Call the original send method to maintain normal functionality
    return originalSend.apply(this, arguments);
  };

  // Locate the YouTube subtitle button in the player interface
  const button = document.querySelector(".ytp-subtitles-button.ytp-button");
  if (!button) {
    console.error("❌ Subtitle button not found. Video may not have captions.");
    return;
  }

  /**
   * Trigger subtitle loading by clicking the subtitle button
   * Double-clicking ensures the transcript API request is made
   * This simulates normal user interaction with YouTube's interface
   */
  console.log("🖱️ Activating subtitles to load transcript data...");
  button.click(); // First click to enable subtitles
  await new Promise((r) => setTimeout(r, 500)); // Wait for UI update
  button.click(); // Second click to ensure transcript loading
  await new Promise((r) => setTimeout(r, 1500)); // Wait for API request

  // Check if we successfully intercepted a transcript URL
  if (!transcriptUrl) {
    console.warn("⚠️ No transcript API request detected. Video may not have captions.");
    return;
  }

  /**
   * Fetch the transcript data from YouTube's public API
   * This uses the same URL that YouTube uses internally
   * No authentication or private data access is involved
   */
  console.log("🌐 Fetching public transcript data...");
  const res = await fetch(transcriptUrl);
  if (!res.ok) {
    console.error("❌ Failed to fetch transcript data:", res.status);
    return;
  }

  // Determine the response format (JSON or XML)
  const contentType = res.headers.get("Content-Type") || "";
  let transcript = "";

  /**
   * Parse transcript data based on YouTube's response format
   * YouTube may return transcripts in JSON or XML format
   * We handle both formats to extract the text content
   */
  if (contentType.includes("json")) {
    // Handle JSON format (newer YouTube API responses)
    const json = await res.json();
    transcript = json.events
      ?.flatMap((e) => e.segs?.map((s) => s.utf8) || [])
      .join(" ")
      .trim();
  } else {
    // Handle XML format (legacy YouTube API responses)
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    transcript = [...doc.querySelectorAll("text")]
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join(" ");
  }

  console.log("✅ Successfully extracted transcript:", transcript ? "Found content" : "No content found");
  
  /**
   * Send the extracted transcript to the Chrome extension
   * This uses the secure postMessage API to communicate with the extension
   * Only the transcript text is transmitted - no personal data
   */
  window.postMessage({
    type: 'TRANSCRIPT_EXTRACTED',
    transcript: transcript || null
  }, '*');

  // Restore original XMLHttpRequest methods to avoid interfering with YouTube
  XMLHttpRequest.prototype.open = originalOpen;
  XMLHttpRequest.prototype.send = originalSend;
  
  console.log("🔧 Restored original XMLHttpRequest functionality");
})();
