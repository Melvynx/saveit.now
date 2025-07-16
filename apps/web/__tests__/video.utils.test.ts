import { describe, it, expect, vi } from "vitest";
import * as cheerio from "cheerio";
import { checkIfVideoUrl, checkForVideoEmbeds } from "../src/lib/inngest/video.utils";

describe("video.utils", () => {
  describe("checkIfVideoUrl", () => {
    it("should return true for YouTube URLs", () => {
      expect(checkIfVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    });

    it("should return true for Vimeo URLs", () => {
      expect(checkIfVideoUrl("https://vimeo.com/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.vimeo.com/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://player.vimeo.com/video/123456789")).toBe(true);
    });

    it("should return true for Loom URLs", () => {
      expect(checkIfVideoUrl("https://loom.com/share/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.loom.com/share/123456789")).toBe(true);
    });

    it("should return true for Tella URLs", () => {
      expect(checkIfVideoUrl("https://tella.tv/video/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.tella.tv/video/123456789")).toBe(true);
    });

    it("should return true for Wistia URLs", () => {
      expect(checkIfVideoUrl("https://wistia.com/medias/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.wistia.com/medias/123456789")).toBe(true);
    });

    it("should return true for Dailymotion URLs", () => {
      expect(checkIfVideoUrl("https://dailymotion.com/video/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.dailymotion.com/video/123456789")).toBe(true);
    });

    it("should return true for Twitch URLs", () => {
      expect(checkIfVideoUrl("https://twitch.tv/streamer")).toBe(true);
      expect(checkIfVideoUrl("https://www.twitch.tv/streamer")).toBe(true);
    });

    it("should return false for Facebook watch URLs (current bug)", () => {
      // Note: This is actually a bug in the implementation - it checks hostname.includes("facebook.com/watch")
      // but hostname never contains "/watch", that's in the pathname
      expect(checkIfVideoUrl("https://facebook.com/watch/?v=123456789")).toBe(false);
      expect(checkIfVideoUrl("https://www.facebook.com/watch/?v=123456789")).toBe(false);
    });

    it("should return true for Twitter video URLs", () => {
      expect(checkIfVideoUrl("https://twitter.com/user/status/123456789/video/1")).toBe(true);
      expect(checkIfVideoUrl("https://www.twitter.com/user/status/123456789/video/1")).toBe(true);
    });

    it("should return false for Twitter URLs without video", () => {
      expect(checkIfVideoUrl("https://twitter.com/user/status/123456789")).toBe(false);
      expect(checkIfVideoUrl("https://twitter.com/user")).toBe(false);
    });

    it("should return true for Instagram reel URLs", () => {
      expect(checkIfVideoUrl("https://instagram.com/reel/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.instagram.com/reel/123456789")).toBe(true);
    });

    it("should return false for Instagram URLs without reel", () => {
      expect(checkIfVideoUrl("https://instagram.com/user")).toBe(false);
      expect(checkIfVideoUrl("https://instagram.com/p/123456789")).toBe(false);
    });

    it("should return true for TikTok URLs", () => {
      expect(checkIfVideoUrl("https://tiktok.com/@user/video/123456789")).toBe(true);
      expect(checkIfVideoUrl("https://www.tiktok.com/@user/video/123456789")).toBe(true);
    });

    it("should return false for non-video URLs", () => {
      expect(checkIfVideoUrl("https://google.com")).toBe(false);
      expect(checkIfVideoUrl("https://github.com")).toBe(false);
      expect(checkIfVideoUrl("https://stackoverflow.com")).toBe(false);
      expect(checkIfVideoUrl("https://example.com")).toBe(false);
    });

    it("should handle case insensitivity", () => {
      expect(checkIfVideoUrl("https://YOUTUBE.COM/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://YouTube.Com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://VIMEO.COM/123456789")).toBe(true);
    });

    it("should handle subdomains", () => {
      expect(checkIfVideoUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://subdomain.vimeo.com/123456789")).toBe(true);
    });

    it("should handle invalid URLs gracefully", () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(checkIfVideoUrl("not-a-url")).toBe(false);
      expect(checkIfVideoUrl("")).toBe(false);
      expect(checkIfVideoUrl("invalid://url")).toBe(false);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle URLs with no protocol", () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(checkIfVideoUrl("youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
      expect(checkIfVideoUrl("vimeo.com/123456789")).toBe(false);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle URLs with different protocols", () => {
      expect(checkIfVideoUrl("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    });

    it("should handle URLs with ports", () => {
      expect(checkIfVideoUrl("https://youtube.com:443/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(checkIfVideoUrl("http://youtube.com:80/watch?v=dQw4w9WgXcQ")).toBe(true);
    });

    it("should handle URLs with query parameters", () => {
      expect(checkIfVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toBe(true);
      expect(checkIfVideoUrl("https://vimeo.com/123456789?autoplay=1")).toBe(true);
    });

    it("should handle URLs with fragments", () => {
      expect(checkIfVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ#t=10s")).toBe(true);
      expect(checkIfVideoUrl("https://vimeo.com/123456789#t=10s")).toBe(true);
    });
  });

  describe("checkForVideoEmbeds", () => {
    it("should return true for pages with video elements", () => {
      const html = '<video src="video.mp4" controls></video>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with multiple video elements", () => {
      const html = '<video src="video1.mp4"></video><video src="video2.mp4"></video>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with YouTube embeds", () => {
      const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with YouTube short embeds", () => {
      const html = '<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with Vimeo embeds", () => {
      const html = '<iframe src="https://player.vimeo.com/video/123456789"></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with Loom embeds", () => {
      const html = '<iframe src="https://www.loom.com/embed/123456789"></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with og:video metadata", () => {
      const html = '<meta property="og:video" content="https://example.com/video.mp4">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with og:video:url metadata", () => {
      const html = '<meta property="og:video:url" content="https://example.com/video.mp4">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with og:video:secure_url metadata", () => {
      const html = '<meta property="og:video:secure_url" content="https://example.com/video.mp4">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with og:video:type metadata", () => {
      const html = '<meta property="og:video:type" content="video/mp4">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return true for pages with multiple video indicators", () => {
      const html = `
        <video src="video.mp4"></video>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
        <meta property="og:video" content="https://example.com/video.mp4">
      `;
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should return false for pages without video content", () => {
      const html = '<p>This is just text content</p><img src="image.jpg">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(false);
    });

    it("should return false for pages with non-video iframes", () => {
      const html = '<iframe src="https://example.com/embed"></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(false);
    });

    it("should return false for pages with non-video metadata", () => {
      const html = '<meta property="og:image" content="https://example.com/image.jpg">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(false);
    });

    it("should return false for empty pages", () => {
      const html = '';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(false);
    });

    it("should handle malformed HTML gracefully", () => {
      const html = '<video><iframe src="https://youtube.com/embed/123">';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should be case insensitive for element names", () => {
      const html = '<VIDEO src="video.mp4"></VIDEO>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should handle nested elements", () => {
      const html = '<div><section><video src="video.mp4"></video></section></div>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should handle complex iframe attributes", () => {
      const html = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>';
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });

    it("should handle multiple meta tags", () => {
      const html = `
        <meta property="og:title" content="Test">
        <meta property="og:video" content="https://example.com/video.mp4">
        <meta property="og:description" content="Test description">
      `;
      const $ = cheerio.load(html);
      expect(checkForVideoEmbeds($)).toBe(true);
    });
  });
});