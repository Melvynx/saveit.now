import { prisma } from "@workspace/database";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookmarkId: string }> },
) {
  const { bookmarkId } = await params;

  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
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

  if (!bookmark) {
    return new Response("Not found", { status: 404 });
  }

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return bookmark.url;
    }
  })();

  const title = bookmark.title || domain;
  const description = bookmark.summary || bookmark.ogDescription || "";
  const truncatedDescription =
    description.length > 150 ? description.slice(0, 147) + "..." : description;
  const tags = bookmark.tags.map((t) => t.tag.name).slice(0, 4);
  const typeLabel = bookmark.type || "PAGE";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#a78bfa",
                letterSpacing: "-0.5px",
              }}
            >
              SaveIt.now
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#6b7280",
                backgroundColor: "#1f2937",
                padding: "6px 16px",
                borderRadius: "9999px",
              }}
            >
              {typeLabel}
            </div>
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#f9fafb",
              lineHeight: 1.2,
              letterSpacing: "-1px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxHeight: "120px",
            }}
          >
            {title}
          </div>
          {truncatedDescription && (
            <div
              style={{
                fontSize: "20px",
                color: "#9ca3af",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxHeight: "60px",
              }}
            >
              {truncatedDescription}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  fontSize: "14px",
                  color: "#d1d5db",
                  backgroundColor: "#1f2937",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "1px solid #374151",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>{domain}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
