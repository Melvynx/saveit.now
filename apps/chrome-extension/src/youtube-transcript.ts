// YouTube transcript extraction utilities for Chrome extension

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

interface YouTubeTranscriptResult {
  transcript: string;
  source: 'xhr-interception' | 'page' | 'api' | 'captions';
  videoId: string;
  extractedAt: string;
}

/**
 * Extract video ID from YouTube URL
 */
function getYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] || null : null;
}

/**
 * Check if current page is a YouTube video page
 */
export function isYouTubeVideoPage(): boolean {
  return window.location.hostname.includes('youtube.com') && 
         window.location.pathname === '/watch' && 
         window.location.search.includes('v=');
}

/**
 * Start global interception immediately (call this when script loads)
 */
export function startGlobalInterception() {
  initializeGlobalInterception();
  console.log("🚀 Global URL interception started");
}

/**
 * Extract transcript from YouTube page data
 */
async function extractTranscriptFromPageData(videoId: string): Promise<string | null> {
  try {
    // Method 1: Look for ytInitialPlayerResponse in page scripts
    const scripts = Array.from(document.querySelectorAll('script'));
    
    for (const script of scripts) {
      const content = script.textContent || '';
      
      // Look for ytInitialPlayerResponse
      const playerResponseMatch = content.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captions && captions.length > 0) {
            // Find English captions or first available
            const englishCaption = captions.find((track: any) => 
              track.languageCode === 'en' || track.languageCode === 'en-US'
            ) || captions[0];
            
            if (englishCaption?.baseUrl) {
              const transcriptXml = await fetch(englishCaption.baseUrl).then(r => r.text());
              return parseXmlTranscript(transcriptXml);
            }
          }
        } catch (e) {
          console.warn('Failed to parse ytInitialPlayerResponse:', e);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting transcript from page data:', error);
    return null;
  }
}

// Global URL tracking
let allInterceptedUrls: string[] = [];
let allFetchUrls: string[] = [];
let originalXHROpen: ((method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) => void) | null = null;
let originalXHRSend: ((body?: Document | XMLHttpRequestBodyInit | null) => void) | null = null;
let originalFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null = null;

/**
 * Initialize global URL interception
 */
function initializeGlobalInterception() {
  if (originalXHROpen) return; // Already initialized

  console.log("🔧 Initializing global URL interception...");
  
  // Store original methods
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;
  originalFetch = window.fetch;

  // Intercept XMLHttpRequest (simplified like working code)
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
    (this as any)._url = url;
    const urlString = url.toString();
    allInterceptedUrls.push(urlString);
    console.log(`📡 XHR #${allInterceptedUrls.length}: ${urlString}`);
    return originalXHROpen!.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    if ((this as any)._url && (this as any)._url.includes("/api/timedtext")) {
      console.log("🎯 TIMEDTEXT XHR detected:", (this as any)._url);
    }
    return originalXHRSend!.apply(this, arguments as any);
  };

  // Intercept fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();
    allFetchUrls.push(url);
    console.log(`🌐 FETCH #${allFetchUrls.length}: ${url}`);
    
    return originalFetch!.apply(this, arguments as any);
  };

  console.log("✅ Global URL interception initialized");
}

/**
 * Extract transcript using XHR interception method (via injected script)
 */
async function extractTranscriptFromXHRInterception(): Promise<string | null> {
  return new Promise((resolve) => {
    console.log("🚀 Injecting XHR interception script into page...");

    // Listen for messages from the injected script
    const messageListener = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'TRANSCRIPT_EXTRACTED') {
        console.log("✅ Received transcript from injected script:", event.data.transcript);
        window.removeEventListener('message', messageListener);
        resolve(event.data.transcript);
      }
      
      if (event.data.type === 'TRANSCRIPT_URL_INTERCEPTED') {
        console.log("📡 URL intercepted from page:", event.data.url);
      }
    };

    window.addEventListener('message', messageListener);

    // Inject the interception script into the page
    const script = document.createElement('script');
    script.src = (chrome as any).runtime.getURL('intercept.js');
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log("✅ Intercept script injected successfully");
    };
    
    script.onerror = () => {
      console.error("❌ Failed to inject intercept script");
      window.removeEventListener('message', messageListener);
      resolve(null);
    };

    document.documentElement.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      console.warn("⚠️ Timeout waiting for transcript");
      window.removeEventListener('message', messageListener);
      resolve(null);
    }, 10000);
  });
}

/**
 * Extract transcript using YouTube's internal API (fallback)
 */
async function extractTranscriptFromAPI(videoId: string): Promise<string | null> {
  try {
    const apiUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`;
    
    const response = await fetch(apiUrl, {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.events) {
        return formatTranscriptFromEvents(data.events);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting transcript from API:', error);
    return null;
  }
}

/**
 * Extract transcript from caption elements on the page
 */
function extractTranscriptFromCaptions(): string | null {
  try {
    // Look for caption elements that might be rendered
    const captionSelectors = [
      '.ytp-caption-segment',
      '.captions-text',
      '.caption-line-time'
    ];
    
    for (const selector of captionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const transcript = Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .join(' ');
        
        if (transcript.length > 100) { // Ensure we have substantial content
          return transcript;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting transcript from captions:', error);
    return null;
  }
}

/**
 * Parse XML transcript format
 */
function parseXmlTranscript(xmlContent: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const textNodes = xmlDoc.querySelectorAll('text');
    
    const entries: TranscriptEntry[] = [];
    
    textNodes.forEach(node => {
      const start = parseFloat(node.getAttribute('start') || '0');
      const duration = parseFloat(node.getAttribute('dur') || '0');
      const text = node.textContent || '';
      
      if (text.trim()) {
        entries.push({ text: text.trim(), start, duration });
      }
    });
    
    return formatTranscriptEntries(entries);
  } catch (error) {
    console.error('Error parsing XML transcript:', error);
    return '';
  }
}

/**
 * Format transcript from YouTube API events
 */
function formatTranscriptFromEvents(events: any[]): string {
  try {
    const entries: TranscriptEntry[] = [];
    
    events.forEach(event => {
      if (event.segs) {
        const start = event.tStartMs / 1000;
        const text = event.segs.map((seg: any) => seg.utf8).join('');
        
        if (text.trim()) {
          entries.push({ 
            text: text.trim(), 
            start, 
            duration: event.dDurationMs / 1000 
          });
        }
      }
    });
    
    return formatTranscriptEntries(entries);
  } catch (error) {
    console.error('Error formatting transcript from events:', error);
    return '';
  }
}

/**
 * Format transcript entries with timestamps
 */
function formatTranscriptEntries(entries: TranscriptEntry[]): string {
  return entries
    .map(entry => {
      const minutes = Math.floor(entry.start / 60);
      const seconds = Math.floor(entry.start % 60);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `[${timestamp}] ${entry.text}`;
    })
    .join('\n');
}

/**
 * Main function to extract YouTube transcript
 */
export async function extractYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult | null> {
  const videoId = getYouTubeVideoId(url);
  
  if (!videoId) {
    console.warn('Could not extract video ID from URL:', url);
    return null;
  }
  
  console.log('Attempting to extract transcript for video:', videoId);
  
  // Try multiple extraction methods in order of preference
  const methods = [
    { name: 'xhr-interception', fn: () => extractTranscriptFromXHRInterception() },
    { name: 'page', fn: () => extractTranscriptFromPageData(videoId) },
    { name: 'api', fn: () => extractTranscriptFromAPI(videoId) },
    { name: 'captions', fn: () => extractTranscriptFromCaptions() }
  ];
  
  for (const method of methods) {
    try {
      console.log(`Trying transcript extraction method: ${method.name}`);
      const transcript = await method.fn();
      
      if (transcript && transcript.length > 50) { // Ensure substantial content
        console.log(`Successfully extracted transcript using method: ${method.name}`);
        return {
          transcript,
          source: method.name as 'xhr-interception' | 'page' | 'api' | 'captions',
          videoId,
          extractedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn(`Failed to extract transcript using method ${method.name}:`, error);
    }
  }
  
  console.warn('Failed to extract transcript using all methods');
  return null;
}

/**
 * Wait for YouTube player to be ready
 */
export function waitForYouTubePlayer(timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkPlayer = () => {
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }
      
      // Check if YouTube player is loaded
      const player = document.querySelector('#movie_player, .html5-video-player');
      const video = document.querySelector('video');
      
      if (player && video) {
        resolve(true);
      } else {
        setTimeout(checkPlayer, 500);
      }
    };
    
    checkPlayer();
  });
}