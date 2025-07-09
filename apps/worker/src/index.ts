import puppeteer from "@cloudflare/puppeteer";
import {
  ExportedHandler,
  Fetcher,
  KVNamespace,
} from "@cloudflare/workers-types";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

interface Env {
  MYBROWSER: Fetcher;
  BROWSER: Fetcher;
  SAVEIT_KV: KVNamespace;
}

interface YouTubeMetadata {
  title: string;
  thumbnail: string;
  transcript?: string;
}

const QUALITY = 1;

export default {
  async fetch(request, env, ctx): Promise<any> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // Gestion des routes en fonction du pathname
    if (pathname.includes("/youtube")) {
      return handleYouTube?.(request, env, ctx);
    } else if (pathname.includes("/pdf")) {
      return handlePDF?.(request, env, ctx);
    } else {
      // Par défaut ou /screenshot
      return handleScreenshot?.(request, env, ctx);
    }
  },
} satisfies ExportedHandler<Env>;

// Gestion des captures d'écran
const handleScreenshot: ExportedHandler<Env>["fetch"] = async (
  request,
  env,
): Promise<any> => {
  const { searchParams } = new URL(request.url);

  let url = searchParams?.get("url");

  let img: any;
  if (url) {
    url = new URL(url).toString(); // normalize
    img = await env.SAVEIT_KV.get(url, { type: "arrayBuffer" });
    if (img === null) {
      const browser = await puppeteer.launch(env.MYBROWSER as any);
      const page = await browser.newPage();
      await page.setViewport({
        width: 1280 * QUALITY,
        height: 720 * QUALITY,
      });
      try {
        await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
      } catch {
        console.error("Can't finish the load");
      }

      // Hide scrollbar
      await page.evaluate(() => {
        try {
          const html = document.querySelector("html");
          if (html) {
            html.style.overflow = "hidden";
          }
          // Use createElement instead of insertAdjacentHTML to avoid TrustedHTML error
          const style = document.createElement("style");
          style.textContent = "::-webkit-scrollbar { display: none; }";
          document.head.appendChild(style);
        } catch (error) {
          console.error("Error hiding scrollbar:", error);
        }
      });
      img = (await page.screenshot()) as Buffer;
      await env.SAVEIT_KV.put(url, img, {
        expirationTtl: 60 * 60 * 24,
      });
      await browser.close();
    }

    return new Response(img, {
      headers: {
        "content-type": "image/jpeg",
      },
    });
  } else {
    return new Response("Please add an ?url=https://example.com/ parameter");
  }
};

// Gestion des métadonnées YouTube
const handleYouTube: ExportedHandler<Env>["fetch"] = async (
  request,
  env,
): Promise<any> => {
  console.log("handleYouTube");
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return new Response(
      JSON.stringify({ error: "Missing videoId parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Check if we have cached data
  // const cachedData = await env.SAVEIT_KV.get(`youtube:${videoId}`, {
  //   type: "json",
  // });
  // if (cachedData) {
  //   return new Response(JSON.stringify(cachedData), {
  //     headers: { "Content-Type": "application/json" },
  //   });
  // }

  try {
    // Récupérer les métadonnées de la vidéo via l'API YouTube oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await fetch(oembedUrl);

    if (!oembedResponse.ok) {
      throw new Error(
        `Failed to fetch video metadata: ${oembedResponse.statusText}`,
      );
    }

    const oembedData = await oembedResponse.json();

    console.log("oembedData", oembedData);

    // Construire l'URL de la miniature (thumbnail)
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    const metadata: YouTubeMetadata = {
      title: oembedData.title || "Untitled Video",
      thumbnail: thumbnailUrl,
    };

    // Récupérer la transcription
    try {
      const transcriptResponse =
        await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptResponse && transcriptResponse.length > 0) {
        metadata.transcript = transcriptResponse
          .map((entry) => `[${formatTime(entry.offset)}] ${entry.text}`)
          .join("\n");
      }
    } catch (error) {
      // Transcript may not be available, continue without it
      console.error("Failed to get transcript:", error);
    }

    // Cache the result for 24 hours
    await env.SAVEIT_KV.put(`youtube:${videoId}`, JSON.stringify(metadata), {
      expirationTtl: 60 * 60 * 24,
    });

    return new Response(JSON.stringify(metadata), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing YouTube video:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to extract YouTube metadata",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// Gestion des PDFs
const handlePDF: ExportedHandler<Env>["fetch"] = async (
  request,
  env,
): Promise<any> => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate URL
    new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const browser = await puppeteer.launch(env.MYBROWSER as any);
    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 720,
    });

    // Use PDF.js to render PDF without browser UI
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: white; }
            #pdfContainer { 
              width: 100vw; 
              height: 100vh; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
            }
            canvas { 
              max-width: 100%; 
              max-height: 100%; 
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div id="pdfContainer">
            <canvas id="pdfCanvas"></canvas>
          </div>
          <script src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            
            async function renderPDF() {
              try {
                // Check if PDF.js is loaded
                if (typeof pdfjsLib === 'undefined') {
                  throw new Error('PDF.js library not loaded');
                }
                
                const pdf = await pdfjsLib.getDocument('${encodeURI(url)}').promise;
                const page = await pdf.getPage(1);
                
                const canvas = document.getElementById('pdfCanvas');
                const context = canvas.getContext('2d');
                
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                  canvasContext: context,
                  viewport: viewport
                }).promise;
                
                window.pdfLoaded = true;
              } catch (error) {
                console.error('Error rendering PDF:', error);
                window.pdfError = true;
              }
            }
            
            // Wait for PDF.js to load before rendering
            if (typeof pdfjsLib !== 'undefined') {
              renderPDF();
            } else {
              window.addEventListener('load', renderPDF);
            }
          </script>
        </body>
      </html>
    `;

    try {
      await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`, {
        waitUntil: "networkidle0",
        timeout: 15000,
      });
      
      // Wait for PDF to load
      await page.waitForFunction(
        () => window.pdfLoaded === true || window.pdfError === true,
        { timeout: 15000 }
      );
      
      const hasError = await page.evaluate(() => window.pdfError);
      if (hasError) {
        throw new Error("PDF rendering failed");
      }
      
    } catch (error) {
      console.error("Error loading PDF:", error);
    }

    const jpeg = await page.screenshot({
      type: "jpeg",
      quality: 80,
    });

    await page.close();
    await browser.close();

    return new Response(jpeg, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate PDF screenshot",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// Helper pour formater le temps en secondes vers MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
