/* eslint-disable @next/next/no-img-element */
import { Typography } from "@workspace/ui/components/typography";
import {
  BookmarkCardPDF,
  BookmarkCardPage,
  BookmarkCardTweet,
  BookmarkCardYouTube,
} from "app/app/bookmark-card";
import { ArrowRight, File, Globe } from "lucide-react";
import { MaxWidthContainer } from "../page/page";

export const KeyFeatures = () => {
  return (
    <MaxWidthContainer className="py-16 flex flex-col gap-8 lg:py-32">
      <div className="text-center">
        <Typography variant="h2">We save everything for you.</Typography>
        <Typography variant="lead">
          PDF, YouTube video, X post, web page or simple blog post -- we got you
        </Typography>
      </div>

      <div className="flex flex-col gap-8">
        {/* YouTube Video */}
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-1">
            <img
              src="https://svgl.app/library/youtube.svg"
              className="size-6"
              alt="YouTube"
            />
            <Typography variant="h3">YouTube Video</Typography>
          </div>
          <div className="hidden lg:flex flex-1"></div>
          <ArrowRight className="text-muted-foreground hidden lg:block" />
          <div className="hidden lg:flex flex-1"></div>
          <div className="w-full max-w-96">
            <BookmarkCardYouTube
              bookmark={{
                id: "01K08HSNTBXYNR446W3J6KG77F",
                userId: "demo",
                url: "https://www.youtube.com/watch?v=2USUfv7klr8",
                title:
                  "Grok 4 pushes humanity closer to AGI… but there's a problem",
                summary: "AI video about Grok 4 and AGI development",
                type: "YOUTUBE",
                status: "READY",
                ogImageUrl:
                  "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K08HSNTBXYNR446W3J6KG77F/og-image.jpg",
                faviconUrl: "http://localhost:3000/favicon/youtube.svg",
                metadata: {
                  youtubeId: "2USUfv7klr8",
                  transcriptAvailable: false,
                },
                starred: false,
                read: false,
                note: null,
                preview: null,
                vectorSummary: null,
                imageDescription: null,
                ogDescription: null,
                inngestRunId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }}
            />
          </div>
        </div>

        {/* PDF Document */}
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-1">
            <File className="size-6 text-red-500" />
            <Typography variant="h3">PDF Document</Typography>
          </div>
          <div className="hidden lg:flex flex-1"></div>
          <ArrowRight className="text-muted-foreground hidden lg:block" />
          <div className="hidden lg:flex flex-1"></div>
          <div className="w-full max-w-96">
            <BookmarkCardPDF
              bookmark={{
                id: "01K0E5GNP52718KP25VHR6TRQX",
                url: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf",
                title: "Building Agents: A Practical Guide",
                summary:
                  "A guide for product and engineering teams on how to build agents using large language models.",
                type: "PDF",
                status: "READY",
                ogImageUrl:
                  "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K0E5GNP52718KP25VHR6TRQX/pdf-screenshot-01K0E5GNP52718KP25VHR6TRQX-1752822251678.jpg.jpg",
                faviconUrl: null,
                metadata: {
                  pdfUrl:
                    "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K0E5GNP52718KP25VHR6TRQX/pdf-01K0E5GNP52718KP25VHR6TRQX-1752822210683.pdf",
                  screenshotUrl:
                    "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K0E5GNP52718KP25VHR6TRQX/pdf-screenshot-01K0E5GNP52718KP25VHR6TRQX-1752822251678.jpg.jpg",
                },
                starred: false,
                read: false,
              }}
            />
          </div>
        </div>

        {/* Web Page */}
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-1">
            <Globe className="size-6 text-blue-500" />
            <Typography variant="h3">Web Page</Typography>
          </div>
          <div className="hidden lg:flex flex-1"></div>
          <ArrowRight className="text-muted-foreground hidden lg:block" />
          <div className="hidden lg:flex flex-1"></div>
          <div className="w-full max-w-96">
            <BookmarkCardPage
              bookmark={{
                id: "01K08E535PZW5MXXZJTV16SS2F",
                userId: "demo",
                url: "https://saveit.now/",
                title: "SaveIt.now",
                summary: "It's a landing page for SaveIt.now, a tool designed to help users save, organize, and quickly find their bookmarks using AI-powered search and summaries.",
                type: "PAGE",
                status: "READY",
                ogImageUrl: null,
                faviconUrl: "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K08E535PZW5MXXZJTV16SS2F/favicon.ico",
                metadata: null,
                starred: false,
                read: false,
                note: null,
                preview: "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K08E535PZW5MXXZJTV16SS2F/screenshot.jpg",
                vectorSummary: null,
                imageDescription: null,
                ogDescription: null,
                inngestRunId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }}
            />
          </div>
        </div>

        {/* Tweet */}
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-1">
            <img
              src="https://svgl.app/library/x_dark.svg"
              className="size-6"
              alt="X"
            />
            <Typography variant="h3">X Post</Typography>
          </div>
          <div className="hidden lg:flex flex-1"></div>
          <ArrowRight className="text-muted-foreground hidden lg:block" />
          <div className="hidden lg:flex flex-1"></div>
          <div className="w-full max-w-96">
            <BookmarkCardTweet
              bookmark={{
                id: "01K0EMD8T8E8NS5KV90862H9DV",
                userId: "demo",
                url: "https://x.com/sama/status/1930040146034078061",
                title: "Sam Altman",
                summary:
                  "A tweet from Sam Altman, talking about the rise of AI. It express excitement about the current developments in the field.",
                type: "TWEET",
                status: "READY",
                ogImageUrl: null,
                faviconUrl:
                  "https://saveit.mlvcdn.com/users/WU21ivFMBWCXetgE1HHPJ5if7UbsoBEh/bookmarks/01K0EMD8T8E8NS5KV90862H9DV/og-image.jpg",
                metadata: {
                  tweetId: "1930040146034078061",
                  text: "hot ai summer lfg",
                  user: {
                    name: "Sam Altman",
                    screen_name: "sama",
                  },
                },
                starred: false,
                read: false,
                note: null,
                preview: null,
                vectorSummary: null,
                imageDescription: null,
                ogDescription: null,
                inngestRunId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }}
            />
          </div>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
