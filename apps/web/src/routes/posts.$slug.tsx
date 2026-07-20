import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { marked } from "marked";

import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { LandingHeader } from "@/features/marketing/landing/header";
import { Footer } from "@/features/page/footer";
import { getPostBySlug } from "@/lib/mdx/posts-manager";

async function getPostData(data: { slug: string }) {
  const post = await getPostBySlug(data.slug);
  return { post, html: post ? marked.parse(post.content) : "" };
}

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ params }) => getPostData(params),
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post, html } = Route.useLoaderData();

  if (!post) {
    return (
      <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
        <LandingStyle />
        <LandingHeader />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-28">
          <Typography variant="h1">Post Not Found</Typography>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-28">
        <div className="flex flex-col gap-8">
          <div>
            <Button
              variant="ghost"
              asChild
              className="gap-2 text-[#a89099] hover:text-[#f7ede8]"
            >
              <a href="/posts">
                <ArrowLeft className="size-4" />
                Back to Blog
              </a>
            </Button>
          </div>

          <article className="max-w-4xl mx-auto w-full">
            <header className="space-y-6 pb-8 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{post.frontmatter.category}</Badge>
                {post.frontmatter.featured && (
                  <Badge className="border-[#ff8f70]/20 bg-[#ff8f70]/10 text-[#ff8f70]">
                    Featured
                  </Badge>
                )}
              </div>

              <h1 className="landing-display text-balance text-4xl tracking-tight text-[#f7ede8] md:text-5xl">
                {post.frontmatter.title}
              </h1>

              <Typography variant="lead" className="text-[#a89099]">
                {post.frontmatter.description}
              </Typography>

              <div className="flex items-center gap-6 text-sm text-[#a89099]">
                <div className="flex items-center gap-2">
                  <User className="size-4" />
                  {post.frontmatter.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  {post.readingTime.text}
                </div>
              </div>

              {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {post.frontmatter.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-white/[0.08] text-xs text-[#e8cfc4]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            <div
              className="prose prose-lg dark:prose-invert max-w-none py-8"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
