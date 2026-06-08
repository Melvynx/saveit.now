import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@workspace/database/client";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const truncate = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length - 3)}...` : value;

const GET = async ({ params }: { request: Request; params: { bookmarkId: string } }) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: params.bookmarkId },
    select: {
      title: true,
      url: true,
      summary: true,
      ogDescription: true,
      type: true,
      tags: {
        select: { tag: { select: { name: true } } },
        take: 5,
      },
    },
  });

  if (!bookmark) return new Response("Not found", { status: 404 });

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return bookmark.url;
    }
  })();
  const title = escapeXml(truncate(bookmark.title || domain, 70));
  const description = escapeXml(
    truncate(bookmark.summary || bookmark.ogDescription || "", 150),
  );
  const tags = bookmark.tags.map((tag) => tag.tag.name).slice(0, 4);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0a0a0a"/>
    <text x="60" y="88" fill="#a78bfa" font-family="system-ui, sans-serif" font-size="28" font-weight="700">SaveIt.now</text>
    <rect x="980" y="58" width="140" height="36" rx="18" fill="#1f2937"/>
    <text x="1050" y="82" text-anchor="middle" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="16">${escapeXml(bookmark.type || "PAGE")}</text>
    <text x="60" y="195" fill="#f9fafb" font-family="system-ui, sans-serif" font-size="52" font-weight="700">${title}</text>
    <text x="60" y="275" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="24">${description}</text>
    ${tags
      .map(
        (tag, index) =>
          `<rect x="${60 + index * 150}" y="530" width="132" height="38" rx="19" fill="#1f2937" stroke="#374151"/><text x="${126 + index * 150}" y="554" text-anchor="middle" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="16">${escapeXml(truncate(tag, 14))}</text>`,
      )
      .join("")}
    <text x="1140" y="554" text-anchor="end" fill="#6b7280" font-family="system-ui, sans-serif" font-size="18">${escapeXml(domain)}</text>
  </svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};

export const Route = createFileRoute("/api/og/bookmark/$bookmarkId")({
  server: { handlers: { GET } },
});
