import puppeteer from "@cloudflare/puppeteer";
import {
  ExportedHandler,
  Fetcher,
  KVNamespace,
} from "@cloudflare/workers-types";

interface Env {
  MYBROWSER: Fetcher;
  SAVEIT_KV: KVNamespace;
}

const QUALITY = 1.5;

export default {
  async fetch(request, env): Promise<any> {
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
        await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
        // Hide scrollbar
        await page.evaluate(() => {
          const html = document.querySelector("html");
          if (html) {
            html.style.overflow = "hidden";
          }
          document.head.insertAdjacentHTML(
            "beforeend",
            "<style>::-webkit-scrollbar { display: none; }</style>"
          );
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
  },
} satisfies ExportedHandler<Env>;
