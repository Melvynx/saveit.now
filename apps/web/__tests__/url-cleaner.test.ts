import { describe, it, expect, vi } from "vitest";
import { cleanUrl } from "../src/lib/utils/url-cleaner";

describe("cleanUrl", () => {
  it("should clean UTM parameters", () => {
    const url = "https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Facebook tracking parameters", () => {
    const url = "https://example.com/page?fbclid=123&fb_action_ids=456&fb_ref=share";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Google tracking parameters", () => {
    const url = "https://example.com/page?gclid=123&gclsrc=aw.ds&dclid=456";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Instagram tracking parameters", () => {
    const url = "https://example.com/page?igshid=123&igsh=456";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Twitter tracking parameters", () => {
    const url = "https://example.com/page?ref_src=twsrc&ref_url=twitter.com&twclid=123";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean LinkedIn tracking parameters", () => {
    const url = "https://example.com/page?li_source=linkedin&li_medium=share&trk=public_profile";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean email marketing parameters", () => {
    const url = "https://example.com/page?mc_cid=123&mc_eid=456&ck_subscriber_id=789";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Microsoft tracking parameters", () => {
    const url = "https://example.com/page?msclkid=123&ms_c=456";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean TikTok tracking parameters", () => {
    const url = "https://example.com/page?tt_medium=video&tt_content=123&ttclid=456";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean Pinterest tracking parameters", () => {
    const url = "https://example.com/page?epik=123";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean YouTube tracking parameters", () => {
    const url = "https://example.com/page?feature=youtu.be&kw=test";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean generic tracking parameters", () => {
    const url = "https://example.com/page?ref=homepage&source=newsletter&campaign=summer";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean affiliate tracking parameters", () => {
    const url = "https://example.com/page?affiliate_id=123&partner_id=456&click_id=789";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should clean short tracking parameters", () => {
    const url = "https://example.com/page?cid=123&sid=456&tid=789&pid=abc&aid=def";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should preserve legitimate query parameters", () => {
    const url = "https://example.com/search?q=test&page=2&sort=date&utm_source=google";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/search?q=test&page=2&sort=date");
  });

  it("should handle URLs with no query parameters", () => {
    const url = "https://example.com/page";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should handle URLs with only tracking parameters", () => {
    const url = "https://example.com/page?utm_source=google&fbclid=123";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page");
  });

  it("should handle URLs with fragments", () => {
    const url = "https://example.com/page?utm_source=google#section";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page#section");
  });

  it("should handle URLs with ports", () => {
    const url = "https://example.com:8080/page?utm_source=google";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com:8080/page");
  });

  it("should handle URLs with userinfo", () => {
    const url = "https://user:pass@example.com/page?utm_source=google";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://user:pass@example.com/page");
  });

  it("should handle complex URLs with mixed parameters", () => {
    const url = "https://example.com/page?q=search&utm_source=google&page=1&fbclid=123&sort=date&gclid=456";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page?q=search&page=1&sort=date");
  });

  it("should handle URLs with repeated parameters", () => {
    const url = "https://example.com/page?utm_source=google&utm_source=facebook&q=test";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page?q=test");
  });

  it("should handle URLs with encoded parameters", () => {
    const url = "https://example.com/page?utm_source=google&q=hello%20world";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page?q=hello+world");
  });

  it("should return original URL on invalid URL", () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const invalidUrl = "not-a-url";
    const cleaned = cleanUrl(invalidUrl);
    
    expect(cleaned).toBe(invalidUrl);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to clean URL:', invalidUrl, expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it("should handle empty string", () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const emptyUrl = "";
    const cleaned = cleanUrl(emptyUrl);
    
    expect(cleaned).toBe(emptyUrl);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it("should handle relative URLs", () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const relativeUrl = "/page?utm_source=google";
    const cleaned = cleanUrl(relativeUrl);
    
    expect(cleaned).toBe(relativeUrl);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it("should handle data URLs", () => {
    const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
    const cleaned = cleanUrl(dataUrl);
    expect(cleaned).toBe(dataUrl);
  });

  it("should handle file URLs", () => {
    const fileUrl = "file:///path/to/file.html?utm_source=google";
    const cleaned = cleanUrl(fileUrl);
    expect(cleaned).toBe("file:///path/to/file.html");
  });

  it("should handle URLs with multiple question marks (edge case)", () => {
    const url = "https://example.com/page?utm_source=google&q=what?why";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("https://example.com/page?q=what%3Fwhy");
  });

  it("should be case sensitive for parameter names", () => {
    const url = "https://example.com/page?UTM_SOURCE=google&utm_source=facebook";
    const cleaned = cleanUrl(url);
    // Only lowercase utm_source should be removed
    expect(cleaned).toBe("https://example.com/page?UTM_SOURCE=google");
  });
});