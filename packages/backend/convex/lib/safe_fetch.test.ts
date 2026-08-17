import { beforeEach, describe, expect, it, vi } from "vitest";

type LookupAddress = { address: string; family: number };
type LookupCallback = (
  error: Error | null,
  address?: string | LookupAddress[],
  family?: number,
) => void;

const { dnsLookupMock, undiciFetchMock, FakeAgent } = vi.hoisted(() => {
  class HoistedFakeAgent {
    constructor(
      readonly options: {
        connect?: {
          lookup?: (
            hostname: string,
            options: object,
            callback: LookupCallback,
          ) => void;
        };
      },
    ) {}

    close = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn().mockResolvedValue(undefined);
  }

  return {
    dnsLookupMock: vi.fn(),
    undiciFetchMock: vi.fn(),
    FakeAgent: HoistedFakeAgent,
  };
});

vi.mock("node:dns/promises", () => ({
  lookup: dnsLookupMock,
}));

vi.mock("undici", () => ({
  Agent: FakeAgent,
  fetch: undiciFetchMock,
}));

import { assertSafeRemoteUrl, safeFetch } from "./safe_fetch";

type FetchOptions = RequestInit & {
  dispatcher?: InstanceType<typeof FakeAgent>;
};

async function resolveConnectionAddress(
  input: string | URL | Request,
  init?: FetchOptions,
): Promise<Response> {
  const hostname = new URL(String(input)).hostname;
  const pinnedLookup = init?.dispatcher?.options.connect?.lookup;

  if (pinnedLookup) {
    const result = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        pinnedLookup(hostname, {}, (error, address, family) => {
          if (error) reject(error);
          else if (typeof address === "string") {
            resolve({ address, family: family! });
          } else {
            reject(
              new TypeError("Legacy lookup did not return a scalar address"),
            );
          }
        });
      },
    );
    connectedAddresses.push(result.address);
  } else {
    const result = await dnsLookupMock(hostname, {
      all: true,
      verbatim: true,
    });
    connectedAddresses.push(result[0].address);
  }

  return fetchResponses.shift() ?? new Response("ok", { status: 200 });
}

const connectedAddresses: string[] = [];
const fetchResponses: Response[] = [];

describe("safeFetch DNS rebinding protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAddresses.length = 0;
    fetchResponses.length = 0;
    dnsLookupMock
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "169.254.169.254", family: 4 }]);
    undiciFetchMock.mockImplementation(resolveConnectionAddress);
    vi.spyOn(globalThis, "fetch").mockImplementation(resolveConnectionAddress);
  });

  it("pins the connection to the public address validated before a DNS rebind", async () => {
    const response = await safeFetch("https://example.com/image.png");

    expect(response.status).toBe(200);
    expect(connectedAddresses).toEqual(["93.184.216.34"]);
    expect(dnsLookupMock).toHaveBeenCalledTimes(1);
  });

  it("returns address records when Undici requests lookup with all=true", async () => {
    const validatedAddresses = [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ];
    dnsLookupMock.mockReset().mockResolvedValue(validatedAddresses);
    undiciFetchMock.mockImplementation(async (input, init?: FetchOptions) => {
      const hostname = new URL(String(input)).hostname;
      const pinnedLookup = init?.dispatcher?.options.connect?.lookup;
      if (!pinnedLookup) throw new Error("Expected a pinned DNS lookup");

      const records = await new Promise<LookupAddress[]>((resolve, reject) => {
        pinnedLookup(hostname, { all: true }, (error, address) => {
          if (error) reject(error);
          else if (Array.isArray(address)) resolve(address);
          else {
            reject(
              Object.assign(
                new TypeError(
                  "Invalid IP address: lookup all=true requires records",
                ),
                { code: "ERR_INVALID_IP_ADDRESS" },
              ),
            );
          }
        });
      });

      expect(records).toEqual(validatedAddresses);
      return new Response("ok", { status: 200 });
    });

    await expect(
      safeFetch("https://example.com/image.png"),
    ).resolves.toHaveProperty("status", 200);
  });

  it("validates and pins every redirect hop independently", async () => {
    dnsLookupMock.mockReset();
    const resolutions = new Map<string, number>();
    dnsLookupMock.mockImplementation(async (hostname: string) => {
      const count = resolutions.get(hostname) ?? 0;
      resolutions.set(hostname, count + 1);
      if (hostname === "example.com") {
        return [
          {
            address: count === 0 ? "93.184.216.34" : "169.254.169.254",
            family: 4,
          },
        ];
      }
      return [
        {
          address: count === 0 ? "142.250.72.14" : "127.0.0.1",
          family: 4,
        },
      ];
    });
    fetchResponses.push(
      new Response(null, {
        status: 302,
        headers: { location: "https://redirect.example/final.png" },
      }),
      new Response("ok", { status: 200 }),
    );

    const response = await safeFetch("https://example.com/image.png");

    expect(response.status).toBe(200);
    expect(connectedAddresses).toEqual(["93.184.216.34", "142.250.72.14"]);
    expect(dnsLookupMock).toHaveBeenCalledTimes(2);
  });

  it.each(["127.0.0.1", "169.254.169.254"])(
    "rejects a public redirect to a hostname resolving to %s before connecting",
    async (privateAddress) => {
      dnsLookupMock.mockReset().mockImplementation(async (hostname: string) => {
        if (hostname === "example.com") {
          return [{ address: "93.184.216.34", family: 4 }];
        }
        if (hostname === "private-target.example") {
          return [{ address: privateAddress, family: 4 }];
        }
        throw new Error(`Unexpected hostname: ${hostname}`);
      });
      fetchResponses.push(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://private-target.example/metadata",
          },
        }),
      );

      await expect(safeFetch("https://example.com/image.png")).rejects.toThrow(
        "This URL resolves to a private address",
      );

      expect(connectedAddresses).toEqual(["93.184.216.34"]);
      expect(undiciFetchMock).toHaveBeenCalledOnce();
      expect(dnsLookupMock).toHaveBeenCalledTimes(2);
    },
  );

  const nonGlobalIpv4Addresses = [
    "0.0.0.1", // unspecified / this network
    "255.255.255.255", // limited broadcast
    "224.0.0.1", // multicast
    "169.254.1.1", // link-local
    "127.0.0.1", // loopback
    "100.64.0.1", // carrier-grade NAT
    "10.0.0.1", // RFC1918
    "172.16.0.1", // RFC1918
    "192.168.0.1", // RFC1918
    "192.0.0.1", // IETF protocol assignments
    "192.0.2.1", // TEST-NET-1
    "192.88.99.1", // deprecated 6to4 relay anycast
    "198.18.0.1", // benchmarking
    "198.51.100.1", // TEST-NET-2
    "203.0.113.1", // TEST-NET-3
    "240.0.0.1", // reserved
    "192.175.48.1", // AS112 direct delegation
    "192.31.196.1", // AS112-v4
    "192.52.193.1", // Automatic Multicast Tunneling
  ];

  it.each(nonGlobalIpv4Addresses)(
    "rejects the non-global IPv4 literal %s",
    async (address) => {
      await expect(
        assertSafeRemoteUrl(`https://${address}/metadata`),
      ).rejects.toThrow();

      expect(dnsLookupMock).not.toHaveBeenCalled();
    },
  );

  it.each(nonGlobalIpv4Addresses)(
    "rejects a hostname resolving to the non-global IPv4 address %s",
    async (address) => {
      dnsLookupMock.mockReset().mockResolvedValue([{ address, family: 4 }]);

      await expect(
        assertSafeRemoteUrl("https://non-global-ipv4.example/metadata"),
      ).rejects.toThrow("This URL resolves to a private address");
    },
  );

  it.each(["8.8.8.8", "93.184.216.34"])(
    "allows the globally routed IPv4 literal %s",
    async (address) => {
      await expect(
        assertSafeRemoteUrl(`https://${address}/image.png`),
      ).resolves.toBe(`https://${address}/image.png`);
    },
  );

  it.each(["8.8.8.8", "93.184.216.34"])(
    "allows a hostname resolving to the globally routed IPv4 address %s",
    async (address) => {
      dnsLookupMock.mockReset().mockResolvedValue([{ address, family: 4 }]);

      await expect(
        assertSafeRemoteUrl("https://public-ipv4.example/image.png"),
      ).resolves.toBe("https://public-ipv4.example/image.png");
    },
  );

  const nonGlobalIpv6Addresses = [
    "64:ff9b::c000:201", // NAT64 well-known prefix
    "64:ff9b:1::c000:201", // NAT64 local-use prefix
    "100::1", // discard-only
    "2001::1", // Teredo
    "2001:2::1", // benchmarking
    "2001:3::1", // AMT
    "2001:4:112::1", // AS112-v6
    "2001:10::1", // deprecated ORCHID
    "2001:20::1", // ORCHIDv2
    "2001:30::1", // Drone Remote ID protocol entity tags
    "2001:db8::1", // documentation
    "2002:c000:201::", // 6to4
    "3fff::1", // documentation
    "5f00::1", // segment routing
    "fec0::1", // deprecated site-local
    "ff02::1", // multicast
    "::ffff:7f00:1", // IPv4-mapped loopback
    "::ffff:0:a00:1", // IPv4-translated private address
  ];

  it.each(nonGlobalIpv6Addresses)(
    "rejects the non-global IPv6 literal %s",
    async (address) => {
      await expect(
        assertSafeRemoteUrl(`https://[${address}]/metadata`),
      ).rejects.toThrow();

      expect(dnsLookupMock).not.toHaveBeenCalled();
    },
  );

  it.each(nonGlobalIpv6Addresses)(
    "rejects a hostname resolving to the non-global IPv6 address %s",
    async (address) => {
      dnsLookupMock.mockReset().mockResolvedValue([{ address, family: 6 }]);

      await expect(
        assertSafeRemoteUrl("https://non-global-ipv6.example/metadata"),
      ).rejects.toThrow("This URL resolves to a private address");
    },
  );

  it("allows a globally routed IPv6 literal", async () => {
    await expect(
      assertSafeRemoteUrl("https://[2606:4700:4700::1111]/image.png"),
    ).resolves.toBe("https://[2606:4700:4700::1111]/image.png");
  });

  it("allows a hostname resolving to a globally routed IPv6 address", async () => {
    dnsLookupMock
      .mockReset()
      .mockResolvedValue([{ address: "2606:4700:4700::1111", family: 6 }]);

    await expect(
      assertSafeRemoteUrl("https://public-ipv6.example/image.png"),
    ).resolves.toBe("https://public-ipv6.example/image.png");
  });

  it("stops waiting for DNS validation when its AbortSignal fires", async () => {
    dnsLookupMock.mockReset();
    dnsLookupMock.mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const validation = assertSafeRemoteUrl(
      "https://slow-dns.example/image.png",
      controller.signal,
    );

    controller.abort(new Error("fetch timed out"));

    await expect(
      Promise.race([
        validation,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DNS abort was ignored")), 50),
        ),
      ]),
    ).rejects.toThrow("fetch timed out");
  });
});
