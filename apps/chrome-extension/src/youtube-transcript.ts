// YouTube transcript extraction utilities for Chrome extension

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

interface YouTubeTranscriptResult {
  transcript: string;
  source: 'page' | 'api' | 'captions';
  videoId: string;
  extractedAt: string;
}

/**
 * Extract video ID from YouTube URL
 */
function getYouTubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
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
      if (playerResponseMatch) {
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

/**
 * Extract transcript using YouTube's internal API
 */
async function extractTranscriptFromAPI(videoId: string): Promise<string | null> {
  try {
    // Try to get transcript through YouTube's internal API
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
          source: method.name as 'page' | 'api' | 'captions',
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