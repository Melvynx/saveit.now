import {
  cleanUrl,
  getTrackingParameters,
  hasTrackingParameters,
} from "../url-cleaner";

describe("cleanUrl", () => {
  it("should remove UTM parameters", () => {
    const url =
      "https://example.com/?utm_source=twitter&utm_medium=social&utm_campaign=launch";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove Facebook tracking parameters", () => {
    const url = "https://example.com/?fbclid=IwAR0xyz123";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove Google Ads parameters", () => {
    const url = "https://example.com/?gclid=EAIaIQobChMI";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove Instagram parameters", () => {
    const url = "https://example.com/?igshid=MzRlODBiNWFlZA==";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove email marketing parameters", () => {
    const url = "https://example.com/?mc_cid=abc123&mc_eid=def456";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove ConvertKit parameters", () => {
    const url =
      "https://www.reactuniverseconf.com/?ck_subscriber_id=1866548480";
    const expected = "https://www.reactuniverseconf.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should remove Twitter/X parameters", () => {
    const url = "https://example.com/?ref_src=twsrc%5Etfw";
    const expected = "https://example.com/";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should preserve functional parameters", () => {
    const url = "https://example.com/search?q=react&page=2&utm_source=twitter";
    const expected = "https://example.com/search?q=react&page=2";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should handle URLs without query parameters", () => {
    const url = "https://example.com/path";
    expect(cleanUrl(url)).toBe(url);
  });

  it("should handle URLs with fragments", () => {
    const url = "https://example.com/path?utm_source=twitter#section";
    const expected = "https://example.com/path#section";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should handle complex URLs with multiple tracking parameters", () => {
    const url =
      "https://example.com/path?utm_source=twitter&utm_medium=social&utm_campaign=launch&fbclid=abc&gclid=def&q=search&page=1";
    const expected = "https://example.com/path?q=search&page=1";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should throw error for invalid URLs", () => {
    expect(() => cleanUrl("not-a-url")).toThrow("Invalid URL: not-a-url");
  });

  it("should handle URLs with ports", () => {
    const url = "https://localhost:3000/api?utm_source=test&token=abc123";
    const expected = "https://localhost:3000/api?token=abc123";
    expect(cleanUrl(url)).toBe(expected);
  });

  it("should handle all example URLs from the issue", () => {
    const testCases = [
      {
        input: "https://www.reactuniverseconf.com/?ck_subscriber_id=1866548480",
        expected: "https://www.reactuniverseconf.com/",
      },
      {
        input:
          "https://example.com/?utm_source=twitter&utm_medium=social&utm_campaign=launch",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?mc_cid=abc123&mc_eid=def456",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?gclid=EAIaIQobChMI",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?fbclid=IwAR0xyz123",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?igshid=MzRlODBiNWFlZA==",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?ref_src=twsrc%5Etfw",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?utm_term=learn+react&utm_content=buttonA",
        expected: "https://example.com/",
      },
      {
        input: "https://example.com/?tracking_id=xyz789&campaign_id=launch2025",
        expected: "https://example.com/",
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(cleanUrl(input)).toBe(expected);
    });
  });
});

describe("hasTrackingParameters", () => {
  it("should return true for URLs with tracking parameters", () => {
    expect(
      hasTrackingParameters("https://example.com/?utm_source=twitter"),
    ).toBe(true);
    expect(hasTrackingParameters("https://example.com/?fbclid=abc123")).toBe(
      true,
    );
    expect(hasTrackingParameters("https://example.com/?gclid=def456")).toBe(
      true,
    );
  });

  it("should return false for URLs without tracking parameters", () => {
    expect(hasTrackingParameters("https://example.com/")).toBe(false);
    expect(hasTrackingParameters("https://example.com/?q=search&page=1")).toBe(
      false,
    );
  });

  it("should return false for invalid URLs", () => {
    expect(hasTrackingParameters("not-a-url")).toBe(false);
  });
});

describe("getTrackingParameters", () => {
  it("should return array of tracking parameters found", () => {
    const url =
      "https://example.com/?utm_source=twitter&utm_campaign=test&q=search";
    const result = getTrackingParameters(url);
    expect(result).toContain("utm_source");
    expect(result).toContain("utm_campaign");
    expect(result).not.toContain("q");
  });

  it("should return empty array for URLs without tracking parameters", () => {
    expect(getTrackingParameters("https://example.com/?q=search")).toEqual([]);
  });

  it("should return empty array for invalid URLs", () => {
    expect(getTrackingParameters("not-a-url")).toEqual([]);
  });
});
