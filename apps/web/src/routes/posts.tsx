import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { LandingHeader } from "@/features/marketing/landing/header";
import { LandingReveal } from "@/features/marketing/landing/reveal";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
import {
  getAllPosts,
  getFeaturedPosts,
  type Post,
} from "@/lib/mdx/posts-manager";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";

async function getPostsData() {
  const [allPosts, featuredPosts] = await Promise.all([
    getAllPosts(),
    getFeaturedPosts(),
  ]);

  return {
    allPosts,
    featuredPost: featuredPosts[0] ?? null,
    regularPosts: allPosts.filter((post) => !post.frontmatter.featured),
  };
}

export const Route = createFileRoute("/posts")({
  loader: () => getPostsData(),
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: BlogPage,
});

function BlogPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { allPosts, featuredPost, regularPosts } = Route.useLoaderData();

  if (pathname !== "/posts") {
    return <Outlet />;
  }

  return (
    <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-28">
        <div className="flex flex-col gap-16">
          <LandingReveal className="text-center">
            <h1 className="landing-display max-w-3xl mx-auto text-balance text-5xl tracking-tight text-[#f7ede8] sm:text-6xl">
              Insights, tips, and updates from the{" "}
              <em className="landing-gradient-text">SaveIt</em> team
            </h1>
          </LandingReveal>

          {featuredPost && <PostCard post={featuredPost} large />}

          <div className="space-y-8">
            <h2 className="landing-display text-center text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">
              Recent Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>

          {allPosts.length === 0 && (
            <div className="text-center space-y-4 py-8">
              <Typography variant="h3" className="text-[#a89099]">
                Articles coming soon
              </Typography>
              <Typography variant="muted" className="max-w-md mx-auto">
                We are working on helpful content about productivity, bookmark
                management, and digital organization.
              </Typography>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function PostCard(props: { post: Post; large?: boolean }) {
  const { post, large } = props;

  return (
    <a href={`/posts/${post.slug}`} className="block group">
      <Card
        className={cn(
          "overflow-hidden rounded-2xl border-white/[0.08] bg-white/[0.03] shadow-none p-2 transition-colors group-hover:bg-white/[0.06]",
          large && "mb-8",
        )}
      >
        {post.frontmatter.banner && (
          <img
            src={post.frontmatter.banner}
            alt={post.frontmatter.title}
            className={cn(
              "w-full object-cover rounded-xl",
              large ? "h-64 md:h-96" : "h-40",
            )}
            loading="lazy"
          />
        )}
        <div className={cn("p-4", large ? "py-8" : "py-4")}>
          <Typography
            variant={large ? "h2" : "h3"}
            className="landing-display mb-2 line-clamp-2 text-[#f7ede8]"
          >
            {post.frontmatter.title}
          </Typography>
          <div className="text-sm text-[#a89099]">
            {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </Card>
    </a>
  );
}
